"""
Agent Graph - LangGraph v1.0+

Simplified agent graph with unified planner.
Flow: context_gather → planner → tools → respond (loop)
"""

from typing import Literal
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
import structlog

from worker.agentic.state import AgentState
from worker.agentic.context.context_tools import context_gather
from worker.agentic.planner.agent import planner_node
from worker.agentic.executor import execute_tools_node
from worker.agentic.respond import respond_node
from worker.agentic.tools import is_destructive_tool

logger = structlog.get_logger()


# ============================================================
# GRAPH CONSTRUCTION
# ============================================================


def create_agent() -> StateGraph:
    """
    Create the LangGraph StateGraph for the agent.
    
    Flow:
    1. context_gather: Gather project structure and key files
    2. planner: LLM decides actions (uses tools or responds)
    3. tools: Execute tool calls from planner
    4. respond: Format final response
    
    The planner ↔ tools loop continues until the LLM responds without tools.
    """
    graph = StateGraph(AgentState)
    
    # ── Add Nodes ───────────────────────────────────────────────
    graph.add_node("context_gather", context_gather)
    graph.add_node("planner", planner_node)
    graph.add_node("tools", execute_tools_node)
    graph.add_node("respond", respond_node)
    
    # ── Define Edges ────────────────────────────────────────────
    
    # Entry: start by gathering context
    graph.add_edge(START, "context_gather")
    
    # After context, go to planner
    graph.add_edge("context_gather", "planner")
    
    # After planner: route based on tool calls
    graph.add_conditional_edges(
        "planner",
        route_after_planner,
        {
            "tools": "tools",
            "respond": "respond",
            "end": END,
        }
    )
    
    # After tools: loop back to planner or end
    graph.add_conditional_edges(
        "tools",
        route_after_tools,
        {
            "planner": "planner",
            "end": END,
        }
    )
    
    # Respond goes to end
    graph.add_edge("respond", END)
    
    return graph


def compile_agent(checkpointer=None):
    """
    Compile the agent graph with optional checkpointing.
    
    Args:
        checkpointer: Optional LangGraph checkpointer for state persistence.
                     If None, uses in-memory MemorySaver.
    
    Returns:
        Compiled graph ready for invocation
    """
    graph = create_agent()
    
    if checkpointer is None:
        checkpointer = MemorySaver()
    
    compiled = graph.compile(checkpointer=checkpointer)
    
    logger.info("Agent compiled", has_checkpointer=checkpointer is not None)
    
    return compiled


# ============================================================
# ROUTING FUNCTIONS
# ============================================================


def route_after_planner(state: AgentState) -> Literal["tools", "respond", "end"]:
    """
    Decide next step after the planner runs.
    
    Logic:
    1. If error → end
    2. If LLM emitted tool_calls → tools
    3. If no tool_calls → respond (finish)
    """
    # Check for errors
    if state.get("error"):
        logger.warning("Planner error, ending", error=state["error"])
        return "end"
    
    # Check step limit
    if state["step_count"] >= state["max_steps"]:
        logger.warning("Max steps reached", steps=state["step_count"])
        return "respond"
    
    # Get last message
    last_message = state["messages"][-1] if state["messages"] else None
    
    if not last_message:
        return "respond"
    
    # Check if there are tool calls
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tools"
    
    return "respond"


def route_after_tools(state: AgentState) -> Literal["planner", "end"]:
    """
    Decide if we should loop back to planner after tool execution.
    """
    # Check for errors
    if state.get("error"):
        max_errors = state.get("max_errors", 3)
        error_count = state.get("error_recovery_attempts", 0)
        
        if error_count >= max_errors:
            logger.error("Max errors reached, ending", count=error_count)
            return "end"
    
    # Check step limit
    if state["step_count"] >= state["max_steps"]:
        logger.warning("Max steps reached", steps=state["step_count"])
        return "end"
    
    # Continue to planner
    return "planner"


# ============================================================
# CONVENIENCE FUNCTIONS
# ============================================================


def get_agent_graph_image():
    """
    Generate a visualization of the agent graph.
    
    Returns:
        PNG image bytes of the graph
    """
    graph = create_agent().compile()
    return graph.get_graph().draw_mermaid_png()


if __name__ == "__main__":
    image = get_agent_graph_image()
    with open("agent_graph.png", "wb") as f:
        f.write(image)
    print("Graph image saved to agent_graph.png")
