from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    SECRET_KEY: str = "yoursupersecuresecretkeyforjwt"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    DATABASE_URL: str = "sqlite:///./lms.db"
    
    OPENAI_API_KEY: Optional[str] = None
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_API_KEY_2: Optional[str] = None
    GEMINI_API_KEY_3: Optional[str] = None
    DEFAULT_AI_PROVIDER: str = "openai"
    
    APP_ENV: str = "development"
    FRONTEND_URL: str = "http://localhost:5173"
    
    SMTP_HOST: Optional[str] = None
    SMTP_PORT: Optional[int] = 587
    SMTP_USER: Optional[str] = None
    SMTP_PASS: Optional[str] = None

    FIREBASE_STORAGE_BUCKET: Optional[str] = None
    FIREBASE_CREDENTIALS_JSON: Optional[str] = None # JSON string of service account key

    # AI Chat History Retention (Optional days, default None = disabled)
    CHAT_RETENTION_DAYS: Optional[int] = None
    # Maximum AI chat context window history messages to pass
    CHAT_CONTEXT_WINDOW: int = 10

    # Job Query & Synchronization Engine
    ADZUNA_APP_ID: Optional[str] = None
    ADZUNA_APP_KEY: Optional[str] = None
    ADZUNA_COUNTRY: str = "in"
    JOBS_SYNC_INTERVAL_HOURS: int = 4
    CRON_SECRET: Optional[str] = "lms_jobs_cron_secret_key"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"

settings = Settings()
