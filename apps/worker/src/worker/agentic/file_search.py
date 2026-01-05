"""
File Search Executor

Smart file selection based on user prompts. Uses multiple strategies:
1. Keyword matching against filenames and content
2. Component/function name matching
3. Import relationship analysis
4. LLM fallback for ambiguous cases

Inspired by open-lovable's file-search-executor.ts
"""

import re
from dataclasses import dataclass, field
from typing import Literal
import structlog

from worker.agentic.file_manifest import FileManifest, FileInfo, FileType


logger = structlog.get_logger()


# ============================================================
# TYPE DEFINITIONS
# ============================================================


@dataclass
class SearchResult:
    """Result of file search."""
    primary_files: list[str]  # Top files to edit
    context_files: list[str]  # Related files for context
    confidence: float  # 0-1 confidence
    strategy_used: str  # Which strategy found the files


@dataclass
class SearchPlan:
    """Plan for searching files."""
    search_terms: list[str]
    file_patterns: list[str]  # e.g., "*.tsx", "components/*"
    edit_type: str
    reasoning: str


# ============================================================
# KEYWORD EXTRACTION
# ============================================================


def extract_search_terms(prompt: str) -> list[str]:
    """
    Extract meaningful search terms from user prompt.
    
    Extracts:
    - Component names (PascalCase)
    - File names (quoted or with extensions)
    - Feature keywords (header, footer, nav, etc.)
    - Action objects (what is being changed)
    """
    terms = []
    prompt_lower = prompt.lower()
    
    # Extract PascalCase words (likely component names)
    pascal_case = re.findall(r'\b([A-Z][a-z]+(?:[A-Z][a-z]+)+)\b', prompt)
    terms.extend([p.lower() for p in pascal_case])
    
    # Extract quoted strings
    quoted = re.findall(r'["\']([^"\']+)["\']', prompt)
    terms.extend([q.lower() for q in quoted])
    
    # Extract file-like patterns
    files = re.findall(r'\b([\w-]+\.(tsx?|jsx?|css))\b', prompt, re.I)
    terms.extend([f[0].lower() for f in files])
    
    # Extract common component keywords
    component_keywords = {
        'header': ['header', 'navbar', 'nav', 'topbar', 'appbar'],
        'footer': ['footer', 'bottom'],
        'sidebar': ['sidebar', 'sidenav', 'drawer'],
        'hero': ['hero', 'banner', 'splash', 'jumbotron'],
        'button': ['button', 'btn', 'cta'],
        'card': ['card', 'tile', 'box'],
        'form': ['form', 'input', 'field', 'textfield'],
        'modal': ['modal', 'dialog', 'popup', 'overlay'],
        'list': ['list', 'items', 'grid', 'gallery'],
        'table': ['table', 'datatable', 'grid'],
        'tab': ['tab', 'tabs', 'tabbar'],
        'menu': ['menu', 'dropdown'],
        'auth': ['login', 'signin', 'signup', 'register', 'auth'],
        'profile': ['profile', 'user', 'account'],
        'settings': ['settings', 'preferences', 'config'],
        'home': ['home', 'index', 'main', 'landing'],
    }
    
    for category, keywords in component_keywords.items():
        if any(kw in prompt_lower for kw in keywords):
            terms.append(category)
    
    # Extract direct object of action verbs
    action_objects = re.findall(
        r'\b(?:change|modify|update|edit|fix|style|add)\s+(?:the\s+)?([a-z]+)',
        prompt_lower
    )
    terms.extend(action_objects)
    
    return list(set(terms))


def extract_file_patterns(prompt: str) -> list[str]:
    """Extract file path patterns from prompt."""
    patterns = []
    prompt_lower = prompt.lower()
    
    # Check for directory mentions
    if 'component' in prompt_lower:
        patterns.append('components/*')
    if 'screen' in prompt_lower or 'page' in prompt_lower:
        patterns.append('app/*')
    if 'hook' in prompt_lower:
        patterns.append('hooks/*')
    if 'style' in prompt_lower or 'css' in prompt_lower:
        patterns.append('*.css')
    if 'theme' in prompt_lower or 'color' in prompt_lower:
        patterns.append('**/theme*')
        patterns.append('constants/*')
    if 'type' in prompt_lower:
        patterns.append('types/*')
    
    return patterns


