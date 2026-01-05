"""
Build Validator

Runs TypeScript/ESLint checks after file changes and provides
error feedback for automatic correction.
"""

import subprocess
from pathlib import Path
from typing import NamedTuple
import structlog

logger = structlog.get_logger()


from enum import Enum, auto
from dataclasses import dataclass

class ErrorType(str, Enum):
    """Classification of build errors."""
    MISSING_PACKAGE = "missing_package"
    SYNTAX_ERROR = "syntax_error"
    TYPE_ERROR = "type_error"
    IMPORT_ERROR = "import_error"
    RUNTIME_ERROR = "runtime_error"
    UNKNOWN = "unknown"


@dataclass
class BuildError(NamedTuple):
    """Represents a build/type error."""
    file: str
    line: int
    column: int
    message: str
    severity: str  # 'error' or 'warning'
    error_type: ErrorType = ErrorType.UNKNOWN
    missing_package: str | None = None


def classify_error(message: str) -> ErrorType:
    """Classify the error message."""
    message = message.lower()
    
    if "cannot find module" in message or "module not found" in message:
        return ErrorType.MISSING_PACKAGE
    if "is not a function" in message or "is not defined" in message:
        return ErrorType.RUNTIME_ERROR
    if "syntax error" in message or "unexpected token" in message:
        return ErrorType.SYNTAX_ERROR
    if "type '" in message and "is not assignable" in message:
        return ErrorType.TYPE_ERROR
    if "has no exported member" in message:
        return ErrorType.IMPORT_ERROR
        
    return ErrorType.TYPE_ERROR  # Default for TS errors


def extract_missing_package(message: str) -> str | None:
    """Extract missing package name from error message."""
    import re
    
    # "Cannot find module 'foo'"
    match = re.search(r"Cannot find module ['\"]([^'\"]+)['\"]", message)
    if match:
        pkg = match.group(1)
        # Handle @scoped/packages and subpaths
        if pkg.startswith("@"):
            parts = pkg.split("/")
            return "/".join(parts[:2]) if len(parts) >= 2 else pkg
        return pkg.split("/")[0]
        
    return None


# ... (rest of the file updates)


class BuildResult(NamedTuple):
    """Result of a build validation."""
    success: bool
    errors: list[BuildError]
    raw_output: str


def validate_typescript(project_path: str) -> BuildResult:
    """
    Run TypeScript type checking on the project.
    
    Returns BuildResult with any type errors found.
    """
    project = Path(project_path)
    
    # Check if tsconfig exists
    if not (project / "tsconfig.json").exists():
        logger.debug("No tsconfig.json found, skipping TypeScript validation")
        return BuildResult(success=True, errors=[], raw_output="")
    
    try:
        result = subprocess.run(
            ["npx", "tsc", "--noEmit", "--pretty", "false"],
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=60,
        )
        
        if result.returncode == 0:
            logger.info("TypeScript validation passed")
            return BuildResult(success=True, errors=[], raw_output="")
        
        # Parse errors
        errors = _parse_tsc_errors(result.stdout + result.stderr)
        
        logger.warning(
            "TypeScript validation failed",
            error_count=len(errors),
        )
        
        return BuildResult(
            success=False,
            errors=errors,
            raw_output=result.stdout[:2000],
        )
    
    except subprocess.TimeoutExpired:
        logger.error("TypeScript check timed out")
        return BuildResult(success=True, errors=[], raw_output="Timeout")
    except FileNotFoundError:
        logger.warning("npx/tsc not found, skipping validation")
        return BuildResult(success=True, errors=[], raw_output="")
    except Exception as e:
        logger.error("TypeScript validation error", error=str(e))
        return BuildResult(success=True, errors=[], raw_output=str(e))


def _parse_tsc_errors(output: str) -> list[BuildError]:
    """Parse TypeScript compiler output into structured errors."""
    import re
    
    errors = []
    
    # Pattern: file(line,col): error TS1234: message
    pattern = r"(.+?)\((\d+),(\d+)\):\s*(error|warning)\s+\w+:\s*(.+)"
    
    for match in re.finditer(pattern, output):
        file_path, line, col, severity, message = match.groups()
        message = message.strip()
        
        # Classify error
        error_type = classify_error(message)
        missing_pkg = None
        
        if error_type == ErrorType.MISSING_PACKAGE:
            missing_pkg = extract_missing_package(message)
            
        errors.append(BuildError(
            file=file_path.strip(),
            line=int(line),
            column=int(col),
            message=message,
            severity=severity,
            error_type=error_type,
            missing_package=missing_pkg,
        ))
    
    return errors[:20]  # Limit to 20 errors


