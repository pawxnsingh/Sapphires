"""
Tool Executor Node

Executes tool calls from the planner with streaming support.
"""

from typing import Any
import structlog
from langgraph.prebuilt import ToolNode
from langchain_core.messages import ToolMessage

from worker.agentic.tools import ALL_TOOLS, TOOL_REGISTRY
from worker.agentic.state import AgentState, FileChange

logger = structlog.get_logger()


def create_tool_node() -> ToolNode:
    """
    Create a ToolNode that executes tools.
    
    The ToolNode automatically:
    1. Extracts tool_calls from the last AI message
    2. Executes each tool
    3. Appends ToolMessage results to the state
    """
    return ToolNode(tools=ALL_TOOLS)


async def execute_tools_node(state: AgentState) -> dict[str, Any]:
    """
    LangGraph node that executes tools and captures file changes.
    
    This node:
    1. Executes tool calls from the planner
    2. Captures file write/delete operations for streaming
    3. Updates state with results
    
    Args:
        state: Current agent state
    
    Returns:
        State updates with tool results and file changes
    """
    logger.info("Executing tools", step=state["step_count"])
    
    # Get the last message which should have tool_calls
    last_message = state["messages"][-1]
    
    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        logger.warning("No tool calls found in last message")
        return {"phase": "responding"}
    
    tool_calls = last_message.tool_calls
    logger.info("Tool calls to execute", count=len(tool_calls))
    
    # Execute tools manually for better control
    tool_messages = []
    new_files = []
    
    for tool_call in tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call.get("args", {})
        tool_id = tool_call["id"]
        
        logger.info("Executing tool", name=tool_name, args_keys=list(tool_args.keys()))
        
        try:
            # Get the tool function
            if tool_name not in TOOL_REGISTRY:
                result = f"Unknown tool: {tool_name}"
            else:
                tool_fn = TOOL_REGISTRY[tool_name]
                result = tool_fn.invoke(tool_args)
            
            # Track file changes for streaming
            if tool_name == "write_file":
                new_files.append(
                    FileChange(
                        path=tool_args.get("path", ""),
                        content=tool_args.get("content", ""),
                        operation="create",
                    )
                )
            elif tool_name == "delete_file":
                new_files.append(
                    FileChange(
                        path=tool_args.get("path", ""),
                        content="",
                        operation="delete",
                    )
                )
            elif tool_name == "rename_file":
                new_files.append(
                    FileChange(
                        path=tool_args.get("to_path", ""),
                        content="",
                        operation="update",
                    )
                )
            elif tool_name == "search_replace":
                new_files.append(
                    FileChange(
                        path=tool_args.get("path", ""),
                        content="",  # Content unknown without reading
                        operation="update",
                    )
                )
            
            logger.info("Tool completed", name=tool_name, result_length=len(str(result)))
            
        except Exception as e:
            logger.error("Tool execution failed", name=tool_name, error=str(e))
            result = f"Error executing {tool_name}: {str(e)}"
        
        tool_messages.append(
            ToolMessage(
                content=str(result),
                tool_call_id=tool_id,
            )
        )
    
    # Merge with existing streamed files
    all_files = list(state.get("streamed_files", [])) + new_files
    
    logger.info(
        "Tools executed",
        tool_count=len(tool_calls),
        file_changes=len(new_files),
        total_files=len(all_files),
    )
    
    # Run build validation if we modified files
    if new_files and tool_messages:
        try:
            from worker.agentic.build_validator import (
                validate_build, 
                format_errors_for_llm,
                ErrorType
            )
            from worker.agentic.package_manager import auto_install_packages
            
            project_path = state.get("project_path", "")
            if project_path:
                build_result = validate_build(project_path)
                
                if not build_result.success and build_result.errors:
                    logger.warning(
                        "Build validation found errors",
                        count=len(build_result.errors)
                    )
                    
                    # Auto-install missing packages (Phase 3 Feature)
                    missing_pkgs = set()
                    for err in build_result.errors:
                        if err.error_type == ErrorType.MISSING_PACKAGE and err.missing_package:
                            missing_pkgs.add(err.missing_package)
                    
                    if missing_pkgs:
                        logger.info("Auto-installing missing packages", packages=list(missing_pkgs))
                        success = auto_install_packages(list(missing_pkgs), project_path)
                        
                        if success:
                            # Re-run validation after install
                            build_result = validate_build(project_path)
                    
                    # Append error feedback if still failing
                    if not build_result.success and build_result.errors:
                        error_msg = format_errors_for_llm(build_result.errors)
                        
                        # Add to the last tool message content
                        if tool_messages:
                            last_msg = tool_messages[-1]
                            # Simple string concat instead of object modification for safety
                            new_content = str(last_msg.content) + "\n\n" + error_msg
                            tool_messages[-1] = ToolMessage(
                                content=new_content,
                                tool_call_id=last_msg.tool_call_id
                            )
        
        except Exception as e:
            logger.error("Build validation failed", error=str(e))
    
    return {
        "messages": tool_messages,
        "streamed_files": new_files,
        "step_count": state["step_count"] + 1,
        "phase": "planning",  # Always go back to planning to see results
    }
