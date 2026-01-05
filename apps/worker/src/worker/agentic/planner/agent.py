"""
Unified Planner Agent

A single ReAct agent that plans and executes code changes.
Inspired by Dyad's local-agent mode - one agent with all tools.
"""

from typing import Any, Literal
from langchain.messages import SystemMessage, AIMessage
from langchain_core.messages import BaseMessage
import structlog

from worker.agentic.model import model_azure
from worker.agentic.tools import ALL_TOOLS, set_project_context
from worker.agentic.state import AgentState
from worker.agentic.prompts import build_system_prompt

logger = structlog.get_logger()


# ============================================================
# PLANNER NODE
# ============================================================


async def planner_node(state: AgentState) -> dict[str, Any]:
    """
    LangGraph node that plans and executes code changes.
    
    This is a unified agent that:
    1. Understands the user request
    2. Uses tools to explore and modify code
    3. Returns tool calls or a final response
    
    Args:
        state: Current agent state
        
    Returns:
        State updates with new messages
    """
    logger.info(
        "Planner executing",
        step=state["step_count"],
        max_steps=state["max_steps"],
    )
    
    # Set project context for tools
    set_project_context(state["project_id"], state["project_path"])
    
    # Build system prompt using the comprehensive prompts module
    system_prompt = build_system_prompt(
        project_type=state["project_type"],
        codebase_context=state.get("codebase_context", "") or "",
    )
    
    # Bind tools to model
    llm_with_tools = model_azure.bind_tools(ALL_TOOLS)
    
    # Build messages
    messages: list[BaseMessage] = [
        SystemMessage(content=system_prompt),
        *list(state["messages"]),
    ]
    
    try:
        # Invoke the model
        response: AIMessage = await llm_with_tools.ainvoke(messages)
        
        has_tool_calls = bool(response.tool_calls) if hasattr(response, "tool_calls") else False
        
        logger.info(
            "Planner response",
            has_tool_calls=has_tool_calls,
            tool_count=len(response.tool_calls) if has_tool_calls else 0,
            content_length=len(response.content) if response.content else 0,
        )
        
        # Determine next phase
        if has_tool_calls:
            next_phase = "executing_tools"
        else:
            next_phase = "responding"
        
        return {
            "messages": [response],
            "step_count": state["step_count"] + 1,
            "phase": next_phase,
        }
        
    except Exception as e:
        logger.error("Planner failed", error=str(e))
        return {
            "error": f"Planning failed: {str(e)}",
            "phase": "error",
            "error_recovery_attempts": state.get("error_recovery_attempts", 0) + 1,
        }
