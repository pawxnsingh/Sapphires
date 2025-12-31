from typing import Any
from worker.agentic.state import AgentState
from langchain_core.tools import BaseTool
from langchain.messages import SystemMessage
from worker.agentic.planner.planner_prompt import build_system_prompt
from worker.agentic.model import model_azure as model
from langchain.agents import create_agent
import structlog

logger = structlog.get_logger()

# ============================================================
# PROJECT CONTEXT (Global state for tools)
# ============================================================

class ProjectContext:
    """
    Holds the current project context for tool execution.
    
    This is a singleton that gets set when a worker starts
    processing a specific project.
    """
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._project_path = None
            cls._instance._project_id = None
        return cls._instance
    
    @property
    def project_path(self) -> str:
        if self._project_path is None:
            raise RuntimeError("Project context not initialized. Call set_project_context() first.")
        return self._project_path
    
    @property
    def project_id(self) -> str:
        if self._project_id is None:
            raise RuntimeError("Project context not initialized. Call set_project_context() first.")
        return self._project_id
    
    def set(self, project_id: str, project_path: str):
        self._project_id = project_id
        self._project_path = project_path
        logger.info("Project context set", project_id=project_id, project_path=project_path)
    
    def clear(self):
        self._project_id = None
        self._project_path = None


_context = ProjectContext()


def set_project_context(project_id: str, project_path: str):
    """Set the project context for tool execution."""
    _context.set(project_id, project_path)


def get_project_context() -> ProjectContext:
    """Get the current project context."""
    return _context


# ============================================================
# TOOL REGISTRY
# ============================================================

# Tools that require user consent before execution
# These modify the filesystem or run commands
DESTRUCTIVE_TOOLS: set[str] = {
    "write_file",
    "delete_file",
    "rename_file",
    "add_dependency",
    "remove_dependency",
    "execute_command",
}

# All registered tools (populated by imports)
TOOL_REGISTRY: dict[str, BaseTool] = {}


def register_tool(tool: BaseTool, is_destructive: bool = False):
    """
    Register a tool in the global registry.
    
    Args:
        tool: The LangChain tool to register
        is_destructive: Whether this tool requires user consent
    """
    TOOL_REGISTRY[tool.name] = tool
    if is_destructive:
        DESTRUCTIVE_TOOLS.add(tool.name)
    logger.debug("Registered tool", name=tool.name, destructive=is_destructive)


def get_all_tools() -> list[BaseTool]:
    """Get all registered tools as a list."""
    # Import here to ensure tools are registered
    return list(TOOL_REGISTRY.values())


def is_destructive_tool(tool_name: str) -> bool:
    """Check if a tool requires user consent."""
    return tool_name in DESTRUCTIVE_TOOLS


# ============================================================
# TOOL RESULT HELPERS
# ============================================================

def format_tool_success(message: str, data: Any = None) -> str:
    """Format a successful tool result."""
    if data:
        return f"✓ {message}\n\nData:\n{data}"
    return f"✓ {message}"


def format_tool_error(message: str, details: str = None) -> str:
    """Format a tool error result."""
    if details:
        return f"✗ Error: {message}\n\nDetails:\n{details}"
    return f"✗ Error: {message}"




async def planner_node(state: AgentState) -> dict[str, Any]:
    """
    LangGraph node that calls the LLM to plan next actions.
    
    This node:
    1. Builds the system prompt with project context
    2. Binds available tools to the model
    3. Invokes the model with conversation history
    4. Returns the model's response (text and/or tool calls)
    
    Args:
        state: Current agent state
    
    Returns:
        State updates with new messages and incremented step count
    """
        
    logger.info(
        "Planning",
        step=state["step_count"],
        max_steps=state["max_steps"],
    )
    
    # Build system prompt
    prompt = build_system_prompt(
        codebase_context=state.get("codebase_context", ""),
        project_type="react-native",
    )
    
    print("system_prompt:>>>",  prompt)
    
    planner_agent = create_agent(
        model=model,
        system_prompt=prompt,
        name="planner_agent",
        tools=[]
    )
    
    messages = list(state["messages"])
    
    print("messages::::::: ", state["messages"] )    

    # Invoke model
    try:
        response =  await planner_agent.ainvoke({"messages": messages})
        
        # response from sub-graph is its full state dict
        new_messages = response.get("messages", [])
        
        # Only take the NEW messages (not the whole history if it returned everything)
        # However, add_messages handles message IDs, but it's cleaner to just send the latest.
        # Given planner_agent.invoke returns the full state including input messages:
        
        if isinstance(new_messages, list) and len(new_messages) > len(messages):
            new_messages = new_messages[len(messages):]
            
        logger.info(
            "Planner response",
            has_tool_calls=any(getattr(m, "tool_calls", None) for m in new_messages),
            content_length=len(new_messages[-1].content) if new_messages else 0,
        )
        
        return {
            "messages": new_messages,
            "step_count": state["step_count"] + 1,
            "phase": "executing_tools" if any(getattr(m, "tool_calls", None) for m in new_messages) else "responding",
        }
    
    except Exception as e:
        logger.error("Planner failed", error=str(e))
        return {
            "error": f"Planning failed: {str(e)}",
            "phase": "error",
        }

