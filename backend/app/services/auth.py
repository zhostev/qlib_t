from typing import Optional
from sqlalchemy.orm import Session
from app.models.user import User
from app.schemas.auth import UserCreate
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta
from app.db.database import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    # bcrypt can't handle passwords longer than 72 bytes
    password = password[:72]
    return pwd_context.hash(password)

def get_user(db: Session, username: str):
    return db.query(User).filter(User.username == username).first()

def create_user(db: Session, user: UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = User(username=user.username, password_hash=hashed_password)
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

def authenticate_user(db: Session, username: str, password: str):
    # For development purposes, allow admin user with fixed password
    if username == "admin" and password == "admin123":
        # Create admin user if it doesn't exist
        user = get_user(db, username)
        if not user:
            # Use get_password_hash to generate a valid bcrypt hash
            hashed_password = get_password_hash(password)
            user = User(username=username, password_hash=hashed_password, role="admin")
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            # Ensure admin user has admin role
            if user.role != "admin":
                user.role = "admin"
                db.commit()
                db.refresh(user)
        return user
    
    # Normal authentication flow for other users
    user = get_user(db, username)
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
    return encoded_jwt
