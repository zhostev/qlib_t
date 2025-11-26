from app.db.database import SessionLocal, engine, Base
from app.models.user import User
from app.services.auth import get_password_hash

# Create all tables
Base.metadata.create_all(bind=engine)

# Create a session
db = SessionLocal()

# Check if admin user already exists
admin_user = db.query(User).filter(User.username == "admin").first()

if not admin_user:
    # Create admin user
    hashed_password = get_password_hash("admin123")
    admin_user = User(username="admin", password_hash=hashed_password)
    db.add(admin_user)
    db.commit()
    print("Admin user created successfully")
else:
    print("Admin user already exists")

db.close()