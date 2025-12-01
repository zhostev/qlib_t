from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings
import os

class Settings(BaseSettings):
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./test.db")
    secret_key: str = os.getenv("SECRET_KEY", "your-secret-key-here")
    algorithm: str = os.getenv("ALGORITHM", "HS256")
    access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
    training_server_url: str = os.getenv("TRAINING_SERVER_URL", "http://ddns.hoo.ink:8000")
    training_server_timeout: int = int(os.getenv("TRAINING_SERVER_TIMEOUT", "3600"))

    class Config:
        env_file = ".env"

settings = Settings()

# Create SQLAlchemy engine with optimized connection pool settings
if settings.database_url.startswith("sqlite"):
    engine = create_engine(
        settings.database_url, 
        connect_args={"check_same_thread": False},
        pool_size=5,  # SQLite doesn't support real connection pooling, but we can set minimal settings
        max_overflow=0,
        pool_pre_ping=True,
        pool_recycle=3600
    )
else:
    # For PostgreSQL/MySQL, use optimized connection pool settings
    engine = create_engine(
        settings.database_url,
        pool_size=10,  # Number of connections to keep open in the pool
        max_overflow=20,  # Maximum number of connections to allow beyond pool_size
        pool_pre_ping=True,  # Check if connection is alive before using it
        pool_recycle=3600,  # Recycle connections after 1 hour
        pool_timeout=30,  # Timeout for getting a connection from the pool
        echo_pool=False,  # Disable pool logging for production
        execution_options={"isolation_level": "READ_COMMITTED"}  # Use appropriate isolation level
    )

# Create session local class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for models
Base = declarative_base()

# Dependency to get database session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
