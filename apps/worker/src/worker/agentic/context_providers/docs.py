"""
Docs Context Provider

Fetches documentation for specific libraries.
"""

import structlog
from worker.agentic.context_providers.web import WebSearchProvider
from worker.agentic.context_providers.base import ContextResult

logger = structlog.get_logger()

class DocsProvider(WebSearchProvider):
    """
    Provider for documentation.
    Usage: @docs:library_name or @docs:query
    Extends WebSearchProvider but specializes query.
    """
    
    @property
    def name(self) -> str:
        return "docs"
        
    @property
    def description(self) -> str:
        return "Search official documentation for libraries"
    
    def fetch(self, query: str) -> ContextResult | None:
        # Enforce searching for documentation
        enhanced_query = f"{query} documentation examples"
        logger.info("Searching docs", query=enhanced_query)
        
        result = super().fetch(enhanced_query)
        
        if result and result.source_type != "error":
            return ContextResult(
                content=result.content,
                source_type="documentation",
                metadata=result.metadata
            )
            
        return result
