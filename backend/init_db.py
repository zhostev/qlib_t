from sqlalchemy.orm import Session
from app.db.database import engine, Base
from app.models.user import User
from app.models.config import Config
from app.models.experiment import Experiment
from app.models.model_version import ModelVersion
from app.services.auth import get_password_hash

# Create all tables
Base.metadata.create_all(bind=engine)

# Create a session
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Get database URL from settings or use default
DATABASE_URL = "sqlite:///./test.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

db = SessionLocal()

# Check if admin user already exists
admin_user = db.query(User).filter(User.username == "admin").first()

if not admin_user:
    # Create admin user with simple password that won't cause bcrypt issues
    # For development purposes, we'll use a simple password and handle it specially in auth.py
    admin_user = User(username="admin", password_hash="$2b$12$dummyhashfordevelopment")
    db.add(admin_user)
    db.commit()
    print("Admin user created successfully")
else:
    print("Admin user already exists")

db.close()