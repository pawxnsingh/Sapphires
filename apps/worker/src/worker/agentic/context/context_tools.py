"""
Context Gathering Node

Gathers smart context from the project filesystem before planning.
Inspired by Dyad's extractCodebase() function.
"""

import os
from pathlib import Path
from typing import Any
import structlog

from worker.agentic.state import AgentState
from worker.agentic.planner.planner_tools import set_project_context

logger = structlog.get_logger()

# Files to always include in context
PRIORITY_FILES = [
    "package.json",
    "app.json",
    "tsconfig.json",
    "App.tsx",
    "src/App.tsx",
    "index.js",
    "index.tsx",
]

# Directories to skip
IGNORE_DIRS = {
    "node_modules",
    ".git",
    ".expo",
    "android",
    "ios",
    "__pycache__",
    ".next",
    "dist",
    "build",
}

# File extensions to include
CODE_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".json", ".md",
}


def gather_file_tree(project_path: str, max_depth: int = 3) -> str:
    """
    Generate a tree structure of the project.
    
    Args:
        project_path: Path to the project root
        max_depth: Maximum directory depth to traverse
    
    Returns:
        String representation of the file tree
    """
    lines = []
    root_path = Path(project_path)
    
    def walk(path: Path, prefix: str = "", depth: int = 0):
        if depth > max_depth:
            return
        
        try:
            entries = sorted(path.iterdir(), key=lambda e: (not e.is_dir(), e.name))
        except PermissionError:
            return
        
        # Filter entries
        entries = [
            e for e in entries 
            if e.name not in IGNORE_DIRS and not e.name.startswith(".")
        ]
        
        for i, entry in enumerate(entries):
            is_last = i == len(entries) - 1
            connector = "└── " if is_last else "├── "
            
            if entry.is_dir():
                lines.append(f"{prefix}{connector}{entry.name}/")
                extension = "    " if is_last else "│   "
                walk(entry, prefix + extension, depth + 1)
            else:
                lines.append(f"{prefix}{connector}{entry.name}")
    
    lines.append(f"{root_path.name}/")
    walk(root_path)
    
    return "\n".join(lines[:100])  # Limit output


def read_priority_files(project_path: str) -> dict[str, str]:
    """
    Read content of priority files.
    
    Returns:
        Dictionary mapping file paths to their content
    """
    files = {}
    root = Path(project_path)
    
    for file_path in PRIORITY_FILES:
        full_path = root / file_path
        if full_path.exists() and full_path.is_file():
            try:
                content = full_path.read_text(encoding="utf-8")
                # Limit content size
                if len(content) > 5000:
                    content = content[:5000] + "\n... (truncated)"
                files[file_path] = content
            except Exception as e:
                logger.warning("Failed to read file", path=file_path, error=str(e))
    
    return files


def build_codebase_context(project_path: str) -> str:
    """
    Build the codebase context string for the LLM.
    
    Args:
        project_path: Path to the project root
    
    Returns:
        Formatted context string including file tree, priority files,
        and component relationships
    """
    sections = []
    
    # Add file tree
    tree = gather_file_tree(project_path)
    
    structure = f"## Project Structure\n\n~~~\n{tree}\n~~~"
    print("structure:::: ", structure)
    sections.append(structure)
    
    # Add priority files
    files = read_priority_files(project_path)
    for file_path, content in files.items():
        sections.append(f"## {file_path}\n\n~~~\n{content}\n~~~")
    
    # Add component relationships
    try:
        from worker.agentic.component_tree import get_component_context
        component_context = get_component_context(project_path)
        if component_context:
            sections.append(component_context)
    except Exception as e:
        logger.warning("Failed to get component tree", error=str(e))
    
    return "\n\n".join(sections)


