"""
Agent Runner - High-level API for running the agent

This module provides a simple API for running the agentic pipeline
with streaming support.
"""

from typing import Literal, Optional, AsyncIterator, Callable, Awaitable
from dataclasses import dataclass, field
import structlog

from worker.agentic.graph import compile_agent
from worker.agentic.state import create_initial_state, AgentState, FileChange

logger = structlog.get_logger()


# ============================================================
# STREAMING CALLBACKS
# ============================================================


@dataclass
class StreamingCallbacks:
    """
    Callbacks for streaming agent events to clients.
    
    Set any of these to receive events during agent execution.
    """
    on_token: Optional[Callable[[str], Awaitable[None]]] = None
    on_file_change: Optional[Callable[[FileChange], Awaitable[None]]] = None
    on_tool_start: Optional[Callable[[str, dict], Awaitable[None]]] = None
    on_tool_end: Optional[Callable[[str, str], Awaitable[None]]] = None
    on_phase_change: Optional[Callable[[str], Awaitable[None]]] = None
    on_error: Optional[Callable[[str], Awaitable[None]]] = None


# ============================================================
# RESULT TYPES
# ============================================================


@dataclass
class AgentResult:
    """Result of running the agent."""
    success: bool
    response: str
    files_changed: list[FileChange] = field(default_factory=list)
    steps_taken: int = 0
    error: Optional[str] = None


# ============================================================
# RUNNER
# ============================================================


async def run_agent(
    project_id: str,
    project_path: str,
    user_message: str,
    project_type: Literal["NEXTJS", "REACT_NATIVE", "REACT"],
    session_id: str = "default",
    max_steps: int = 50,
    callbacks: Optional[StreamingCallbacks] = None,
) -> AgentResult:
    """
    Run the agentic pipeline.
    
    This function:
    1. Compiles the agent graph
    2. Creates initial state
    3. Streams events (tokens, file changes, etc.)
    4. Returns the final result
    
    Args:
        project_id: Unique identifier for the project
        project_path: Filesystem path to the project root
        user_message: The user's request
        project_type: Type of project (NEXTJS, REACT_NATIVE, REACT)
        session_id: Session ID for checkpointing
        max_steps: Maximum iterations (default: 25)
        callbacks: Optional streaming callbacks
    
    Returns:
        AgentResult with response and file changes
    """
    logger.info(
        "Starting agent run",
        project_id=project_id,
        project_type=project_type,
        message_preview=user_message[:100],
    )
    
    # Compile the agent
    agent = compile_agent()
    
    # Create initial state
    initial_state = create_initial_state(
        project_id=project_id,
        project_path=project_path,
        session_id=session_id,
        user_message=user_message,
        project_type=project_type,
        max_steps=max_steps,
    )
    
    # Config for LangGraph
    config = {"configurable": {"thread_id": session_id}}
    
    # Track final state
    final_state: Optional[AgentState] = None
    last_phase = "starting"
    
    try:
        # Stream events
        async for event in agent.astream_events(initial_state, config, version="v2"):
            event_type = event.get("event", "")
            
            # Token streaming
            if event_type == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    if callbacks and callbacks.on_token:
                        await callbacks.on_token(chunk.content)
            
            # Tool events
            elif event_type == "on_tool_start":
                name = event.get("name", "")
                inputs = event.get("data", {}).get("input", {})
                logger.debug("Tool starting", name=name)
                if callbacks and callbacks.on_tool_start:
                    await callbacks.on_tool_start(name, inputs)
            
            elif event_type == "on_tool_end":
                name = event.get("name", "")
                output = str(event.get("data", {}).get("output", ""))
                logger.debug("Tool completed", name=name)
                if callbacks and callbacks.on_tool_end:
                    await callbacks.on_tool_end(name, output)
            
            # Chain end (captures state updates)
            elif event_type == "on_chain_end":
                output = event.get("data", {}).get("output", {})
                if isinstance(output, dict):
                    # Check for phase changes
                    if "phase" in output and output["phase"] != last_phase:
                        last_phase = output["phase"]
                        if callbacks and callbacks.on_phase_change:
                            await callbacks.on_phase_change(last_phase)
                    
                    # Check for file changes
                    new_files = output.get("streamed_files", [])
                    if new_files and callbacks and callbacks.on_file_change:
                        for fc in new_files:
                            if isinstance(fc, FileChange):
                                await callbacks.on_file_change(fc)
        
        # Get final state by invoking once more (LangGraph pattern)
        # Or use astream to get the final output
        final_output = await agent.ainvoke(initial_state, config)
        
        # Extract results
        response = final_output.get("partial_response", "")
        files_changed = list(final_output.get("streamed_files", []))
        steps = final_output.get("step_count", 0)
        error = final_output.get("error")
        
        logger.info(
            "Agent run completed",
            steps=steps,
            files_changed=len(files_changed),
            has_error=bool(error),
        )
        
        if error:
            if callbacks and callbacks.on_error:
                await callbacks.on_error(error)
            return AgentResult(
                success=False,
                response=response or "An error occurred during execution.",
                files_changed=files_changed,
                steps_taken=steps,
                error=error,
            )
        
        return AgentResult(
            success=True,
            response=response or "Completed successfully.",
            files_changed=files_changed,
            steps_taken=steps,
        )
        
    except Exception as e:
        logger.error("Agent run failed", error=str(e))
        if callbacks and callbacks.on_error:
            await callbacks.on_error(str(e))
        return AgentResult(
            success=False,
            response="",
            error=str(e),
        )


