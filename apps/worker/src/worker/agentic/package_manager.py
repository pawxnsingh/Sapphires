"""
Package Manager

Detects and installs missing NPM packages.
"""

import subprocess
import structlog

logger = structlog.get_logger()

def auto_install_packages(packages: list[str], project_path: str) -> bool:
    """
    Install a list of packages using npm.
    
    Args:
        packages: List of package names to install
        project_path: Path to the project root
    
    Returns:
        True if installation successful, False otherwise
    """
    if not packages:
        return True
        
    logger.info("Installing missing packages", packages=packages)
    
    try:
        # Check if project has package.json
        if not (Path(project_path) / "package.json").exists():
            logger.warning("No package.json found, skipping install")
            return False
            
        cmd = ["npm", "install", "--save"] + packages
        
        result = subprocess.run(
            cmd,
            cwd=project_path,
            capture_output=True,
            text=True,
            timeout=300 # 5 minutes
        )
        
        if result.returncode == 0:
            logger.info("Packages installed successfully")
            return True
            
        logger.error("Package install failed", output=result.stderr)
        return False
        
    except Exception as e:
        logger.error("Failed to install packages", error=str(e))
        return False

def detect_missing_packages(files: dict[str, str]) -> list[str]:
    """
    Analyze imports in files and compare with package.json to find missing deps.
    (Future implementation)
    """
    return []
