"""
Context Provider Manager

Manages registration and resolution of context providers.
Handles parsing of @provider:query syntax.
"""

import structlog
from typing import Dict, List, Optional
from worker.agentic.context_providers.base import ContextProvider, ContextResult

logger = structlog.get_logger()

class ContextProviderManager:
    """
    Registry for context providers.
    
    Responsibilites:
    1. Register available providers
    2. Parse queries for specific provider calls (e.g. "@web:react hooks")
    3. Aggregate context from multiple sources
    """
    
    def __init__(self):
        self._providers: Dict[str, ContextProvider] = {}
        
    def register(self, provider: ContextProvider) -> None:
        """Register a new context provider."""
        if provider.name in self._providers:
            logger.warning("Overwriting existing provider", name=provider.name)
        
        self._providers[provider.name] = provider
        logger.debug("Registered context provider", name=provider.name)
        
    def get_provider(self, name: str) -> Optional[ContextProvider]:
        """Get a provider by name."""
        return self._providers.get(name)
        
    def resolve_context(self, full_query: str) -> List[ContextResult]:
        """
        Parse a query and fetch context from relevant providers.
        
        Supported formats:
        - "@web:how to use react" -> calls 'web' provider
        - "@design:https://example.com" -> calls 'design' provider
        - "Generic query" -> calls default providers (future)
        """
        results = []
        
        try:
            # Check for explicit provider syntax "@name:query"
            if full_query.startswith("@") and ":" in full_query:
                parts = full_query[1:].split(":", 1)
                provider_name = parts[0]
                query = parts[1].strip()
                
                provider = self.get_provider(provider_name)
                if provider:
                    logger.info("Calling context provider", provider=provider_name, query=query)
                    result = provider.fetch(query)
                    if result:
                        results.append(result)
                else:
                    logger.warning("Unknown context provider referenced", name=provider_name)
            
            # Future: Implicit resolution or default providers
            
        except Exception as e:
            logger.error("Error resolving context", error=str(e))
            
        return results

    def format_context_for_llm(self, results: List[ContextResult]) -> str:
        """Format aggregated context results for the LLM prompt."""
        if not results:
            return ""
            
        blocks = []
        for res in results:
            header = f"## Context: {res.source_type}"
            if "url" in res.metadata:
                header += f" ({res.metadata['url']})"
            
            block = f"{header}\n~~~\n{res.content}\n~~~"
            blocks.append(block)
            
        return "\n\n".join(blocks)
