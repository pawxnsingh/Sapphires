"""
Agent Tools - Unified Tool System

All tools available to the planner agent for code operations.
Inspired by Dyad's tool architecture with search_replace, add_dependency support.
"""

import os
import re
import subprocess
from pathlib import Path
from typing import Optional
import structlog
from pydantic import BaseModel, Field
from langchain.tools import tool

logger = structlog.get_logger()


# ============================================================
# PROJECT CONTEXT (Singleton for tool context)
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

DESTRUCTIVE_TOOLS: set[str] = set()
TOOL_REGISTRY: dict[str, any] = {}


def register_tool(tool_fn, is_destructive: bool = False):
    """Register a tool in the global registry."""
    TOOL_REGISTRY[tool_fn.name] = tool_fn
    if is_destructive:
        DESTRUCTIVE_TOOLS.add(tool_fn.name)
    logger.debug("Registered tool", name=tool_fn.name, destructive=is_destructive)


def get_all_tools() -> list:
    """Get all registered tools as a list."""
    return list(TOOL_REGISTRY.values())


def is_destructive_tool(tool_name: str) -> bool:
    """Check if a tool requires user consent."""
    return tool_name in DESTRUCTIVE_TOOLS


# ============================================================
# HELPER FUNCTIONS
# ============================================================


def format_tool_success(message: str, data: any = None) -> str:
    """Format a successful tool result."""
    if data:
        return f"✓ {message}\n\nData:\n{data}"
    return f"✓ {message}"


def format_tool_error(message: str, details: str = None) -> str:
    """Format a tool error result."""
    if details:
        return f"✗ Error: {message}\n\nDetails:\n{details}"
    return f"✗ Error: {message}"


# ============================================================
# INPUT SCHEMAS
# ============================================================


class WriteFileInput(BaseModel):
    """Input schema for write_file tool."""
    path: str = Field(..., description="Relative path to the file from project root")
    content: str = Field(..., description="Complete content to write to the file")
    description: str = Field(default="", description="Brief description of what this file does")


class ReadFileInput(BaseModel):
    """Input schema for read_file tool."""
    path: str = Field(..., description="Relative path to the file to read")


class DeleteFileInput(BaseModel):
    """Input schema for delete_file tool."""
    path: str = Field(..., description="Relative path to the file to delete")


class RenameFileInput(BaseModel):
    """Input schema for rename_file tool."""
    from_path: str = Field(..., description="Current relative path of the file")
    to_path: str = Field(..., description="New relative path for the file")


class ListFilesInput(BaseModel):
    """Input schema for list_files tool."""
    directory: str = Field(default=".", description="Directory to list (relative to project root)")
    max_depth: int = Field(default=3, description="Maximum depth to traverse")


class SearchCodebaseInput(BaseModel):
    """Input schema for search_codebase tool."""
    query: str = Field(..., description="Search pattern (supports regex)")
    file_pattern: str = Field(default="*", description="Glob pattern to filter files")
    max_results: int = Field(default=50, description="Maximum number of results")


class SearchReplaceInput(BaseModel):
    """Input schema for search_replace tool."""
    path: str = Field(..., description="Relative path to the file to edit")
    search: str = Field(..., description="Exact text to search for (must match exactly)")
    replace: str = Field(..., description="Text to replace it with")


class AddDependencyInput(BaseModel):
    """Input schema for add_dependency tool."""
    packages: str = Field(..., description="Space-separated package names (e.g., 'react-query axios')")
    dev: bool = Field(default=False, description="Whether to install as dev dependency")


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


@tool(args_schema=RenameFileInput)
def rename_file(from_path: str, to_path: str) -> str:
    """
    Rename or move a file.
    
    Use this to rename files or move them to different directories.
    Creates target directories if they don't exist.
    """
    ctx = get_project_context()
    src = Path(ctx.project_path) / from_path
    dst = Path(ctx.project_path) / to_path
    
    try:
        if not src.exists():
            return format_tool_error(f"Source file not found: {from_path}")
        
        # Create target directory if needed
        dst.parent.mkdir(parents=True, exist_ok=True)
        
        src.rename(dst)
        
        logger.info("File renamed", from_path=from_path, to_path=to_path)
        return format_tool_success(f"Successfully renamed {from_path} to {to_path}")
    
    except Exception as e:
        logger.error("Failed to rename file", from_path=from_path, to_path=to_path, error=str(e))
        return format_tool_error(f"Failed to rename {from_path}", str(e))


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
                e for e in entries
                if e.name not in IGNORE and not e.name.startswith(".")
            ]
            
            for i, entry in enumerate(entries[:30]):  # Limit per directory
                is_last = i == len(entries) - 1
                connector = "└── " if is_last else "├── "
                
                if entry.is_dir():
                    lines.append(f"{prefix}{connector}{entry.name}/")
                    ext = "    " if is_last else "│   "
                    walk(entry, prefix + ext, depth + 1)
                else:
                    lines.append(f"{prefix}{connector}{entry.name}")
        
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
                "--max-count", str(max_results),
                "--glob", file_pattern,
                "--glob", "!node_modules",
                "--glob", "!.git",
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
        # Fallback: use Python-based search
        return _python_search(ctx.project_path, query, file_pattern, max_results)
    except subprocess.TimeoutExpired:
        return format_tool_error("Search timed out")
    except Exception as e:
        return format_tool_error("Search failed", str(e))


