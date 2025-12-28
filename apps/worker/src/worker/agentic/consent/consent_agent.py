from typing import Any
from worker.agentic.state import AgentState, ConsentRequest
import structlog
from worker.agentic.planner.planner_tools import is_destructive_tool
import uuid

logger = structlog.get_logger()

def consent_gate_node(state: AgentState) -> dict[str, Any]:
    """
    LangGraph node that handles consent requests.
    
    This node:
    1. Checks if any pending tool calls require consent
    2. If so, sets pending_consent and pauses execution
    3. The WebSocket server will detect this and ask the user
    4. When resumed, consent_decision will be set
    
    Args:
        state: Current agent state
    
    Returns:
        State updates with pending_consent or continuation
    """
    # Check if we're resuming from a consent decision
    if state.get("consent_decision"):
        decision = state["consent_decision"]
        logger.info("Consent decision received", decision=decision)
        
        if decision == "approve" or decision == "approve_all":
            # Update approved tools list if "approve_all"
            if decision == "approve_all" and state.get("pending_consent"):
                tool_name = state["pending_consent"].tool_name
                approved = list(state.get("approved_tools", []))
                if tool_name not in approved:
                    approved.append(tool_name)
                return {
                    "pending_consent": None,
                    "consent_decision": None,
                    "approved_tools": approved,
                    "phase": "executing_tools",
                }
            
            return {
                "pending_consent": None,
                "consent_decision": None,
                "phase": "executing_tools",
            }
        else:
            # Denied - stop execution
            return {
                "pending_consent": None,
                "consent_decision": None,
                "error": "User denied tool execution",
                "phase": "error",
            }
    
    # Check for destructive tools that need consent
    last_message = state["messages"][-1]
    
    if not hasattr(last_message, "tool_calls") or not last_message.tool_calls:
        return {"phase": "executing_tools"}
    
    # Check each tool call
    for tool_call in last_message.tool_calls:
        tool_name = tool_call["name"]
        
        # Skip if already approved
        if tool_name in state.get("approved_tools", []):
            continue
        
        # Check if destructive
        if is_destructive_tool(tool_name):
            # Build consent request
            args = tool_call.get("args", {})
            preview = None
            
            # Generate preview for write_file
            if tool_name == "write_file":
                content = args.get("content", "")
                preview = content[:500] + "..." if len(content) > 500 else content
            
            consent_request = ConsentRequest(
                request_id=str(uuid.uuid4()),
                tool_name=tool_name,
                tool_args=args,
                description=f"Execute {tool_name} on {args.get('path', 'unknown')}",
                preview=preview,
            )
            
            logger.info(
                "Consent required",
                tool_name=tool_name,
                request_id=consent_request.request_id,
            )
            
            return {
                "pending_consent": consent_request,
                "phase": "awaiting_consent",
            }
    
    # No consent needed - proceed to execution
    return {"phase": "executing_tools"}

