
import sys
import os
from sqlalchemy.orm import Session

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.core.security import get_password_hash

def seed_admin():
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin_email = "admin@abit.edu.in"
        admin = db.query(User).filter(User.email == admin_email).first()
        
        if admin:
            print(f"Admin user already exists: {admin_email}")
            # Ensure it has admin role
            if admin.role != "admin":
                admin.role = "admin"
                db.commit()
                print("Updated existing user to admin role.")
        else:
            admin_user = User(
                full_name="System Administrator",
                email=admin_email,
                hashed_password=get_password_hash("abita1234"),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print(f"Admin user created successfully: {admin_email}")
    except Exception as e:
        print(f"Error seeding admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_admin()
