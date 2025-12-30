"""
Coder Agent

The coder agent receives tasks from the planner and executes code operations
using filesystem tools (read_file, write_file, etc.)
"""

from typing import Any
from langchain.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.messages import ToolMessage
import structlog

from worker.agentic.model import model_azure
from worker.agentic.coder.coder_tools import FILESYSTEM_TOOLS
from worker.agentic.state import AgentState
from worker.agentic.planner.planner_tools import set_project_context

logger = structlog.get_logger()


# System prompt for the coder agent
CODER_SYSTEM_PROMPT = """You are a coding assistant that helps create and modify code files.

You have access to the following tools:
- read_file: Read the contents of a file
- write_file: Create or overwrite a file
- delete_file: Delete a file
- list_files: List files in a directory
- search_codebase: Search for patterns in the codebase

Guidelines:
1. Always read existing files before modifying them
2. Create complete, working code - no placeholders
3. Use proper file paths relative to the project root
4. Handle errors gracefully
"""


def create_coder_agent():
    """Create the coder agent with tools bound."""
    return model_azure.bind_tools(FILESYSTEM_TOOLS)


def coder_node(state: AgentState) -> dict[str, Any]:
    """
    LangGraph node that executes coding tasks.

    This node:
    1. Receives instructions from the planner
    2. Uses filesystem tools to read/write code
    3. Returns results back to the planner
    """
    logger.info("Coder agent executing", step=state["step_count"])

    # Get the coder agent with tools
    coder = create_coder_agent()

    # Build messages with system prompt
    messages = [SystemMessage(content=CODER_SYSTEM_PROMPT)] + list(state["messages"])

    try:
        # Invoke the coder
        response = coder.invoke(messages)

        logger.info(
            "Coder response",
            has_tool_calls=bool(getattr(response, "tool_calls", None)),
        )

        return {
            "messages": [response],
            "phase": "executing_tools"
            if getattr(response, "tool_calls", None)
            else "planning",
        }

    except Exception as e:
        logger.error("Coder failed", error=str(e))
        return {
            "error": f"Coder failed: {str(e)}",
            "phase": "error",
        }


def execute_coder_tools(response) -> list[ToolMessage]:
    """Execute tool calls from the coder and return results."""
    results = []

    if not hasattr(response, "tool_calls") or not response.tool_calls:
        return results

    # Map tool names to functions
    tool_map = {tool.name: tool for tool in FILESYSTEM_TOOLS}

    for tool_call in response.tool_calls:
        tool_name = tool_call["name"]
        tool_args = tool_call["args"]
        tool_id = tool_call["id"]

        logger.info("Executing tool", name=tool_name, args=tool_args)

        if tool_name in tool_map:
            try:
                result = tool_map[tool_name].invoke(tool_args)
            except Exception as e:
                result = f"Error executing {tool_name}: {str(e)}"
        else:
            result = f"Unknown tool: {tool_name}"

        results.append(ToolMessage(content=str(result), tool_call_id=tool_id))

    return results