# ============================================================
# SEARCH STRATEGIES
# ============================================================


def search_by_filename(terms: list[str], manifest: FileManifest) -> list[tuple[str, float]]:
    """Search files by matching terms to filenames."""
    scores: dict[str, float] = {}
    
    for file_path, info in manifest.files.items():
        score = 0.0
        filename = file_path.lower()
        
        for term in terms:
            # Exact filename match
            if term in filename.split('/')[-1].replace('.tsx', '').replace('.ts', ''):
                score += 3.0
            # Partial match in path
            elif term in filename:
                score += 1.5
        
        if score > 0:
            scores[file_path] = score
    
    return sorted(scores.items(), key=lambda x: -x[1])


def search_by_content(terms: list[str], manifest: FileManifest) -> list[tuple[str, float]]:
    """Search files by matching terms in content."""
    scores: dict[str, float] = {}
    
    for file_path, info in manifest.files.items():
        score = 0.0
        content_lower = info.content.lower()
        
        for term in terms:
            # Count occurrences (capped at 5 to avoid bias)
            count = min(content_lower.count(term), 5)
            score += count * 0.3
        
        # Boost components that export what we're looking for
        if info.component_info:
            comp_name = info.component_info.name.lower()
            for term in terms:
                if term in comp_name:
                    score += 2.0
        
        if score > 0:
            scores[file_path] = score
    
    return sorted(scores.items(), key=lambda x: -x[1])


def search_by_type(file_type: FileType, manifest: FileManifest) -> list[str]:
    """Get all files of a specific type."""
    return [
        path for path, info in manifest.files.items()
        if info.file_type == file_type
    ]


def search_by_imports(target_file: str, manifest: FileManifest) -> list[str]:
    """Find files that import or are imported by target."""
    related = []
    
    # Files that import target
    importers = manifest.component_tree.get(target_file, [])
    related.extend(importers)
    
    # Files that target imports
    info = manifest.files.get(target_file)
    if info:
        for imp in info.imports:
            if imp.is_local:
                for path in manifest.files:
                    if imp.source.split('/')[-1] in path:
                        related.append(path)
                        break
    
    return list(set(related))


# ============================================================
# MAIN SEARCH FUNCTION
# ============================================================


def execute_search(
    prompt: str,
    manifest: FileManifest,
    max_primary: int = 3,
    max_context: int = 5,
) -> SearchResult:
    """
    Execute file search based on user prompt.
    
    Combines multiple strategies:
    1. Filename matching (highest priority)
    2. Content matching
    3. Component name matching
    4. Import relationship expansion
    
    Returns:
        SearchResult with primary files and context files
    """
    # Extract search terms
    terms = extract_search_terms(prompt)
    patterns = extract_file_patterns(prompt)
    
    logger.debug("Search terms extracted", terms=terms, patterns=patterns)
    
    # Run search strategies
    filename_results = search_by_filename(terms, manifest)
    content_results = search_by_content(terms, manifest)
    
    # Combine scores
    combined_scores: dict[str, float] = {}
    
    for path, score in filename_results:
        combined_scores[path] = combined_scores.get(path, 0) + score * 2  # Weight filename higher
    
    for path, score in content_results:
        combined_scores[path] = combined_scores.get(path, 0) + score
    
    # Sort by combined score
    sorted_files = sorted(combined_scores.items(), key=lambda x: -x[1])
    
    # Select primary files
    primary_files = [f for f, s in sorted_files[:max_primary] if s >= 1.0]
    
    # Expand with import relationships
    context_files = []
    for pf in primary_files:
        related = search_by_imports(pf, manifest)
        for r in related:
            if r not in primary_files and r not in context_files:
                context_files.append(r)
    
    context_files = context_files[:max_context]
    
    # Calculate confidence
    if primary_files:
        top_score = combined_scores.get(primary_files[0], 0)
        confidence = min(0.95, 0.5 + top_score * 0.1)
    else:
        confidence = 0.3
    
    # Determine strategy
    if filename_results and filename_results[0][1] >= 2.0:
        strategy = "filename_match"
    elif content_results:
        strategy = "content_search"
    else:
        strategy = "fallback"
    
    logger.info(
        "File search completed",
        primary=primary_files,
        context=context_files,
        confidence=confidence,
        strategy=strategy,
    )
    
    return SearchResult(
        primary_files=primary_files,
        context_files=context_files,
        confidence=confidence,
        strategy_used=strategy,
    )


