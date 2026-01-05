"""
Coder Agent

The coder agent receives tasks from the planner and executes code operations
using filesystem tools (read_file, write_file, etc.)
"""

from typing import Any
from langchain.messages import SystemMessage, HumanMessage, AIMessage
from langchain_core.messages import ToolMessage
import structlog
from langchain.agents import create_agent

from worker.agentic.model import model_azure
from worker.agentic.coder.coder_tools import FILESYSTEM_TOOLS
from worker.agentic.state import AgentState
from worker.agentic.coder.coder_prompt import systemPrompt
from worker.agentic.planner.planner_tools import set_project_context

logger = structlog.get_logger()


# def create_coder_agent():
#     """Create the coder agent with tools bound."""
#     # return model_azure.bind_tools(FILESYSTEM_TOOLS)
#     return create_agent(
#         model=model_azure,
#         tools=[],
#         name=""
#     )

async def coder_node(state: AgentState) -> dict[str, Any]:
    """
    LangGraph node that executes coding tasks.

    This node:
    1. Receives instructions from the planner
    2. Uses filesystem tools to read/write code
    3. Returns results back to the planner
    """
    logger.info("Coder agent executing", step=state["step_count"])
    codebase_context = state.get("codebase_context", "") or ""
    system_prompt = await systemPrompt(state["project_type"], codebase_context)
    
    # Get the coder agent with tools
    coder_agent = create_agent(
        model=model_azure,
        tools=FILESYSTEM_TOOLS,
        name="coder_agent",
        system_prompt=system_prompt
    )

    # Build messages with system prompt
    messages = list(state["messages"])
    print("before message", messages)

    try:
        # Invoke the coder
        response = await coder_agent.ainvoke({"message": messages})
        
        new_messages = response.get("messages", [])
        print("this is the message", new_messages)
             
        logger.info(
            "Planner response",
            has_tool_calls=any(getattr(m, "tool_calls", None) for m in new_messages),
            content_length=len(new_messages[-1].content) if new_messages else 0,
        )
        
        if isinstance(new_messages, list) and len(new_messages) > len(messages):
            new_messages = new_messages[len(messages):]

        return {
            "messages": new_messages,
            "phase": "executing_tools" if getattr(response, "tool_calls", None) else "planning",
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
