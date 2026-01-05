"""
Edit Intent Analyzer

Classifies user requests to determine the type of edit and
select the most relevant files to modify.

Inspired by open-lovable's edit-intent-analyzer.ts
"""

import re
from enum import Enum
from dataclasses import dataclass, field
import structlog

from worker.agentic.file_manifest import FileManifest, FileType

logger = structlog.get_logger()


# ============================================================
# TYPE DEFINITIONS
# ============================================================


class EditType(str, Enum):
    """Classification of user edit requests."""
    UPDATE_COMPONENT = "update_component"  # "change the header", "update button"
    ADD_FEATURE = "add_feature"            # "add a videos page", "create new component"
    FIX_ISSUE = "fix_issue"                # "fix the error", "debug this"
    UPDATE_STYLE = "update_style"          # "change colors", "make it dark"
    REFACTOR = "refactor"                  # "clean up", "reorganize"
    FULL_REBUILD = "full_rebuild"          # "start over", "recreate everything"
    ADD_DEPENDENCY = "add_dependency"      # "install axios", "add library"
    DELETE = "delete"                      # "remove", "delete"
    QUESTION = "question"                  # "how do I", "what is"


@dataclass
class EditIntent:
    """Result of intent analysis."""
    edit_type: EditType
    target_files: list[str]  # Files likely to be edited
    confidence: float  # 0-1 confidence score
    description: str  # Human-readable description
    suggested_context: list[str]  # Additional files to include
    keywords: list[str] = field(default_factory=list)  # Extracted keywords


@dataclass 
class IntentPattern:
    """Pattern for matching user intent."""
    patterns: list[re.Pattern]
    edit_type: EditType
    description: str


# ============================================================
# INTENT PATTERNS
# ============================================================


INTENT_PATTERNS: list[IntentPattern] = [
    # UPDATE_COMPONENT patterns
    IntentPattern(
        patterns=[
            re.compile(r"\b(update|change|modify|edit|tweak|adjust)\s+(the\s+)?(\w+)", re.I),
            re.compile(r"\b(fix)\s+(the\s+)?(\w+)\s+(styling|style|css|layout)", re.I),
            re.compile(r"\b(remove|delete|hide)\s+.*?\s+(button|link|text|element|section)", re.I),
        ],
        edit_type=EditType.UPDATE_COMPONENT,
        description="Modify existing component",
    ),
    
    # ADD_FEATURE patterns
    IntentPattern(
        patterns=[
            re.compile(r"\b(add|create|implement|build)\s+(a\s+)?(new\s+)?(\w+)\s+(page|screen|component|section|feature)", re.I),
            re.compile(r"\b(add)\s+(a\s+)?(\w+)\s+(to)\s+(the\s+)?(\w+)", re.I),
            re.compile(r"\b(include|incorporate)\s+(a\s+)?(\w+)", re.I),
        ],
        edit_type=EditType.ADD_FEATURE,
        description="Add new feature or component",
    ),
    
    # FIX_ISSUE patterns
    IntentPattern(
        patterns=[
            re.compile(r"\b(fix|resolve|debug|repair)\s+(the\s+)?(\w+)?(\s+error|\s+bug|\s+issue)?", re.I),
            re.compile(r"\b(it'?s?\s+)?(not\s+working|broken|crashing)", re.I),
            re.compile(r"\b(error|bug|issue|problem)\b", re.I),
        ],
        edit_type=EditType.FIX_ISSUE,
        description="Fix bug or error",
    ),
    
    # UPDATE_STYLE patterns
    IntentPattern(
        patterns=[
            re.compile(r"\b(change|update|set|make)\s+(the\s+)?(color|theme|style|styling|css|background)", re.I),
            re.compile(r"\b(make\s+it)\s+(dark|light|blue|red|green|bigger|smaller)", re.I),
            re.compile(r"\b(style|restyle)\s+(the\s+)?(\w+)", re.I),
            re.compile(r"\b(dark\s+mode|light\s+mode)\b", re.I),
        ],
        edit_type=EditType.UPDATE_STYLE,
        description="Update styling or theme",
    ),
    
    # REFACTOR patterns
    IntentPattern(
        patterns=[
            re.compile(r"\b(refactor|clean\s+up|reorganize|optimize|improve)\s+(the\s+)?(\w+)?", re.I),
            re.compile(r"\b(make\s+it)\s+(cleaner|better|more\s+efficient)", re.I),
        ],
        edit_type=EditType.REFACTOR,
        description="Refactor or improve code",
    ),
    
    # FULL_REBUILD patterns
    IntentPattern(
        patterns=[
            re.compile(r"\b(start\s+over|from\s+scratch|recreate|rebuild|redesign)\b", re.I),
            re.compile(r"\b(new\s+app|create\s+an?\s+app)\b", re.I),
            re.compile(r"\b(completely\s+new|entirely\s+different)\b", re.I),
        ],
        edit_type=EditType.FULL_REBUILD,
        description="Full rebuild or new app",
    ),
    
    # ADD_DEPENDENCY patterns
    IntentPattern(
        patterns=[
            re.compile(r"\b(install|add)\s+(\w+)\s+(package|library|dependency)", re.I),
            re.compile(r"\b(use|integrate)\s+(\w+)\s+(library|framework)", re.I),
            re.compile(r"\b(npm\s+install|yarn\s+add)\b", re.I),
        ],
        edit_type=EditType.ADD_DEPENDENCY,
        description="Add npm package",
    ),
    
    # DELETE patterns
    IntentPattern(
        patterns=[
            re.compile(r"\b(delete|remove)\s+(the\s+)?(\w+)\s+(file|component|screen|page)", re.I),
            re.compile(r"\b(get\s+rid\s+of)\s+(the\s+)?(\w+)", re.I),
        ],
        edit_type=EditType.DELETE,
        description="Delete file or component",
    ),
    
    # QUESTION patterns
    IntentPattern(
        patterns=[
            re.compile(r"\b(how\s+(do|can|should)\s+i)\b", re.I),
            re.compile(r"\b(what\s+is|what'?s|explain)\b", re.I),
            re.compile(r"\b(why\s+(is|does|doesn'?t))\b", re.I),
            re.compile(r"\?$", re.I),
        ],
        edit_type=EditType.QUESTION,
        description="Question or explanation request",
    ),
]


