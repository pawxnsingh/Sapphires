"""
Fast Apply Module

For quick, single-file edits using a faster model.
This is a stub for future implementation.
"""

from typing import Optional
from worker.agentic.file_manifest import FileManifest
from worker.agentic.intent_analyzer import EditIntent, EditType

def should_use_fast_apply(intent: EditIntent, manifest: FileManifest) -> bool:
    """
    Determine if fast apply should be used.
    
    Criteria:
    1. Single target file
    2. Simple edit type (UPDATE_STYLE, FIX_ISSUE)
    3. Small file size
    """
    if len(intent.target_files) != 1:
        return False
        
    if intent.edit_type not in [EditType.UPDATE_STYLE, EditType.FIX_ISSUE]:
        return False
        
    target = intent.target_files[0]
    info = manifest.files.get(target)
    
    # Only for files < 300 lines
    if info and info.content.count('\n') > 300:
        return False
        
    return True

def get_fast_model() -> str:
    """Return the model ID for fast edits."""
    return "claude-3-haiku-20240307"
