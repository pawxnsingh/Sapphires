"""
Worker Configuration

Environment-based configuration for the LangGraph worker.
"""

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Optional
from functools import lru_cache
from pydantic import RedisDsn
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[2]  # worker/
ENV_FILE = BASE_DIR / ".env"

class Settings(BaseSettings):
    """
    Worker settings loaded from environment variables.
    
    Usage:
        from config import get_settings
        settings = get_settings()
    """
    
    model_config = SettingsConfigDict(
        env_file=str(ENV_FILE),
        env_file_encoding="utf-8",
        extra="ignore",
    )
    
    # ── Jwt Keys ────────────────────────────────────────────────
    jwt_public_key: str
     
    # ── API Keys ────────────────────────────────────────────────
    azure_openai_endpoint: str 
    azure_openai_api_key: str
    azure_openai_api_version: str 
    azure_openai_deployment_name: str
    
    # ── Model Configuration ─────────────────────────────────────
    default_temperature: float = 0.1
    max_tokens: int = 4096
    
    # ── Agent Configuration ─────────────────────────────────────
    max_agent_steps: int = 25
    context_token_limit: int = 50000
    
    # ── Redis Configuration ─────────────────────────────────────
    redis_url: RedisDsn = "redis://localhost:6379"
    redis_ttl_seconds: int = 86400  # 24 hours
    
    # ── Server Configuration ────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8080
    cors_origins: list[str] = ["*"]
    
    # ── Project Storage ─────────────────────────────────────────
    projects_base_path: str = "/tmp/sapphires-worker"
    
    # ── Logging ─────────────────────────────────────────────────
    log_level: str = "INFO"
    log_json: bool = False


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


setting = get_settings()
