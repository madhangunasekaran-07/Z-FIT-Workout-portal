import os
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Z Fit Workout Portal"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "zfit_super_secret_jwt_key_2026_very_secure_token_change_in_prod")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    RESET_TOKEN_EXPIRE_MINUTES: int = 30  # 30 minutes for password reset tokens
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000")
    
    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    # Dual database support: defaults to SQLite for local development, or PostgreSQL when DATABASE_URL is supplied
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./zfit.db")
    
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "admin@zfit.com")
    ADMIN_PASSWORD: str = os.getenv("ADMIN_PASSWORD", "Admin@123")
    
    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env")

settings = Settings()
