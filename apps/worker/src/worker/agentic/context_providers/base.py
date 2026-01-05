"""
Context Provider Protocol

Defines the interface for all external context sources.
Inspired by Continue.dev's @Provider architecture.
"""

from abc import ABC, abstractmethod
from typing import NamedTuple, Any

class ContextResult(NamedTuple):
    """Result from a context provider."""
    content: str
    source_type: str
    metadata: dict[str, Any] = {}

class ContextProvider(ABC):
    """
    Abstract base class for all context providers.
    
    Providers connect the agent to external information:
    - Web Search (@web)
    - Documentation (@docs)
    - Design Scraper (@design)
    - Codebase Map (@codebase)
    """
    
    @property
    @abstractmethod
    def name(self) -> str:
        """The identifier for this provider (e.g., 'web', 'design')."""
        pass
        
    @property
    @abstractmethod
    def description(self) -> str:
        """Brief description of what this provider does."""
        pass
    
    @abstractmethod
    def fetch(self, query: str) -> ContextResult | None:
        """
        Fetch context based on the query.
        
        Args:
            query: The search query or URL (after the @provider: prefix)
            
        Returns:
            ContextResult if successful, None otherwise.
        """
        pass
