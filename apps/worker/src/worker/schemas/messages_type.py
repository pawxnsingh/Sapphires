from pydantic import BaseModel
from typing import Optional


class UserMessage(BaseModel):
    """Incoming message from the client."""
    type: str  # "message" | "consent_response" | "cancel"
    content: Optional[str] = None
    request_id: Optional[str] = None
    decision: Optional[str] = None  # "approve" | "deny" | "approve_all"


class StreamChunk(BaseModel):
    """Outgoing stream chunk to the client."""
    type: str  # "chunk" | "file" | "tool_call" | "consent_request" | "done" | "error"
    content: Optional[str] = None
    data: Optional[dict] = None
