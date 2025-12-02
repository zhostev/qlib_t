#!/usr/bin/env python3
"""
Check users in the database
"""

from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

# Create database connection
DATABASE_URL = os.getenv('DATABASE_URL')
engine = create_engine(DATABASE_URL)

# Check users in the database
with engine.connect() as conn:
    result = conn.execute(text('SELECT id, username, email, role, disabled, created_at FROM users'))
    users = result.fetchall()
    
    print("Users in the database:")
    print(f"{'ID':<5} {'Username':<15} {'Email':<25} {'Role':<15} {'Disabled':<10} {'Created At':<25}")
    print("-" * 100)
    
    for user in users:
        print(f"{user[0]:<5} {user[1]:<15} {user[2] if user[2] else '':<25} {user[3]:<15} {user[4]:<10} {user[5]:<25}")
    
    if not users:
        print("No users found in the database")
