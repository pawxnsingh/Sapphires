"""
Component Tree Analyzer

Parses TypeScript/JavaScript files to extract import relationships
and build a component dependency tree for better context.
"""

import re
from pathlib import Path
from typing import NamedTuple
import structlog

logger = structlog.get_logger()


class ComponentInfo(NamedTuple):
    """Information about a component file."""
    path: str
    name: str
    imports: list[str]  # Files this component imports
    imported_by: list[str]  # Files that import this component
    is_screen: bool  # True if in app/ folder (Expo Router)
    is_component: bool  # True if in components/ folder


class ComponentTree:
    """Represents the component dependency tree."""
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.components: dict[str, ComponentInfo] = {}
        self._build_tree()
    
    def _build_tree(self):
        """Scan project and build the component tree."""
        # Find all TypeScript/JavaScript files
        patterns = ["**/*.tsx", "**/*.ts", "**/*.jsx", "**/*.js"]
        files: list[Path] = []
        
        for pattern in patterns:
            files.extend(self.project_path.glob(pattern))
        
        # Filter out node_modules and other
        ignore = {"node_modules", ".expo", ".git", "dist", "build"}
        files = [
            f for f in files 
            if not any(i in f.parts for i in ignore)
        ]
        
        # First pass: extract imports from each file
        file_imports: dict[str, list[str]] = {}
        
        for file_path in files:
            rel_path = str(file_path.relative_to(self.project_path))
            imports = self._extract_imports(file_path)
            file_imports[rel_path] = imports
        
        # Second pass: build imported_by relationships
        imported_by: dict[str, list[str]] = {rel: [] for rel in file_imports}
        
        for file_path, imports in file_imports.items():
            for imp in imports:
                # Resolve import to actual file
                resolved = self._resolve_import(file_path, imp)
                if resolved and resolved in imported_by:
                    imported_by[resolved].append(file_path)
        
        # Create ComponentInfo for each file
        for rel_path in file_imports:
            name = Path(rel_path).stem
            is_screen = rel_path.startswith("app/")
            is_component = rel_path.startswith("components/")
            
            self.components[rel_path] = ComponentInfo(
                path=rel_path,
                name=name,
                imports=file_imports[rel_path],
                imported_by=imported_by.get(rel_path, []),
                is_screen=is_screen,
                is_component=is_component,
            )
    
    def _extract_imports(self, file_path: Path) -> list[str]:
        """Extract import statements from a file."""
        try:
            content = file_path.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            return []
        
        imports = []
        
        # Match: import ... from '...'  or  import ... from "..."
        # Also match: import('...')  dynamic imports
        patterns = [
            r"import\s+.*?\s+from\s+['\"](.+?)['\"]",
            r"import\s*\(['\"](.+?)['\"]\)",
            r"require\s*\(['\"](.+?)['\"]\)",
        ]
        
        for pattern in patterns:
            matches = re.findall(pattern, content)
            imports.extend(matches)
        
        # Filter to local imports only (starting with . or @/)
        local_imports = [
            imp for imp in imports
            if imp.startswith(".") or imp.startswith("@/")
        ]
        
        return local_imports
    
    def _resolve_import(self, from_file: str, import_path: str) -> str | None:
        """Resolve an import path to an actual file path."""
        try:
            from_dir = Path(from_file).parent
            
            if import_path.startswith("@/"):
                # Path alias - resolve from project root
                resolved = import_path[2:]  # Remove @/
            elif import_path.startswith("."):
                # Relative import - use simpler path joining to avoid going outside project
                try:
                    combined = (from_dir / import_path)
                    # Normalize the path (resolve ..) without making it absolute
                    parts = []
                    for part in combined.parts:
                        if part == "..":
                            if parts:
                                parts.pop()
                        elif part != ".":
                            parts.append(part)
                    resolved = "/".join(parts)
                except Exception:
                    return None
            else:
                return None
            
            # Try different extensions
            extensions = ["", ".tsx", ".ts", ".jsx", ".js", "/index.tsx", "/index.ts"]
            
            for ext in extensions:
                check = resolved + ext
                if check in self.components or (self.project_path / check).exists():
                    return check
            
            return None
        except Exception:
            return None
    
    def get_context_for_files(self, files: list[str]) -> str:
        """Get context about the component relationships for specific files."""
        lines = ["## Component Relationships\n"]
        
        for file in files:
            if file in self.components:
                info = self.components[file]
                lines.append(f"### {info.name} ({file})")
                
                if info.imports:
                    lines.append(f"**Imports**: {', '.join(info.imports[:5])}")
                
                if info.imported_by:
                    lines.append(f"**Used by**: {', '.join(info.imported_by[:5])}")
                
                lines.append("")
        
        return "\n".join(lines)
    
    def get_full_context(self) -> str:
        """Get full component tree context for the LLM."""
        if not self.components:
            return ""
        
        lines = ["\n## Component Relationships\n"]
        
        # Group by type
        screens = [c for c in self.components.values() if c.is_screen]
        components = [c for c in self.components.values() if c.is_component]
        
        if screens:
            lines.append("### Screens (app/)")
            for s in sorted(screens, key=lambda x: x.path)[:10]:
                imported_by = f" ← used by: {', '.join(s.imported_by[:3])}" if s.imported_by else ""
                lines.append(f"- **{s.name}**: {s.path}{imported_by}")
        
        if components:
            lines.append("\n### Components (components/)")
            for c in sorted(components, key=lambda x: len(x.imported_by), reverse=True)[:15]:
                usage = f" (used by {len(c.imported_by)} files)" if c.imported_by else " (unused)"
                lines.append(f"- **{c.name}**: {c.path}{usage}")
        
        # Key relationships
        heavily_used = [c for c in self.components.values() if len(c.imported_by) >= 2]
        if heavily_used:
            lines.append("\n### Most Imported Components")
            for c in sorted(heavily_used, key=lambda x: len(x.imported_by), reverse=True)[:5]:
                lines.append(f"- **{c.name}** is imported by: {', '.join(c.imported_by[:4])}")
        
        return "\n".join(lines)


def build_component_tree(project_path: str) -> ComponentTree:
    """Build and return a component tree for the project."""
    return ComponentTree(project_path)


def get_component_context(project_path: str) -> str:
    """Get component relationship context as a string for the LLM."""
    try:
        tree = build_component_tree(project_path)
        return tree.get_full_context()
    except Exception as e:
        logger.warning("Failed to build component tree", error=str(e))
        return ""
