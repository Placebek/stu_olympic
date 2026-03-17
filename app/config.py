from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/qr_event_db"
    SECRET_KEY: str = "change-this-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 часа
    UPLOAD_DIR: str = "uploads"
    TOTAL_VARIANTS: int = 5  # Количество вариантов заданий

    class Config:
        env_file = ".env"


settings = Settings()