def context_gather(state: AgentState) -> dict[str, Any]:
    """
    LangGraph node that gathers project context.
    
    This node:
    1. Builds rich file manifest with imports/exports
    2. Analyzes user intent from the message
    3. Creates/updates conversation state
    4. Returns enhanced context for the planner
    
    Args:
        state: Current agent state
    
    Returns:
        State updates with codebase_context, file_manifest, and edit_intent
    """
    logger.info(
        "Gathering context",
        project_id=state["project_id"],
        project_path=state["project_path"],
    )
    
    # Initialize project context for file tools
    set_project_context(state["project_id"], state["project_path"])
    
    project_path = state["project_path"]
    
    try:
        # Build file manifest (Phase 1 Feature 1)
        from worker.agentic.file_manifest import (
            build_file_manifest,
            format_manifest_for_llm,
        )
        from worker.agentic.intent_analyzer import (
            analyze_edit_intent,
            format_intent_for_llm,
        )
        from worker.agentic.conversation import (
            create_conversation_state,
            add_message,
            format_conversation_context,
        )
        # Phase 4: Context Providers
        from worker.agentic.context_providers import (
            ContextProviderManager,
            WebSearchProvider,
            DesignProvider,
            DocsProvider,
        )
        from dataclasses import asdict
        
        # Build manifest
        manifest = build_file_manifest(project_path)
        manifest_dict = {
            "files": {k: asdict(v) for k, v in manifest.files.items()},
            "routes": [asdict(r) for r in manifest.routes],
            "component_tree": manifest.component_tree,
            "entry_point": manifest.entry_point,
            "style_files": manifest.style_files,
        }
        
        # Get user message for intent analysis
        user_messages = [m for m in state["messages"] if hasattr(m, "content")]
        last_user_message = user_messages[-1].content if user_messages else ""
        
        # Analyze intent (Phase 1 Feature 3)
        intent = analyze_edit_intent(last_user_message, manifest)
        intent_dict = asdict(intent)
        
        # Phase 4: Context Providers Calculation
        # Initialize manager & providers
        provider_manager = ContextProviderManager()
        provider_manager.register(WebSearchProvider())
        provider_manager.register(DesignProvider())
        provider_manager.register(DocsProvider())
        
        # 1. Explicit Context (@web:..., @design:...)
        context_results = provider_manager.resolve_context(last_user_message)
        
        # 2. Automated Research (if feature/rebuild)
        from worker.agentic.intent_analyzer import EditType
        if not context_results and intent.edit_type in [EditType.ADD_FEATURE, EditType.FULL_REBUILD]:
            # Construct automated query
            research_query = f"modern mobile ui design for {last_user_message}"
            logger.info("Triggering automated design research", query=research_query)
            
            # Use WebSearch provider implicitly
            web_provider = provider_manager.get_provider("web")
            if web_provider:
                res = web_provider.fetch(research_query)
                if res:
                    # Enrich with automation metadata
                    context_results.append(res)
        
        provider_context = provider_manager.format_context_for_llm(context_results)
        
        # Setup conversation state (Phase 1 Feature 2)
        conv_state = state.get("conversation_state")
        if conv_state:
            from worker.agentic.conversation import ConversationState, Message
            # Recreate from dict - simplified
            pass
        else:
            conv_state = create_conversation_state(state["session_id"])
        
        conv_state = add_message(conv_state, "user", last_user_message)
        conv_state_dict = asdict(conv_state)
        
        # Build enhanced context
        sections = []
        
        # Add file tree (quick overview)
        tree = gather_file_tree(project_path)
        sections.append(f"## Project Structure\n\n~~~\n{tree}\n~~~")
        
        # Add manifest summary
        manifest_context = format_manifest_for_llm(manifest)
        sections.append(manifest_context)
        
        # Add intent analysis
        intent_context = format_intent_for_llm(intent)
        sections.append(intent_context)
        
        # Add context from providers (Phase 4)
        if provider_context:
            sections.append(provider_context)
        
        # Add conversation preferences
        conv_context = format_conversation_context(conv_state)
        if conv_context:
            sections.append(f"## User Preferences\n{conv_context}")
        
        # Add priority files content
        files = read_priority_files(project_path)
        for file_path, content in files.items():
            sections.append(f"## {file_path}\n\n~~~\n{content}\n~~~")
        
        # Phase 2: Refine targets with file search
        from worker.agentic.file_search import (
            execute_search,
            format_search_results_for_llm,
            get_targeted_file_contents,
        )
        
        # If intent identifies targets, verify/expand them with search
        if intent.target_files or intent.edit_type != "question":
            search_result = execute_search(
                last_user_message,
                manifest,
            )
            
            # Add search logic to context
            sections.append(format_search_results_for_llm(search_result, manifest))
            
            # Combine intent targets with search primary files
            all_targets = list(set(intent.target_files + search_result.primary_files))
            
            if all_targets:
                sections.append("## Target Files (modify these)")
                # Get targeted content (handles overlap with priority files)
                target_content = get_targeted_file_contents(search_result, manifest)
                sections.append(target_content)
        
        context = "\n\n".join(sections)
        
        logger.info(
            "Context gathered with Phase 1 features",
            manifest_files=len(manifest.files),
            intent_type=intent.edit_type.value,
            target_files=len(intent.target_files),
        )
        
        return {
            "codebase_context": context,
            "file_manifest": manifest_dict,
            "edit_intent": intent_dict,
            "conversation_state": conv_state_dict,
            "step_count": state["step_count"] + 1,
            "phase": "planning",
        }
    
    except Exception as e:
        logger.error("Failed to gather context", error=str(e))
        # Fallback to legacy context
        context = build_codebase_context(project_path)
        return {
            "codebase_context": context,
            "phase": "planning",
        }
