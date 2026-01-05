"""
Design Context Provider

Fetches design tokens from external URLs using the Node.js scraper.
"""

import subprocess
import json
import structlog
from pathlib import Path
from worker.agentic.context_providers.base import ContextProvider, ContextResult

logger = structlog.get_logger()

class DesignProvider(ContextProvider):
    """
    Provider for design tokens.
    Usage: @design:https://example.com
    """
    
    @property
    def name(self) -> str:
        return "design"
        
    @property
    def description(self) -> str:
        return "Extract design tokens (colors, fonts, layouts) from a website URL"
    
    def fetch(self, query: str) -> ContextResult | None:
        """
        Query is expected to be a URL.
        """
        url = query.strip()
        if not url.startswith("http"):
            logger.warning("Invalid URL for design provider", url=url)
            return None
            
        try:
            scraper_path = Path(__file__).parent.parent / "scraper" / "scraper.ts"
            
            logger.info("Scraping design tokens", url=url)
            
            # Run the Node.js scraper
            result = subprocess.run(
                ["npx", "tsx", str(scraper_path), url],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode != 0:
                logger.error("Scraper failed", error=result.stderr)
                return ContextResult(
                    content=f"Error scraping design: {result.stderr}",
                    source_type="error"
                )
                
            data = json.loads(result.stdout)
            
            # Format output
            content = [f"### Design System from {data.get('title', url)}"]
            
            if data.get('colors'):
                content.append("\n#### Colors")
                for c in data['colors']:
                    content.append(f"- {c}")
                    
            if data.get('fonts'):
                content.append("\n#### Fonts")
                for f in data['fonts']:
                    content.append(f"- {f}")
                    
            if data.get('layout'):
                content.append("\n#### Layout Patterns")
                for l in data['layout']:
                    content.append(f"- {l}")
            
            return ContextResult(
                content="\n".join(content),
                source_type="design_scraper",
                metadata={"url": url, "raw": data}
            )
            
        except Exception as e:
            logger.error("Design provider error", error=str(e))
            return ContextResult(
                content=f"Error processing design request: {str(e)}",
                source_type="error"
            )
