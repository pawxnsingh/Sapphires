"""
Filesystem Tools

Core tools for file operations in the project.
Inspired by Dyad's tools/write_file.ts, read_file.ts, etc.
"""

import os
import subprocess
from pathlib import Path
from typing import Optional
import structlog
from pydantic import BaseModel, Field
from langchain.tools import tool

from worker.agentic.planner.planner_tools import (
    get_project_context,
    register_tool,
    format_tool_error,
    format_tool_success,
)

logger = structlog.get_logger()


# ============================================================
# INPUT SCHEMAS
# ============================================================


class WriteFileInput(BaseModel):
    """Input schema for write_file tool."""

    path: str = Field(..., description="Relative path to the file from project root")
    content: str = Field(..., description="Complete content to write to the file")
    description: str = Field(
        default="", description="Brief description of what this file does"
    )


class ReadFileInput(BaseModel):
    """Input schema for read_file tool."""

    path: str = Field(..., description="Relative path to the file to read")


class DeleteFileInput(BaseModel):
    """Input schema for delete_file tool."""

    path: str = Field(..., description="Relative path to the file to delete")


class ListFilesInput(BaseModel):
    """Input schema for list_files tool."""

    directory: str = Field(
        default=".", description="Directory to list (relative to project root)"
    )
    max_depth: int = Field(default=3, description="Maximum depth to traverse")


class SearchCodebaseInput(BaseModel):
    """Input schema for search_codebase tool."""

    query: str = Field(..., description="Search pattern (supports regex)")
    file_pattern: str = Field(default="*", description="Glob pattern to filter files")
    max_results: int = Field(default=50, description="Maximum number of results")


# ============================================================
# TOOL IMPLEMENTATIONS
# ============================================================


@tool(args_schema=WriteFileInput)
def write_file(path: str, content: str, description: str = "") -> str:
    """
    Write content to a file. Creates directories if needed.

    Use this to create new files or completely replace existing files.
    For small edits to existing files, prefer search_replace instead.
    """
    ctx = get_project_context()
    full_path = Path(ctx.project_path) / path

    try:
        # Create parent directories
        full_path.parent.mkdir(parents=True, exist_ok=True)

        # Write content
        full_path.write_text(content, encoding="utf-8")

        logger.info("File written", path=path, size=len(content))
        return format_tool_success(f"Successfully wrote {len(content)} bytes to {path}")

    except Exception as e:
        logger.error("Failed to write file", path=path, error=str(e))
        return format_tool_error(f"Failed to write {path}", str(e))


@tool(args_schema=ReadFileInput)
def read_file(path: str) -> str:
    """
    Read the contents of a file.

    Use this to understand existing code before making changes.
    The output includes line numbers for easier reference.
    """
    ctx = get_project_context()
    full_path = Path(ctx.project_path) / path

    try:
        if not full_path.exists():
            return format_tool_error(f"File not found: {path}")

        if not full_path.is_file():
            return format_tool_error(f"Path is not a file: {path}")

        content = full_path.read_text(encoding="utf-8")

        # Add line numbers
        lines = content.split("\n")
        numbered = [f"{i + 1:4}|{line}" for i, line in enumerate(lines)]

        logger.info("File read", path=path, lines=len(lines))
        return "\n".join(numbered)

    except Exception as e:
        logger.error("Failed to read file", path=path, error=str(e))
        return format_tool_error(f"Failed to read {path}", str(e))


@tool(args_schema=DeleteFileInput)
def delete_file(path: str) -> str:
    """
    Delete a file from the project.

    Use this to remove files that are no longer needed.
    """
    ctx = get_project_context()
    full_path = Path(ctx.project_path) / path

    try:
        if not full_path.exists():
            return format_tool_error(f"File not found: {path}")

        full_path.unlink()

        logger.info("File deleted", path=path)
        return format_tool_success(f"Successfully deleted {path}")

    except Exception as e:
        logger.error("Failed to delete file", path=path, error=str(e))
        return format_tool_error(f"Failed to delete {path}", str(e))


@tool(args_schema=ListFilesInput)
def list_files(directory: str = ".", max_depth: int = 3) -> str:
    """
    List files and directories in the project.

    Returns a tree structure of the project files.
    Automatically excludes node_modules, .git, and other common directories.
    """
    ctx = get_project_context()
    root = Path(ctx.project_path) / directory

    IGNORE = {"node_modules", ".git", ".expo", "__pycache__", "dist", "build", ".next"}

    try:
        if not root.exists():
            return format_tool_error(f"Directory not found: {directory}")

        lines = []

        def walk(path: Path, prefix: str = "", depth: int = 0):
            if depth > max_depth:
                return

            try:
                entries = sorted(path.iterdir(), key=lambda e: (not e.is_dir(), e.name))
            except PermissionError:
                return

            entries = [
                e
                for e in entries
                if e.name not in IGNORE and not e.name.startswith(".")
            ]

            for i, entry in enumerate(entries[:30]):  # Limit per directory
                is_last = i == len(entries) - 1
                connector = "+-" if is_last else "|-"

                if entry.is_dir():
                    lines.append(f"{prefix}{connector} {entry.name}/")
                    ext = "  " if is_last else "| "
                    walk(entry, prefix + ext, depth + 1)
                else:
                    lines.append(f"{prefix}{connector} {entry.name}")

        lines.append(f"{root.name}/")
        walk(root)

        return "\n".join(lines[:150])  # Limit total output

    except Exception as e:
        logger.error("Failed to list files", directory=directory, error=str(e))
        return format_tool_error(f"Failed to list {directory}", str(e))


@tool(args_schema=SearchCodebaseInput)
def search_codebase(query: str, file_pattern: str = "*", max_results: int = 50) -> str:
    """
    Search the codebase for a pattern using ripgrep.

    Returns matching lines with file paths and line numbers.
    Supports regex patterns.
    """
    ctx = get_project_context()

    try:
        result = subprocess.run(
            [
                "rg",
                "--line-number",
                "--max-count",
                str(max_results),
                "--glob",
                file_pattern,
                "--glob",
                "!node_modules",
                "--glob",
                "!.git",
                query,
                ctx.project_path,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode == 0:
            return result.stdout[:10000]  # Limit output size
        elif result.returncode == 1:
            return "No matches found."
        else:
            return format_tool_error("Search failed", result.stderr)

    except FileNotFoundError:
        # Fallback if ripgrep not available
        return format_tool_error(
            "ripgrep (rg) not installed",
            "Install with: brew install ripgrep (macOS) or apt install ripgrep (Linux)",
        )
    except subprocess.TimeoutExpired:
        return format_tool_error("Search timed out")
    except Exception as e:
        return format_tool_error("Search failed", str(e))


# ============================================================
# REGISTER TOOLS
# ============================================================

# Register all tools with the registry
register_tool(write_file, is_destructive=True)
register_tool(read_file, is_destructive=False)
register_tool(delete_file, is_destructive=True)
register_tool(list_files, is_destructive=False)
register_tool(search_codebase, is_destructive=False)

# Export list of filesystem tools
FILESYSTEM_TOOLS = [
    write_file,
    read_file,
    delete_file,
    list_files,
    search_codebase,
]
