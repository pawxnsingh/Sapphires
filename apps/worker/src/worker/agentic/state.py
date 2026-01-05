"""
Agent State Definition - LangGraph v1.0+

This module defines the state schema that flows through the agent graph.
Inspired by Dyad's TypeScript implementation but adapted for LangGraph patterns.
"""

from typing import TypedDict, Annotated, Sequence, Literal, Optional
from langgraph.graph.message import add_messages
from langchain.messages import HumanMessage
from langchain_core.messages import BaseMessage
from pydantic import BaseModel, Field



# ============================================================
# NESTED STATE TYPES
# ============================================================


class FileChange(BaseModel):
    """
    Represents a file change to stream to the client.
    
    This allows the frontend to show live previews of files
    as they're being created/modified.
    """
    path: str = Field(..., description="Relative path to the file")
    content: str = Field(..., description="File content")
    operation: Literal["create", "update", "delete"] = Field(
        default="update",
        description="Type of file operation"
    )
    language: Optional[str] = Field(
        default=None,
        description="Programming language for syntax highlighting"
    )


class ConsentRequest(BaseModel):
    """
    Represents a pending consent request for destructive operations.
    
    When the agent wants to execute a destructive tool (write_file, delete_file),
    it pauses and asks the user for permission first.
    
    Inspired by Dyad's requireAgentToolConsent() pattern.
    """
    request_id: str = Field(..., description="Unique ID for this consent request")
    tool_name: str = Field(..., description="Name of the tool requesting consent")
    tool_args: dict = Field(default_factory=dict, description="Arguments for the tool")
    description: str = Field(..., description="Human-readable description of what will happen")
    preview: Optional[str] = Field(
        default=None,
        description="Preview of the content (e.g., first 500 chars of file)"
    )


class ToolCallPreview(BaseModel):
    """
    Preview of a tool call being generated (for streaming).
    
    This allows streaming partial tool arguments to the UI
    so users can see what the agent is about to do.
    """
    tool_name: str
    partial_args: str  # JSON string of partial arguments
    is_complete: bool = False


# ============================================================
# MAIN AGENT STATE
# ============================================================


class AgentState(TypedDict):
    """
    The state that flows through the LangGraph agent.
    
    Design decisions (inspired by Dyad's architecture):
    
    1. `messages`: Uses LangGraph's `add_messages` reducer for proper 
       message accumulation across graph iterations.
    
    2. `pending_consent`: When set, the graph pauses (via interrupt_before)
       and waits for user approval before executing destructive tools.
    
    3. `streamed_files`: Accumulates file changes to push to the client
       for live preview rendering.
    
    4. `step_count` / `max_steps`: Prevents infinite loops by limiting
       the number of planning iterations (default 25, same as Dyad).
    
    5. `codebase_context`: Smart-picked relevant files from the project,
       avoiding sending the entire codebase to the LLM.
    """
    
    # ── Core Conversation ──────────────────────────────────────────
    # Uses LangGraph's message reducer for proper accumulation
    messages: Annotated[Sequence[BaseMessage], add_messages]
    
    # ── Project Context ────────────────────────────────────────────
    project_id: str
    project_path: str
    project_type: Literal["NEXTJS", "REACT_NATIVE", "REACT"]
    session_id: str  # For checkpointing/resumption
    
    # Smart context: relevant files picked based on conversation
    codebase_context: Optional[str]
    
    # ── Enhanced Context (Phase 1 Features) ────────────────────────
    # Rich file manifest with imports/exports/component info
    file_manifest: Optional[dict]  # Serialized FileManifest
    
    # Conversation state for preference tracking
    conversation_state: Optional[dict]  # Serialized ConversationState
    
    # Analyzed edit intent
    edit_intent: Optional[dict]  # Serialized EditIntent
    
    # ── Control Flow ───────────────────────────────────────────────
    step_count: int
    max_steps: int  # Default: 50 (increased for premium quality)
    
    # Current phase of execution
    phase: Literal[
        "gathering_context",
        "planning", 
        "code_generation",
        "awaiting_consent",
        "executing_tools",
        "responding",
        "completed",
        "error"
    ]
    
    # ── Human-in-the-Loop (Consent Gate) ───────────────────────────
    # When set, the graph pauses and waits for user decision
    pending_consent: Optional[ConsentRequest]
    consent_decision: Optional[Literal["approve", "deny", "approve_all"]]
    
    # Track which tools have been approved for "approve_all" 
    approved_tools: Sequence[str]
    
    # ── Streaming Output ───────────────────────────────────────────
    # Files to push to the client for live preview
    streamed_files: Sequence[FileChange]
    
    # Current partial response (for streaming text to UI)
    partial_response: str
    
    # Current tool call preview (for streaming tool args)
    tool_preview: Optional[ToolCallPreview]
    
    # ── Error Handling ─────────────────────────────────────────────
    error: Optional[str]
    error_recovery_attempts: int
    max_errors: int  # Default: 3


# ============================================================
# STATE FACTORY
# ============================================================


def create_initial_state(
    project_id: str,
    project_path: str,
    session_id: str,
    user_message: str,
    project_type: Literal["NEXTJS", "REACT_NATIVE", "REACT"],
    max_steps: int = 50,
) -> AgentState:
    """
    Create the initial state for a new agent session.
    
    Args:
        project_id: Unique identifier for the project
        project_path: Filesystem path to the project root
        session_id: Unique session ID for checkpointing
        user_message: The user's initial message
        max_steps: Maximum number of planning iterations
    
    Returns:
        Initialized AgentState
    """
    
    return AgentState(
        messages=[HumanMessage(content=user_message)],
        project_id=project_id,
        project_path=project_path,
        project_type=project_type,
        session_id=session_id,
        codebase_context=None,
        file_manifest=None,
        conversation_state=None,
        edit_intent=None,
        step_count=0,
        max_steps=max_steps,
        phase="gathering_context",
        pending_consent=None,
        consent_decision=None,
        approved_tools=[],
        streamed_files=[],
        partial_response="",
        tool_preview=None,
        error=None,
        error_recovery_attempts=0,
        max_errors=3,
    )

