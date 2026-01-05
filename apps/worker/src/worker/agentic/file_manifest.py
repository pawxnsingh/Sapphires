"""
File Manifest System

Rich metadata system for project files - tracks imports, exports,
component info, and relationships for smarter context selection.

Inspired by open-lovable's file-manifest.ts
"""

import re
from enum import Enum
from pathlib import Path
from dataclasses import dataclass, field
from typing import Literal
import structlog

logger = structlog.get_logger()


# ============================================================
# TYPE DEFINITIONS
# ============================================================


class FileType(str, Enum):
    """Classification of file by purpose."""
    COMPONENT = "component"
    PAGE = "page"
    STYLE = "style"
    CONFIG = "config"
    UTILITY = "utility"
    LAYOUT = "layout"
    HOOK = "hook"
    CONTEXT = "context"
    TYPE = "type"
    CONSTANT = "constant"
    UNKNOWN = "unknown"


@dataclass
class ImportInfo:
    """Information about a single import statement."""
    source: str  # e.g., './Header', 'react', '@/components/Button'
    imports: list[str]  # Named imports
    default_import: str | None = None  # Default import name
    is_local: bool = False  # true if starts with './' or '@/'


@dataclass
class ComponentInfo:
    """React component metadata."""
    name: str
    props: list[str] = field(default_factory=list)
    hooks: list[str] = field(default_factory=list)  # useState, useEffect, etc.
    has_state: bool = False
    child_components: list[str] = field(default_factory=list)


@dataclass
class FileInfo:
    """Complete information about a single file."""
    path: str  # Relative path from project root
    content: str
    file_type: FileType
    imports: list[ImportInfo] = field(default_factory=list)
    exports: list[str] = field(default_factory=list)
    component_info: ComponentInfo | None = None
    last_modified: float = 0


@dataclass
class RouteInfo:
    """Information about an app route/screen."""
    path: str  # Route path (e.g., '/(tabs)/index', '/workout/[id]')
    component: str  # Component file path
    layout: str | None = None


@dataclass
class FileManifest:
    """Complete project manifest with all files and relationships."""
    files: dict[str, FileInfo]
    routes: list[RouteInfo]
    component_tree: dict[str, list[str]]  # file -> files that import it
    entry_point: str
    style_files: list[str]
    project_path: str


# ============================================================
# PARSER FUNCTIONS
# ============================================================


def detect_file_type(path: str, content: str) -> FileType:
    """Detect the type of file based on path and content."""
    path_lower = path.lower()
    
    # By path
    if "/app/" in path or path.startswith("app/"):
        if "_layout" in path:
            return FileType.LAYOUT
        return FileType.PAGE
    
    if "/components/" in path or path.startswith("components/"):
        return FileType.COMPONENT
    
    if "/hooks/" in path or path.startswith("hooks/"):
        return FileType.HOOK
    
    if "/context/" in path or path.startswith("context/"):
        return FileType.CONTEXT
    
    if "/types/" in path or path.startswith("types/"):
        return FileType.TYPE
    
    if "/constants/" in path or path.startswith("constants/"):
        return FileType.CONSTANT
    
    if "/styles/" in path or path.endswith(".css"):
        return FileType.STYLE
    
    if "config" in path_lower or path.endswith(".config.ts") or path.endswith(".config.js"):
        return FileType.CONFIG
    
    # By content - check for React component
    if "export default function" in content or "export function" in content:
        if "return (" in content or "return <" in content:
            return FileType.COMPONENT
    
    return FileType.UNKNOWN


def parse_imports(content: str) -> list[ImportInfo]:
    """Parse import statements from TypeScript/JavaScript content."""
    imports = []
    
    # Pattern 1: import { a, b } from 'source'
    named_pattern = r"import\s*\{([^}]+)\}\s*from\s*['\"]([^'\"]+)['\"]"
    for match in re.finditer(named_pattern, content):
        named = [n.strip().split(" as ")[0] for n in match.group(1).split(",")]
        source = match.group(2)
        imports.append(ImportInfo(
            source=source,
            imports=[n for n in named if n],
            is_local=source.startswith(".") or source.startswith("@/"),
        ))
    
    # Pattern 2: import Default from 'source'
    default_pattern = r"import\s+(\w+)\s+from\s*['\"]([^'\"]+)['\"]"
    for match in re.finditer(default_pattern, content):
        name = match.group(1)
        source = match.group(2)
        # Skip if already captured as named import
        if not any(i.source == source for i in imports):
            imports.append(ImportInfo(
                source=source,
                imports=[],
                default_import=name,
                is_local=source.startswith(".") or source.startswith("@/"),
            ))
    
    # Pattern 3: import Default, { named } from 'source'
    mixed_pattern = r"import\s+(\w+)\s*,\s*\{([^}]+)\}\s*from\s*['\"]([^'\"]+)['\"]"
    for match in re.finditer(mixed_pattern, content):
        default_name = match.group(1)
        named = [n.strip().split(" as ")[0] for n in match.group(2).split(",")]
        source = match.group(3)
        imports.append(ImportInfo(
            source=source,
            imports=[n for n in named if n],
            default_import=default_name,
            is_local=source.startswith(".") or source.startswith("@/"),
        ))
    
    return imports