def create_search_plan(prompt: str) -> SearchPlan:
    """Create a structured search plan from prompt."""
    terms = extract_search_terms(prompt)
    patterns = extract_file_patterns(prompt)
    
    # Determine edit type from prompt
    prompt_lower = prompt.lower()
    if any(w in prompt_lower for w in ['fix', 'error', 'bug']):
        edit_type = 'FIX_ISSUE'
    elif any(w in prompt_lower for w in ['add', 'create', 'new']):
        edit_type = 'ADD_FEATURE'
    elif any(w in prompt_lower for w in ['style', 'color', 'theme', 'css']):
        edit_type = 'UPDATE_STYLE'
    elif any(w in prompt_lower for w in ['refactor', 'clean', 'reorganize']):
        edit_type = 'REFACTOR'
    else:
        edit_type = 'UPDATE_COMPONENT'
    
    reasoning = f"Searching for: {', '.join(terms[:5])}"
    
    return SearchPlan(
        search_terms=terms,
        file_patterns=patterns,
        edit_type=edit_type,
        reasoning=reasoning,
    )


# ============================================================
# CONTEXT FORMATTERS
# ============================================================


def format_search_results_for_llm(result: SearchResult, manifest: FileManifest) -> str:
    """Format search results as context for the LLM."""
    lines = ["## File Search Results\n"]
    
    lines.append(f"**Strategy**: {result.strategy_used}")
    lines.append(f"**Confidence**: {result.confidence:.0%}")
    
    if result.primary_files:
        lines.append("\n### Primary Files (edit these)")
        for path in result.primary_files:
            info = manifest.files.get(path)
            if info:
                comp = info.component_info
                name = comp.name if comp else path.split('/')[-1]
                lines.append(f"- **{name}**: `{path}`")
    else:
        lines.append("\n⚠️ No specific files identified - may need full context")
    
    if result.context_files:
        lines.append("\n### Related Files (for reference)")
        for path in result.context_files[:5]:
            lines.append(f"- `{path}`")
    
    return "\n".join(lines)


def get_targeted_file_contents(
    result: SearchResult,
    manifest: FileManifest,
    max_content_length: int = 10000,
) -> str:
    """Get contents of targeted files for the LLM."""
    lines = []
    total_length = 0
    
    # Primary files first (full content)
    for path in result.primary_files:
        info = manifest.files.get(path)
        if info and total_length < max_content_length:
            content = info.content
            if total_length + len(content) > max_content_length:
                content = content[:max_content_length - total_length] + "\n... (truncated)"
            
            lines.append(f"### {path}")
            lines.append(f"```typescript\n{content}\n```\n")
            total_length += len(content)
    
    # Context files (summarized)
    if total_length < max_content_length * 0.8:
        for path in result.context_files[:3]:
            info = manifest.files.get(path)
            if info:
                # Just show first 50 lines
                preview = "\n".join(info.content.split("\n")[:50])
                if len(info.content.split("\n")) > 50:
                    preview += "\n// ... more content"
                
                if total_length + len(preview) < max_content_length:
                    lines.append(f"### {path} (context)")
                    lines.append(f"```typescript\n{preview}\n```\n")
                    total_length += len(preview)
    
    return "\n".join(lines)
