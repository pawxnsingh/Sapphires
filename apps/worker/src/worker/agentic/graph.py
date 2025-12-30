from typing import Optional, Literal
from worker.agentic.state import AgentState
from worker.agentic import model
from langgraph.graph import StateGraph, START, END
import structlog
from langgraph.checkpoint.memory import MemorySaver
from worker.agentic.context.context_tools import context_gather
from worker.agentic.planner.planner_tools import planner_node
from worker.agentic.consent.consent_agent import consent_gate_node
from worker.agentic.executor import execute_tools_node
from worker.agentic.respond import respond_node
from worker.agentic.planner.planner_tools import is_destructive_tool
from worker.agentic.state import create_initial_state

logger = structlog.get_logger()

# ============================================================
# GRAPH CONSTRUCTION
# ============================================================

def create_agent() -> StateGraph:
    """
    Create the LangGraph StateGraph for the agent.
    
    Graph structure:
    
        START
          │
          ▼
    context_gather
          │
          ▼
       planner ◄──────────────┐
          │                   │
          ▼                   │
    [route_after_planner]     │
      │      │      │         │
      ▼      ▼      ▼         │
   consent  tools  respond    │
    _gate     │      │        │
      │       │      │        │
      ▼       ▼      ▼        │
    [consent] [tools]  END    │
      │         │             │
      ▼         ▼             │
    tools    planner ─────────┘
      │
      ▼
    planner
    
    Returns:
        Configured StateGraph (not yet compiled)
    """
    # Create the graph with our state type
    graph = StateGraph(AgentState)
    
    # ── Add Nodes ───────────────────────────────────────────────
    graph.add_node("context_gather", context_gather)
    graph.add_node("planner", planner_node)
    graph.add_node("consent_gate", consent_gate_node)
    graph.add_node("tools", execute_tools_node)
    graph.add_node("respond", respond_node)
    
    # ── Define Edges ────────────────────────────────────────────
    
    # Entry point
    graph.add_edge(START, "context_gather")
    graph.add_edge("context_gather", "planner")
    
    # After planner: route to consent, tools, or respond
    graph.add_conditional_edges(
        "planner",
        route_after_planner,
        {
            "consent_gate": "consent_gate",
            "tools": "tools",
            "respond": "respond",
        }
    )
    
    # After consent gate: continue to tools or end
    graph.add_conditional_edges(
        "consent_gate",
        route_after_consent,
        {
            "tools": "tools",
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
                     If None, uses in-memory MemorySaver (for development).
    
    Returns:
        Compiled graph ready for invocation
    """
    graph = create_agent()
    
    if checkpointer is None:
        checkpointer = MemorySaver()
    
    # Compile with interrupt_before for consent gate
    # This allows the WebSocket server to pause and ask for user consent
    compiled = graph.compile(
        checkpointer=checkpointer,
        interrupt_before=["consent_gate"],
    )
    
    logger.info("Agent compiled", has_checkpointer=checkpointer is not None)
    
    return compiled




# ============================================================
# ROUTING FUNCTIONS
# ============================================================

def route_after_planner(state: AgentState) -> Literal["consent_gate", "tools", "respond"]:
    """
    Decide next step after the planner runs.
    
    Logic:
    1. If LLM emitted tool_calls with destructive tools -> consent_gate
    2. If LLM emitted tool_calls (safe only) -> tools
    3. If no tool_calls -> respond (finish)
    """
    last_message = state["messages"][-1]
    
    # Check if there are tool calls
    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return "respond"
    
    # Check if any destructive tools need consent
    approved_tools = set(state.get("approved_tools", []))
    
    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        if is_destructive_tool(tool_name) and tool_name not in approved_tools:
            return "consent_gate"
    
    return "tools"


def route_after_consent(state: AgentState) -> Literal["tools", "end"]:
    """
    Route based on user's consent decision.
    """
    decision = state.get("consent_decision")
    
    if decision in ("approve", "approve_all"):
        return "tools"
    
    return "end"


def route_after_tools(state: AgentState) -> Literal["planner", "end"]:
    """
    Decide if we should loop back to planning after tool execution.
    """
    # Check for errors
    if state.get("error"):
        return "end"
    
    # Check step limit
    if state["step_count"] >= state["max_steps"]:
        logger.warning("Max steps reached", steps=state["step_count"])
        return "end"
    
    # Continue planning
    return "planner"





# ============================================================
# CONVENIENCE FUNCTIONS
# ============================================================

def get_agent_graph_image():
    """
    Generate a visualization of the agent graph.
    
    Useful for debugging and documentation.
    
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
