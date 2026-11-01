import sys
import os
from sqlalchemy.orm import Session

# Add the parent directory to sys.path to import app modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, engine, Base
from app.models.user import User
from app.core.security import get_password_hash

def create_admin(full_name, email, password):
    db = SessionLocal()
    try:
        # Check if admin already exists
        admin = db.query(User).filter(User.email == email).first()
        
        if admin:
            print(f"User already exists: {email}")
            # Update to admin role and reset password to be sure
            admin.role = "admin"
            admin.hashed_password = get_password_hash(password)
            admin.is_active = True
            db.commit()
            print(f"Updated existing user to admin role and reset password.")
        else:
            admin_user = User(
                full_name=full_name,
                email=email,
                hashed_password=get_password_hash(password),
                role="admin",
                is_active=True
            )
            db.add(admin_user)
            db.commit()
            print(f"Admin user created successfully: {email}")
    except Exception as e:
        print(f"Error creating admin: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Create the requested admin user
    create_admin("LMS Admin", "admin@lms.com", "admin123")
