"""
Conversation State Management

Tracks conversation history, user preferences, and edit patterns
for smarter context-aware responses.

Inspired by open-lovable's conversation state analysis.
"""

import re
from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal
import structlog

logger = structlog.get_logger()


# ============================================================
# TYPE DEFINITIONS
# ============================================================


@dataclass
class FileEdit:
    """Record of a file change made during conversation."""
    file_path: str
    operation: Literal["create", "update", "delete", "rename"]
    timestamp: float
    description: str = ""
    lines_changed: int = 0


@dataclass
class Message:
    """A single message in the conversation."""
    role: Literal["user", "assistant", "system", "tool"]
    content: str
    timestamp: float = field(default_factory=lambda: datetime.now().timestamp())
    tool_calls: list[dict] = field(default_factory=list)


@dataclass
class UserPreferences:
    """Detected user preferences from conversation patterns."""
    # Edit style preference
    edit_style: Literal["targeted", "comprehensive"] = "targeted"
    
    # Common component references
    common_patterns: list[str] = field(default_factory=list)
    
    # Detected skill level (affects explanation depth)
    skill_level: Literal["beginner", "intermediate", "advanced"] = "intermediate"
    
    # Design preferences
    prefers_dark_mode: bool = False
    preferred_libraries: list[str] = field(default_factory=list)


@dataclass
class ConversationState:
    """
    Complete conversation state for context-aware responses.
    
    Tracks:
    - Full message history
    - All file edits made
    - User preferences (auto-detected)
    - Current focus area
    """
    conversation_id: str
    started_at: float
    last_updated: float
    
    # History
    messages: list[Message] = field(default_factory=list)
    edits: list[FileEdit] = field(default_factory=list)
    
    # Detected preferences
    preferences: UserPreferences = field(default_factory=UserPreferences)
    
    # Current context
    current_focus: str = ""  # e.g., "header component", "authentication"
    active_files: list[str] = field(default_factory=list)  # Recently touched files


# ============================================================
# PREFERENCE DETECTION
# ============================================================


def analyze_user_preferences(messages: list[Message]) -> UserPreferences:
    """
    Analyze conversation history to detect user preferences.
    
    Detects:
    - Edit style (targeted vs comprehensive)
    - Common patterns (hero, header, button mentions)
    - Skill level hints
    - Library preferences
    """
    user_messages = [m for m in messages if m.role == "user"]
    
    if not user_messages:
        return UserPreferences()
    
    all_content = " ".join(m.content.lower() for m in user_messages)
    
    # Detect edit style
    targeted_count = len(re.findall(
        r"\b(update|change|fix|modify|edit|tweak|adjust)\b", all_content
    ))
    comprehensive_count = len(re.findall(
        r"\b(rebuild|recreate|redesign|overhaul|refactor|rewrite)\b", all_content
    ))
    
    edit_style: Literal["targeted", "comprehensive"] = (
        "comprehensive" if comprehensive_count > targeted_count else "targeted"
    )
    
    # Detect common patterns
    patterns = []
    pattern_keywords = {
        "hero section": ["hero", "banner", "splash"],
        "header/nav": ["header", "nav", "navigation", "menu"],
        "footer": ["footer"],
        "buttons": ["button", "btn", "cta"],
        "forms": ["form", "input", "submit"],
        "cards": ["card", "tile"],
        "colors/styling": ["color", "theme", "style", "css"],
        "animations": ["animation", "animate", "transition"],
        "authentication": ["login", "auth", "signup", "register"],
        "data/API": ["api", "fetch", "data", "backend"],
    }
    
    for pattern_name, keywords in pattern_keywords.items():
        if any(kw in all_content for kw in keywords):
            patterns.append(pattern_name)
    
    # Detect skill level
    beginner_hints = len(re.findall(
        r"\b(how do i|what is|explain|help me|confused|don't understand)\b", 
        all_content
    ))
    advanced_hints = len(re.findall(
        r"\b(refactor|optimize|typescript|generics|hooks|context|reducer)\b",
        all_content
    ))
    
    if beginner_hints > advanced_hints * 2:
        skill_level = "beginner"
    elif advanced_hints > beginner_hints:
        skill_level = "advanced"
    else:
        skill_level = "intermediate"
    
    # Detect dark mode preference
    prefers_dark = "dark" in all_content and "mode" in all_content
    
    # Detect library preferences
    libraries = []
    lib_keywords = {
        "tailwind": ["tailwind", "tw-"],
        "styled-components": ["styled-components", "styled."],
        "framer-motion": ["framer", "motion"],
        "react-query": ["react-query", "tanstack", "usequery"],
        "zustand": ["zustand"],
        "redux": ["redux", "slice", "dispatch"],
    }
    
    for lib, keywords in lib_keywords.items():
        if any(kw in all_content for kw in keywords):
            libraries.append(lib)
    
    return UserPreferences(
        edit_style=edit_style,
        common_patterns=patterns[:5],
        skill_level=skill_level,
        prefers_dark_mode=prefers_dark,
        preferred_libraries=libraries,
    )


