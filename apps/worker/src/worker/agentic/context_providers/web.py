"""
Web Search Provider

Fetches live information from the web.
Uses duckduckgo-search for keyless searching.
"""

import structlog
from typing import Any
from worker.agentic.context_providers.base import ContextProvider, ContextResult

logger = structlog.get_logger()

class WebSearchProvider(ContextProvider):
    """
    Provider for live web searches.
    Usage: @web:query
    """
    
    @property
    def name(self) -> str:
        return "web"
        
    @property
    def description(self) -> str:
        return "Search the web for up-to-date information"
    
    def fetch(self, query: str) -> ContextResult | None:
        try:
            from duckduckgo_search import DDGS
            
            logger.info("Searching web", query=query)
            with DDGS() as ddgs:
                # Get top 3 text results
                results = list(ddgs.text(query, max_results=3))
                
            if not results:
                return None
                
            # Format results
            content_lines = []
            sources = []
            
            for i, res in enumerate(results, 1):
                title = res.get("title", "No Title")
                href = res.get("href", "")
                body = res.get("body", "")
                
                content_lines.append(f"### {i}. {title}")
                content_lines.append(f"URL: {href}")
                content_lines.append(f"Summary: {body}\n")
                sources.append(href)
                
            return ContextResult(
                content="\n".join(content_lines),
                source_type="web_search",
                metadata={"query": query, "sources": sources}
            )
            
        except ImportError:
            logger.error("duckduckgo-search not installed")
            return ContextResult(
                content="Error: duckduckgo-search package is missing.",
                source_type="error"
            )
        except Exception as e:
            logger.error("Web search failed", error=str(e))
            return ContextResult(
                content=f"Error performing web search: {str(e)}",
                source_type="error"
            )