def _python_search(project_path: str, query: str, file_pattern: str, max_results: int) -> str:
    """Fallback search using Python when ripgrep is not available."""
    import fnmatch
    
    results = []
    root = Path(project_path)
    pattern = re.compile(query, re.IGNORECASE)
    
    IGNORE = {"node_modules", ".git", ".expo", "__pycache__"}
    
    for path in root.rglob("*"):
        if len(results) >= max_results:
            break
        
        # Skip ignored directories
        if any(ignored in path.parts for ignored in IGNORE):
            continue
        
        if not path.is_file():
            continue
        
        # Check file pattern
        if file_pattern != "*" and not fnmatch.fnmatch(path.name, file_pattern):
            continue
        
        try:
            content = path.read_text(encoding="utf-8", errors="ignore")
            for i, line in enumerate(content.split("\n"), 1):
                if pattern.search(line):
                    rel_path = path.relative_to(root)
                    results.append(f"{rel_path}:{i}:{line[:200]}")
                    if len(results) >= max_results:
                        break
        except Exception:
            continue
    
    if not results:
        return "No matches found."
    
    return "\n".join(results)


@tool(args_schema=SearchReplaceInput)
def search_replace(path: str, search: str, replace: str) -> str:
    """
    Replace specific text in a file.
    
    Use this for surgical edits to existing files instead of rewriting the whole file.
    The search text must match EXACTLY (including whitespace).
    """
    ctx = get_project_context()
    full_path = Path(ctx.project_path) / path
    
    try:
        if not full_path.exists():
            return format_tool_error(f"File not found: {path}")
        
        content = full_path.read_text(encoding="utf-8")
        
        # Count occurrences
        count = content.count(search)
        
        if count == 0:
            # Show a helpful error with context
            preview = content[:500] if len(content) > 500 else content
            return format_tool_error(
                f"Search text not found in {path}",
                f"Make sure the text matches exactly.\n\nFile preview:\n{preview}"
            )
        
        # Perform replacement
        new_content = content.replace(search, replace)
        full_path.write_text(new_content, encoding="utf-8")
        
        logger.info("Search-replace completed", path=path, replacements=count)
        return format_tool_success(
            f"Replaced {count} occurrence(s) in {path}",
            f"Changed:\n- {search[:100]}...\n+ {replace[:100]}..." if len(search) > 100 else None
        )
    
    except Exception as e:
        logger.error("Failed to search-replace", path=path, error=str(e))
        return format_tool_error(f"Failed to edit {path}", str(e))


@tool(args_schema=AddDependencyInput)
def add_dependency(packages: str, dev: bool = False) -> str:
    """
    Add npm packages to the project.
    
    Automatically detects package manager (npm, yarn, pnpm) and runs the appropriate command.
    """
    ctx = get_project_context()
    project_path = Path(ctx.project_path)
    
    try:
        # Detect package manager
        if (project_path / "pnpm-lock.yaml").exists():
            cmd = ["pnpm", "add"]
            if dev:
                cmd.append("-D")
        elif (project_path / "yarn.lock").exists():
            cmd = ["yarn", "add"]
            if dev:
                cmd.append("-D")
        else:
            cmd = ["npm", "install"]
            if dev:
                cmd.append("--save-dev")
        
        # Add packages
        package_list = packages.strip().split()
        cmd.extend(package_list)
        
        logger.info("Adding dependencies", packages=package_list, dev=dev)
        
        result = subprocess.run(
            cmd,
            cwd=ctx.project_path,
            capture_output=True,
            text=True,
            timeout=120,
        )
        
        if result.returncode == 0:
            return format_tool_success(
                f"Successfully installed: {', '.join(package_list)}",
                result.stdout[:500] if result.stdout else None
            )
        else:
            return format_tool_error(
                f"Failed to install packages",
                result.stderr[:500] if result.stderr else "Unknown error"
            )
    
    except subprocess.TimeoutExpired:
        return format_tool_error("Installation timed out (2 minutes)")
    except FileNotFoundError as e:
        return format_tool_error("Package manager not found", str(e))
    except Exception as e:
        logger.error("Failed to add dependency", packages=packages, error=str(e))
        return format_tool_error(f"Failed to add packages", str(e))


# ============================================================
# REGISTER ALL TOOLS
# ============================================================

register_tool(write_file, is_destructive=True)
register_tool(read_file, is_destructive=False)
register_tool(delete_file, is_destructive=True)
register_tool(rename_file, is_destructive=True)
register_tool(list_files, is_destructive=False)
register_tool(search_codebase, is_destructive=False)
register_tool(search_replace, is_destructive=True)
register_tool(add_dependency, is_destructive=True)


# Export all tools
ALL_TOOLS = [
    write_file,
    read_file,
    delete_file,
    rename_file,
    list_files,
    search_codebase,
    search_replace,
    add_dependency,
]