def detect_current_focus(messages: list[Message]) -> str:
    """Detect what the user is currently focused on from recent messages."""
    recent_user = [m for m in messages[-5:] if m.role == "user"]
    
    if not recent_user:
        return ""
    
    last_message = recent_user[-1].content.lower()
    
    # Extract component/feature mentions
    focus_patterns = [
        (r"\b(header|nav|navigation)\b", "header/navigation"),
        (r"\b(footer)\b", "footer"),
        (r"\b(hero|banner)\b", "hero section"),
        (r"\b(form|input)\b", "forms"),
        (r"\b(button)\b", "buttons"),
        (r"\b(card)\b", "cards"),
        (r"\b(modal|popup|dialog)\b", "modals"),
        (r"\b(auth|login|signup)\b", "authentication"),
        (r"\b(home|index|main)\b", "home page"),
        (r"\b(about)\b", "about page"),
        (r"\b(settings)\b", "settings"),
        (r"\b(profile)\b", "profile"),
    ]
    
    for pattern, focus in focus_patterns:
        if re.search(pattern, last_message):
            return focus
    
    return ""


# ============================================================
# STATE MANAGEMENT
# ============================================================


def create_conversation_state(conversation_id: str | None = None) -> ConversationState:
    """Create a new conversation state."""
    now = datetime.now().timestamp()
    return ConversationState(
        conversation_id=conversation_id or f"conv-{int(now)}",
        started_at=now,
        last_updated=now,
    )


def add_message(state: ConversationState, role: str, content: str) -> ConversationState:
    """Add a message to the conversation state."""
    state.messages.append(Message(
        role=role,
        content=content,
    ))
    state.last_updated = datetime.now().timestamp()
    
    # Update preferences periodically
    if len(state.messages) % 5 == 0:
        state.preferences = analyze_user_preferences(state.messages)
    
    # Update focus on user messages
    if role == "user":
        state.current_focus = detect_current_focus(state.messages)
    
    return state


def add_file_edit(
    state: ConversationState,
    file_path: str,
    operation: str,
    description: str = "",
    lines_changed: int = 0,
) -> ConversationState:
    """Record a file edit in the conversation state."""
    state.edits.append(FileEdit(
        file_path=file_path,
        operation=operation,
        timestamp=datetime.now().timestamp(),
        description=description,
        lines_changed=lines_changed,
    ))
    
    # Track active files
    if file_path not in state.active_files:
        state.active_files.append(file_path)
        # Keep only recent files
        state.active_files = state.active_files[-10:]
    
    state.last_updated = datetime.now().timestamp()
    return state


# ============================================================
# CONTEXT FORMATTERS
# ============================================================


def format_conversation_context(state: ConversationState) -> str:
    """Format conversation state as context for the LLM."""
    lines = []
    
    # Preferences
    prefs = state.preferences
    if prefs.edit_style == "comprehensive":
        lines.append("User prefers: comprehensive rebuilds over small edits")
    else:
        lines.append("User prefers: targeted, minimal edits")
    
    if prefs.skill_level == "beginner":
        lines.append("User appears to be learning - provide extra explanation")
    elif prefs.skill_level == "advanced":
        lines.append("User is technical - be concise, skip basics")
    
    if prefs.common_patterns:
        lines.append(f"Common requests: {', '.join(prefs.common_patterns)}")
    
    if prefs.preferred_libraries:
        lines.append(f"Preferred libraries: {', '.join(prefs.preferred_libraries)}")
    
    # Current focus
    if state.current_focus:
        lines.append(f"Current focus: {state.current_focus}")
    
    # Recent edits
    if state.edits:
        recent = state.edits[-5:]
        lines.append(f"Recent edits ({len(state.edits)} total):")
        for edit in recent:
            lines.append(f"  - {edit.operation}: {edit.file_path}")
    
    # Active files
    if state.active_files:
        lines.append(f"Active files: {', '.join(state.active_files[-5:])}")
    
    return "\n".join(lines)


def get_conversation_summary(state: ConversationState) -> dict:
    """Get a summary of the conversation for logging/debugging."""
    return {
        "id": state.conversation_id,
        "message_count": len(state.messages),
        "edit_count": len(state.edits),
        "user_message_count": len([m for m in state.messages if m.role == "user"]),
        "edit_style": state.preferences.edit_style,
        "skill_level": state.preferences.skill_level,
        "current_focus": state.current_focus,
        "active_files": state.active_files[-5:],
    }
