from functools import lru_cache

from claude_panel.config import Settings


@lru_cache
def get_settings() -> Settings:
    return Settings()
