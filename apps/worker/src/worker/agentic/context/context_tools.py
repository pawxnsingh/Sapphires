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
        Formatted context string
    """
    sections = []
    
    # Add file tree
    tree = gather_file_tree(project_path)
    sections.append(f"## Project Structure\n\n```\n{tree}\n```")
    
    # Add priority files
    files = read_priority_files(project_path)
    for file_path, content in files.items():
        sections.append(f"## {file_path}\n\n```\n{content}\n```")
    
    return "\n\n".join(sections)


def context_gather(state: AgentState) -> dict[str, Any]:
    """
    LangGraph node that gathers project context.
    
    This node:
    1. Reads the project file tree
    2. Loads priority files (package.json, App.tsx, etc.)
    3. Returns the context for the planner
    
    Args:
        state: Current agent state
    
    Returns:
        State updates with codebase_context
    """
    logger.info(
        "Gathering context",
        project_id=state["project_id"],
        project_path=state["project_path"],
    )
    
    try:
        context = build_codebase_context(state["project_path"])
        
        logger.info(
            "Context gathered",
            context_length=len(context),
        )
        
        return {
            "codebase_context": context,
            "phase": "planning",
        }
    
    except Exception as e:
        logger.error("Failed to gather context", error=str(e))
        return {
            "codebase_context": f"Error gathering context: {str(e)}",
            "phase": "planning",
        }

