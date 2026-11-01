import os
import sys

# Add the parent directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), ".")))

from app.database import SessionLocal
from app.models.user import User
from app.core.security import get_password_hash

def reset_accounts():
    db = SessionLocal()
    try:
        accounts = [
            {"email": "admin@abit.edu.in", "password": "abita1234", "role": "admin", "name": "System Administrator"},
            {"email": "teacher@abit.edu", "password": "teacher123", "role": "teacher", "name": "Professor Smith"},
            {"email": "student@abit.edu", "password": "student123", "role": "student", "name": "Student John User"}
        ]

        for acc in accounts:
            user = db.query(User).filter(User.email == acc["email"]).first()
            hashed_pass = get_password_hash(acc["password"])
            
            if user:
                print(f"Updating existing user: {acc['email']}")
                user.hashed_password = hashed_pass
                user.role = acc["role"]
                user.is_active = True
                user.full_name = acc["name"]
            else:
                print(f"Creating missing user: {acc['email']}")
                user = User(
                    full_name=acc["name"],
                    email=acc["email"],
                    hashed_password=hashed_pass,
                    role=acc["role"],
                    is_active=True
                )
                db.add(user)
        
        db.commit()
        print("\nAll core accounts have been reset successfully!")
        print("Standard Credentials:")
        for acc in accounts:
            print(f"- {acc['role'].capitalize()}: {acc['email']} / {acc['password']}")

    except Exception as e:
        print(f"Error resetting accounts: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    reset_accounts()
