"""
Respond Node

Formats the final response when no more tools are needed.
"""

from typing import Any
import structlog
from langchain.messages import AIMessage
from worker.agentic.state import AgentState

logger = structlog.get_logger()


def respond_node(state: AgentState) -> dict[str, Any]:
    """
    LangGraph node that formats the final response.
    
    This node:
    1. Extracts the final text content from messages
    2. Sets the phase to completed
    3. Prepares the partial_response for streaming
    
    Args:
        state: Current agent state
    
    Returns:
        State updates with final response
    """
    logger.info("Preparing final response")
    
    # Find the last AI message with content
    final_content = ""
    
    for msg in reversed(state["messages"]):
        if isinstance(msg, AIMessage) and msg.content:
            final_content = msg.content
            break
    
    if not final_content:
        final_content = "I've completed the requested changes."
    
    logger.info(
        "Response prepared",
        content_length=len(final_content),
        total_steps=state["step_count"],
        files_changed=len(state.get("streamed_files", [])),
    )
    
    return {
        "partial_response": final_content,
        "phase": "completed",
    }