def parse_exports(content: str) -> list[str]:
    """Parse export statements from TypeScript/JavaScript content."""
    exports = []
    
    # export default
    if re.search(r"export\s+default", content):
        exports.append("default")
    
    # export const/function/class Name
    for match in re.finditer(r"export\s+(?:const|let|function|class|type|interface)\s+(\w+)", content):
        exports.append(match.group(1))
    
    # export { a, b, c }
    for match in re.finditer(r"export\s*\{([^}]+)\}", content):
        names = [n.strip().split(" as ")[0] for n in match.group(1).split(",")]
        exports.extend([n for n in names if n])
    
    return list(set(exports))


def parse_component_info(content: str, file_path: str) -> ComponentInfo | None:
    """Extract React component metadata from file content."""
    # Check if it's a component
    if not ("function" in content and "return" in content):
        return None
    
    # Extract component name from default export
    match = re.search(r"export\s+default\s+function\s+(\w+)", content)
    if not match:
        match = re.search(r"function\s+(\w+)\s*\([^)]*\)\s*\{[^}]*return\s*[\(<]", content, re.DOTALL)
    
    if not match:
        # Use filename as fallback
        name = Path(file_path).stem
        if name.startswith("["):
            name = name[1:-1]  # Remove brackets from dynamic routes
    else:
        name = match.group(1)
    
    # Find hooks used
    hooks = []
    hook_pattern = r"\b(use\w+)\s*\("
    for match in re.finditer(hook_pattern, content):
        hook = match.group(1)
        if hook not in hooks:
            hooks.append(hook)
    
    has_state = "useState" in content or "useReducer" in content
    
    # Find child components (JSX tags that start with uppercase)
    child_pattern = r"<([A-Z][a-zA-Z0-9]*)"
    children = list(set(re.findall(child_pattern, content)))
    
    return ComponentInfo(
        name=name,
        hooks=hooks,
        has_state=has_state,
        child_components=children[:10],  # Limit
    )


def parse_routes(files: dict[str, FileInfo], project_path: str) -> list[RouteInfo]:
    """Extract routes from Expo Router / Next.js app directory structure."""
    routes = []
    
    for file_path, info in files.items():
        if not file_path.startswith("app/"):
            continue
        
        if info.file_type not in [FileType.PAGE, FileType.LAYOUT]:
            continue
        
        # Convert file path to route
        route_path = file_path.replace("app/", "/").replace(".tsx", "").replace(".ts", "")
        route_path = route_path.replace("/index", "").replace("/(tabs)", "")
        
        if not route_path:
            route_path = "/"
        
        # Find layout
        layout = None
        dir_path = Path(file_path).parent
        layout_file = str(dir_path / "_layout.tsx")
        if layout_file in files and layout_file != file_path:
            layout = layout_file
        
        routes.append(RouteInfo(
            path=route_path,
            component=file_path,
            layout=layout,
        ))
    
    return routes


# ============================================================
# MANIFEST BUILDER
# ============================================================