# ============================================================
# ANALYSIS FUNCTIONS
# ============================================================


def analyze_edit_intent(prompt: str, manifest: FileManifest | None = None) -> EditIntent:
    """
    Analyze a user prompt to determine edit intent.
    
    Args:
        prompt: The user's request
        manifest: Optional file manifest for file targeting
    
    Returns:
        EditIntent with type, target files, and confidence
    """
    prompt_lower = prompt.lower()
    
    # Find matching pattern
    matched_type = EditType.UPDATE_COMPONENT  # Default
    matched_confidence = 0.3
    matched_description = "General update"
    
    for pattern in INTENT_PATTERNS:
        for regex in pattern.patterns:
            if regex.search(prompt):
                matched_type = pattern.edit_type
                matched_confidence = 0.8
                matched_description = pattern.description
                break
        if matched_confidence >= 0.8:
            break
    
    # Extract keywords for file targeting
    keywords = extract_keywords(prompt)
    
    # Find target files
    target_files = []
    suggested_context = []
    
    if manifest:
        target_files, suggested_context = find_target_files(
            keywords, manifest, matched_type
        )
    
    # Adjust confidence based on file matches
    if target_files:
        matched_confidence = min(0.95, matched_confidence + 0.1)
    
    return EditIntent(
        edit_type=matched_type,
        target_files=target_files,
        confidence=matched_confidence,
        description=matched_description,
        suggested_context=suggested_context,
        keywords=keywords,
    )


def extract_keywords(prompt: str) -> list[str]:
    """Extract component/file keywords from prompt."""
    keywords = []
    prompt_lower = prompt.lower()
    
    # Component name patterns
    component_patterns = [
        r"\b(header|footer|nav|navigation|sidebar|menu)\b",
        r"\b(hero|banner|splash|landing)\b",
        r"\b(button|btn|card|modal|dialog|popup)\b",
        r"\b(form|input|textfield|checkbox)\b",
        r"\b(list|table|grid|gallery)\b",
        r"\b(home|about|contact|profile|settings)\b",
        r"\b(auth|login|signup|register)\b",
        r"\b(dashboard|admin|user)\b",
    ]
    
    for pattern in component_patterns:
        matches = re.findall(pattern, prompt_lower)
        keywords.extend(matches)
    
    # Custom component mentions (PascalCase)
    pascal_case = re.findall(r"\b([A-Z][a-z]+(?:[A-Z][a-z]+)*)\b", prompt)
    keywords.extend([k.lower() for k in pascal_case])
    
    # Quoted strings (likely file/component names)
    quoted = re.findall(r"['\"]([^'\"]+)['\"]", prompt)
    keywords.extend([q.lower() for q in quoted])
    
    return list(set(keywords))


