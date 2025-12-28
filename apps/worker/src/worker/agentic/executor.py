"""
Tool Executor Node

Executes tool calls from the planner.
Uses LangGraph's prebuilt ToolNode for tool execution.
"""

from typing import Any
import structlog
from langgraph.prebuilt import ToolNode
from worker.agentic.planner.planner_tools import get_all_tools, TOOL_REGISTRY
from worker.agentic.state import AgentState, FileChange

logger = structlog.get_logger()

def create_tool_node() -> ToolNode:
    """
    Create a ToolNode that executes tools.
    
    The ToolNode automatically:
    1. Extracts tool_calls from the last AI message
    2. Executes each tool
    3. Appends ToolMessage results to the state
    
    Returns:
        Configured ToolNode
    """
    
    tools = get_all_tools()
    return ToolNode(tools=tools)


def execute_tools_node(state: AgentState) -> dict[str, Any]:
    """
    LangGraph node that executes tools and captures file changes.
    
    This node wraps the ToolNode execution and also:
    1. Captures file write operations for streaming to client
    2. Updates the streamed_files list for live preview
    
    Args:
        state: Current agent state
    
    Returns:
        State updates with tool results and file changes
    """
    
    logger.info("Executing tools")
    
    # Get the last message which should have tool_calls
    last_message = state["messages"][-1]
    
    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        logger.warning("No tool calls found in last message")
        return {"phase": "planning"}
    
    # Execute tools using ToolNode
    tool_node = create_tool_node()
    
    # ToolNode expects state with messages
    result = tool_node.invoke(state)
    
    # Extract file changes from write_file tool calls
    new_files = []
    for tool_call in last_message.tool_calls:
        if tool_call["name"] == "write_file":
            args = tool_call.get("args", {})
            new_files.append(
                FileChange(
                    path=args.get("path", ""),
                    content=args.get("content", ""),
                    operation="create",
                )
            )
        elif tool_call["name"] == "delete_file":
            args = tool_call.get("args", {})
            new_files.append(
                FileChange(
                    path=args.get("path", ""),
                    content="",
                    operation="delete",
                )
            )
    
    # Merge with existing streamed files
    all_files = list(state.get("streamed_files", [])) + new_files
    
    logger.info(
        "Tools executed",
        tool_count=len(last_message.tool_calls),
        file_changes=len(new_files),
    )
    
    return {
        "messages": result.get("messages", []),
        "streamed_files": all_files,
        "phase": "planning",  # Loop back to planner
    }

