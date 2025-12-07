from functools import lru_cache
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:postgres@localhost:5432/ai_companion"

    # Clerk Authentication
    CLERK_DOMAIN: str = ""
    CLERK_PUBLISHABLE_KEY: str = ""
    CLERK_SECRET_KEY: str = ""

    # Letta AI
    LETTA_BASE_URL: str = "http://localhost:8283"

    # OpenAI (used by Letta)
    OPENAI_API_KEY: str = ""

    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    DEBUG: bool = False

    # CORS
    CORS_ORIGINS: str = "http://localhost:3000"

    @property
    def cors_origins_list(self) -> List[str]:
        """Parse comma-separated CORS origins into a list."""
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def clerk_jwks_url(self) -> str:
        """Get the Clerk JWKS URL for JWT verification."""
        return f"https://{self.CLERK_DOMAIN}/.well-known/jwks.json"

    @property
    def clerk_issuer(self) -> str:
        """Get the expected JWT issuer for Clerk."""
        return f"https://{self.CLERK_DOMAIN}"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()


settings = get_settings()
