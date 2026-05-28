from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ApplyOS"
    database_url: str = "sqlite:///./applyos.db"
    app_secret: str = "dev-only-replace-before-deploy"
    openai_api_key: str | None = None
    openai_model: str = "gpt-4.1-mini"
    allowed_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(env_file=".env.local", extra="ignore")

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def has_real_openai_key(self) -> bool:
        if self.openai_api_key is None:
            return False
        key = self.openai_api_key.strip()
        return key.startswith("sk-") and "replace" not in key.lower()


@lru_cache
def get_settings() -> Settings:
    return Settings()
