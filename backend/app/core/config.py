import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_key: str = ""
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

    def model_post_init(self, __context):
        # Permitir sobreescribir CORS desde variable de entorno (separado por comas)
        cors_env = os.getenv("CORS_ORIGINS")
        if cors_env:
            self.cors_origins = [origin.strip() for origin in cors_env.split(",")]


settings = Settings()