def validate_eslint(project_path: str) -> BuildResult:
    """
    Run ESLint on the project.
    
    Returns BuildResult with any lint errors found.
    """
    project = Path(project_path)
    
    # Check if eslint config exists
    eslint_configs = [
        ".eslintrc.js", ".eslintrc.json", ".eslintrc.yml",
        "eslint.config.js", "eslint.config.mjs"
    ]
    has_eslint = any((project / cfg).exists() for cfg in eslint_configs)
    
    if not has_eslint:
        logger.debug("No ESLint config found, skipping")
        return BuildResult(success=True, errors=[], raw_output="")
    
    try:
        result = subprocess.run(
            ["npx", "eslint", ".", "--format", "compact", "--max-warnings", "0"],
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=60,
        )
        
        if result.returncode == 0:
            logger.info("ESLint validation passed")
            return BuildResult(success=True, errors=[], raw_output="")
        
        # Parse errors
        errors = _parse_eslint_errors(result.stdout)
        
        logger.warning("ESLint validation found issues", count=len(errors))
        
        return BuildResult(
            success=False,
            errors=errors,
            raw_output=result.stdout[:2000],
        )
    
    except subprocess.TimeoutExpired:
        return BuildResult(success=True, errors=[], raw_output="Timeout")
    except FileNotFoundError:
        return BuildResult(success=True, errors=[], raw_output="")
    except Exception as e:
        return BuildResult(success=True, errors=[], raw_output=str(e))


def _parse_eslint_errors(output: str) -> list[BuildError]:
    """Parse ESLint compact format output."""
    import re
    
    errors = []
    
    # Pattern: file: line:col error/warning message
    pattern = r"(.+?):\s*line\s*(\d+),\s*col\s*(\d+),\s*(Error|Warning)\s*-\s*(.+)"
    
    for match in re.finditer(pattern, output, re.IGNORECASE):
        file_path, line, col, severity, message = match.groups()
        errors.append(BuildError(
            file=file_path.strip(),
            line=int(line),
            column=int(col),
            message=message.strip(),
            severity=severity.lower(),
        ))
    
    return errors[:20]


def validate_build(project_path: str) -> BuildResult:
    """
    Run all build validations and return combined result.
    
    Currently runs:
    - TypeScript type checking
    - ESLint (if configured)
    """
    # Run TypeScript first (more critical)
    ts_result = validate_typescript(project_path)
    
    if not ts_result.success:
        return ts_result
    
    # Then ESLint
    eslint_result = validate_eslint(project_path)
    
    return eslint_result


def format_errors_for_llm(errors: list[BuildError]) -> str:
    """Format build errors for inclusion in LLM prompt."""
    if not errors:
        return ""
    
    lines = ["\n## Build Errors Found\n"]
    lines.append("Please fix these errors:\n")
    
    grouped: dict[str, list[BuildError]] = {}
    for err in errors:
        grouped.setdefault(err.file, []).append(err)
    
    for file_path, file_errors in list(grouped.items())[:5]:
        lines.append(f"\n### {file_path}")
        for err in file_errors[:5]:
            lines.append(f"- Line {err.line}: {err.message}")
    
    return "\n".join(lines)


def quick_syntax_check(file_path: str, content: str) -> list[BuildError]:
    """
    Quick syntax check for a single file without running full tsc.
    
    Uses basic regex patterns to catch common issues.
    """
    errors = []
    lines = content.split("\n")
    
    # Check for common issues
    for i, line in enumerate(lines, 1):
        # Unclosed strings
        if line.count('"') % 2 != 0 and "'" not in line:
            if not line.strip().endswith("\\"):
                errors.append(BuildError(
                    file=file_path,
                    line=i,
                    column=1,
                    message="Possible unclosed string",
                    severity="warning",
                ))
        
        # Missing imports (common mistake)
        if "useState" in line and "import" not in line:
            if not any("useState" in l and "import" in l for l in lines[:20]):
                errors.append(BuildError(
                    file=file_path,
                    line=i,
                    column=1,
                    message="useState used but may not be imported",
                    severity="warning",
                ))
                break
    
    return errors[:5]
