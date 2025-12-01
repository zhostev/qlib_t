import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    """Application settings"""
    # Database settings
    DATABASE_URL = os.getenv("DATABASE_URL")
    
    # Security settings
    SECRET_KEY = os.getenv("SECRET_KEY")
    ALGORITHM = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    
    # Training server settings
    TRAINING_SERVER_URL = os.getenv("TRAINING_SERVER_URL", "http://144.0.23.148:8000")
    TRAINING_SERVER_TIMEOUT = int(os.getenv("TRAINING_SERVER_TIMEOUT", "3600"))
    
    # API settings
    API_V1_STR = "/api"
    PROJECT_NAME = "QLib AI API"

# Create settings instance
settings = Settings()