def find_target_files(
    keywords: list[str],
    manifest: FileManifest,
    edit_type: EditType,
) -> tuple[list[str], list[str]]:
    """
    Find target files based on keywords and edit type.
    
    Returns:
        Tuple of (target_files, suggested_context)
    """
    target_files = []
    suggested_context = []
    
    # Score each file
    file_scores: dict[str, float] = {}
    
    for file_path, info in manifest.files.items():
        score = 0.0
        
        # Match keywords against filename
        file_name = file_path.lower()
        for keyword in keywords:
            if keyword in file_name:
                score += 2.0
        
        # Match keywords against component name
        if info.component_info:
            comp_name = info.component_info.name.lower()
            for keyword in keywords:
                if keyword in comp_name:
                    score += 3.0
        
        # Match keywords in content (lighter weight)
        content_lower = info.content.lower()
        for keyword in keywords:
            if keyword in content_lower:
                score += 0.5
        
        # Boost by file type for certain edit types
        if edit_type == EditType.UPDATE_STYLE:
            if info.file_type == FileType.STYLE:
                score += 2.0
            if "theme" in file_path.lower() or "color" in file_path.lower():
                score += 1.5
        
        if edit_type == EditType.ADD_FEATURE:
            if info.file_type in [FileType.PAGE, FileType.LAYOUT]:
                score += 1.0
        
        if score > 0:
            file_scores[file_path] = score
    
    # Sort by score and take top files
    sorted_files = sorted(file_scores.items(), key=lambda x: -x[1])
    target_files = [f for f, s in sorted_files[:3] if s >= 1.0]
    
    # Add context files (files that import/are imported by targets)
    for target in target_files[:2]:
        # Files imported by target
        info = manifest.files.get(target)
        if info:
            for imp in info.imports:
                if imp.is_local:
                    for file_path in manifest.files:
                        if imp.source.split("/")[-1] in file_path:
                            if file_path not in target_files and file_path not in suggested_context:
                                suggested_context.append(file_path)
                                break
        
        # Files that import target
        importers = manifest.component_tree.get(target, [])
        for importer in importers[:2]:
            if importer not in target_files and importer not in suggested_context:
                suggested_context.append(importer)
    
    # Limit context
    suggested_context = suggested_context[:5]
    
    return target_files, suggested_context


# ============================================================
# CONTEXT FORMATTERS
# ============================================================


def format_intent_for_llm(intent: EditIntent) -> str:
    """Format intent analysis as context for the LLM."""
    lines = [f"## Edit Intent Analysis\n"]
    
    lines.append(f"**Type**: {intent.edit_type.value.replace('_', ' ').title()}")
    lines.append(f"**Description**: {intent.description}")
    lines.append(f"**Confidence**: {intent.confidence:.0%}")
    
    if intent.keywords:
        lines.append(f"**Keywords**: {', '.join(intent.keywords)}")
    
    if intent.target_files:
        lines.append(f"\n**Target Files** (edit these):")
        for f in intent.target_files:
            lines.append(f"- `{f}`")
    
    if intent.suggested_context:
        lines.append(f"\n**Related Files** (for context):")
        for f in intent.suggested_context:
            lines.append(f"- `{f}`")
    
    # Add behavior hints based on type
    lines.append("\n**Suggested Approach**:")
    
    if intent.edit_type == EditType.UPDATE_COMPONENT:
        lines.append("- Make targeted, surgical changes")
        lines.append("- Preserve existing logic and styling")
        lines.append("- Only modify what's explicitly requested")
    
    elif intent.edit_type == EditType.ADD_FEATURE:
        lines.append("- Create new files as needed")
        lines.append("- Follow existing patterns and conventions")
        lines.append("- Update navigation/routing if adding pages")
    
    elif intent.edit_type == EditType.FIX_ISSUE:
        lines.append("- Read the target file first")
        lines.append("- Identify the root cause")
        lines.append("- Make minimal fix, don't refactor")
    
    elif intent.edit_type == EditType.UPDATE_STYLE:
        lines.append("- Focus on styling only")
        lines.append("- Check for theme/constants files first")
        lines.append("- Maintain consistency with existing design")
    
    elif intent.edit_type == EditType.FULL_REBUILD:
        lines.append("- Delete old scaffold files first")
        lines.append("- Create comprehensive app structure")
        lines.append("- Include all necessary components")
    
    return "\n".join(lines)


def should_use_fast_apply(intent: EditIntent) -> bool:
    """Determine if fast apply mode should be used for this intent."""
    # Fast apply for simple, targeted edits
    if intent.edit_type in [EditType.UPDATE_STYLE, EditType.FIX_ISSUE]:
        if len(intent.target_files) == 1:
            return True
    
    if intent.edit_type == EditType.UPDATE_COMPONENT:
        if intent.confidence >= 0.8 and len(intent.target_files) <= 2:
            return True
    
    return False
