import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    """Application settings"""
    # Database settings
    database_url = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    
    # Security settings
    secret_key = os.getenv("SECRET_KEY", "your-secret-key-here")
    algorithm = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Training server settings
    training_server_url = os.getenv("TRAINING_SERVER_URL", "http://ddns.hoo.ink:8000")
    training_server_timeout = int(os.getenv("TRAINING_SERVER_TIMEOUT", "3600"))
    
    # API settings
    api_v1_str = "/api"
    project_name = "QLib AI API"

# Create settings instance
settings = Settings()