def build_file_manifest(project_path: str) -> FileManifest:
    """
    Build a complete file manifest for a project.
    
    Scans all TypeScript/JavaScript files and extracts:
    - File types (component, page, hook, etc.)
    - Import/export relationships
    - Component metadata
    - Route information
    """
    root = Path(project_path)
    files: dict[str, FileInfo] = {}
    style_files: list[str] = []
    
    # File patterns to scan
    patterns = ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js", "**/*.css"]
    ignore = {"node_modules", ".expo", ".git", "dist", "build", ".next"}
    
    all_files: list[Path] = []
    for pattern in patterns:
        all_files.extend(root.glob(pattern))
    
    # Filter ignored
    all_files = [f for f in all_files if not any(i in f.parts for i in ignore)]
    
    # Parse each file
    for file_path in all_files:
        try:
            rel_path = str(file_path.relative_to(root))
            content = file_path.read_text(encoding="utf-8", errors="ignore")
            
            # Track CSS files separately
            if rel_path.endswith(".css"):
                style_files.append(rel_path)
                continue
            
            file_type = detect_file_type(rel_path, content)
            imports = parse_imports(content)
            exports = parse_exports(content)
            component_info = parse_component_info(content, rel_path)
            
            files[rel_path] = FileInfo(
                path=rel_path,
                content=content,
                file_type=file_type,
                imports=imports,
                exports=exports,
                component_info=component_info,
                last_modified=file_path.stat().st_mtime,
            )
        except Exception as e:
            logger.warning("Failed to parse file", path=str(file_path), error=str(e))
    
    # Build component tree (who imports what)
    component_tree: dict[str, list[str]] = {path: [] for path in files}
    
    for file_path, info in files.items():
        for imp in info.imports:
            if imp.is_local:
                resolved = resolve_import(file_path, imp.source, files, root)
                if resolved and resolved in component_tree:
                    component_tree[resolved].append(file_path)
    
    # Parse routes
    routes = parse_routes(files, project_path)
    
    # Find entry point
    entry_candidates = ["app/_layout.tsx", "App.tsx", "src/App.tsx", "index.tsx"]
    entry_point = next((e for e in entry_candidates if e in files), "")
    
    logger.info(
        "File manifest built",
        file_count=len(files),
        route_count=len(routes),
        style_count=len(style_files),
    )
    
    return FileManifest(
        files=files,
        routes=routes,
        component_tree=component_tree,
        entry_point=entry_point,
        style_files=style_files,
        project_path=project_path,
    )


def resolve_import(from_file: str, import_path: str, files: dict, root: Path) -> str | None:
    """Resolve an import path to an actual file path."""
    try:
        from_dir = Path(from_file).parent
        
        if import_path.startswith("@/"):
            resolved = import_path[2:]
        elif import_path.startswith("."):
            parts = []
            for part in (from_dir / import_path).parts:
                if part == "..":
                    if parts:
                        parts.pop()
                elif part != ".":
                    parts.append(part)
            resolved = "/".join(parts)
        else:
            return None
        
        # Try extensions
        for ext in ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"]:
            check = resolved + ext
            if check in files:
                return check
        
        return None
    except Exception:
        return None


# ============================================================
# CONTEXT FORMATTERS
# ============================================================


def format_manifest_for_llm(manifest: FileManifest, max_files: int = 50) -> str:
    """Format the file manifest as context for the LLM."""
    lines = ["## Project Structure\n"]
    
    # Group files by type
    by_type: dict[FileType, list[FileInfo]] = {}
    for info in manifest.files.values():
        by_type.setdefault(info.file_type, []).append(info)
    
    # Pages/Screens
    if FileType.PAGE in by_type:
        lines.append("### Screens/Pages")
        for f in sorted(by_type[FileType.PAGE], key=lambda x: x.path)[:15]:
            comp = f.component_info
            state_info = " (stateful)" if comp and comp.has_state else ""
            lines.append(f"- **{comp.name if comp else f.path}**: `{f.path}`{state_info}")
        lines.append("")
    
    # Components
    if FileType.COMPONENT in by_type:
        lines.append("### Components")
        # Sort by most imported
        components = sorted(
            by_type[FileType.COMPONENT],
            key=lambda x: len(manifest.component_tree.get(x.path, [])),
            reverse=True,
        )
        for f in components[:15]:
            imported_by = manifest.component_tree.get(f.path, [])
            usage = f" (used by {len(imported_by)} files)" if imported_by else ""
            name = f.component_info.name if f.component_info else Path(f.path).stem
            lines.append(f"- **{name}**: `{f.path}`{usage}")
        lines.append("")
    
    # Hooks
    if FileType.HOOK in by_type:
        lines.append("### Hooks")
        for f in by_type[FileType.HOOK][:10]:
            exports = ", ".join(f.exports[:3]) if f.exports else "default"
            lines.append(f"- `{f.path}` exports: {exports}")
        lines.append("")
    
    # Most imported files
    heavily_used = [
        (path, importers)
        for path, importers in manifest.component_tree.items()
        if len(importers) >= 3
    ]
    if heavily_used:
        lines.append("### Most Used Files (change carefully)")
        for path, importers in sorted(heavily_used, key=lambda x: -len(x[1]))[:5]:
            lines.append(f"- `{path}` → imported by {len(importers)} files")
        lines.append("")
    
    # Routes
    if manifest.routes:
        lines.append("### Routes")
        for route in manifest.routes[:10]:
            lines.append(f"- `{route.path}` → `{route.component}`")
    
    return "\n".join(lines)


def get_file_context(manifest: FileManifest, file_paths: list[str]) -> str:
    """Get detailed context for specific files."""
    lines = []
    
    for path in file_paths:
        if path not in manifest.files:
            continue
        
        info = manifest.files[path]
        lines.append(f"### {path}")
        lines.append(f"Type: {info.file_type.value}")
        
        if info.component_info:
            comp = info.component_info
            lines.append(f"Component: {comp.name}")
            if comp.hooks:
                lines.append(f"Hooks: {', '.join(comp.hooks)}")
            if comp.child_components:
                lines.append(f"Children: {', '.join(comp.child_components[:5])}")
        
        importers = manifest.component_tree.get(path, [])
        if importers:
            lines.append(f"Imported by: {', '.join(importers[:5])}")
        
        lines.append(f"```\n{info.content}\n```\n")
    
    return "\n".join(lines)