# ============================================================
# STREAMING ITERATOR
# ============================================================


async def stream_agent(
    project_id: str,
    project_path: str,
    user_message: str,
    project_type: Literal["NEXTJS", "REACT_NATIVE", "REACT"],
    session_id: str = "default",
    max_steps: int = 50,
) -> AsyncIterator[dict]:
    """
    Stream agent events as an async iterator.
    
    Yields dictionaries with event data:
    - {"type": "token", "content": "..."}
    - {"type": "tool_start", "name": "...", "args": {...}}
    - {"type": "tool_end", "name": "...", "result": "..."}
    - {"type": "file_change", "path": "...", "operation": "..."}
    - {"type": "phase", "phase": "..."}
    - {"type": "done", "result": AgentResult}
    - {"type": "error", "error": "..."}
    
    This is useful for WebSocket or SSE streaming.
    """
    logger.info("Starting agent stream", project_id=project_id)
    
    agent = compile_agent()
    
    initial_state = create_initial_state(
        project_id=project_id,
        project_path=project_path,
        session_id=session_id,
        user_message=user_message,
        project_type=project_type,
        max_steps=max_steps,
    )
    
    config = {"configurable": {"thread_id": session_id}}
    
    try:
        async for event in agent.astream_events(initial_state, config, version="v2"):
            event_type = event.get("event", "")
            
            if event_type == "on_chat_model_stream":
                chunk = event.get("data", {}).get("chunk")
                if chunk and hasattr(chunk, "content") and chunk.content:
                    yield {"type": "token", "content": chunk.content}
            
            elif event_type == "on_tool_start":
                yield {
                    "type": "tool_start",
                    "name": event.get("name", ""),
                    "args": event.get("data", {}).get("input", {}),
                }
            
            elif event_type == "on_tool_end":
                yield {
                    "type": "tool_end", 
                    "name": event.get("name", ""),
                    "result": str(event.get("data", {}).get("output", "")),
                }
        
        # Final invoke to get complete state
        final_output = await agent.ainvoke(initial_state, config)
        
        yield {
            "type": "done",
            "result": AgentResult(
                success=not final_output.get("error"),
                response=final_output.get("partial_response", ""),
                files_changed=list(final_output.get("streamed_files", [])),
                steps_taken=final_output.get("step_count", 0),
                error=final_output.get("error"),
            ),
        }
        
    except Exception as e:
        logger.error("Agent stream failed", error=str(e))
        yield {"type": "error", "error": str(e)}
