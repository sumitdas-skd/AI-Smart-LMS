from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from datetime import timedelta
import secrets

from app.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse, Token, ForgotPassword, ResetPassword
from app.services.email import EmailService
from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=UserResponse)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == user_in.email).first()
    if user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    try:
        hashed_pass = get_password_hash(user_in.password)
        new_user = User(
            full_name=user_in.full_name,
            email=user_in.email,
            hashed_password=hashed_pass,
            role=user_in.role
        )
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        return new_user
    except Exception as e:
        import traceback
        raise HTTPException(status_code=500, detail=str(traceback.format_exc()))

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")
    
    access_token = create_access_token(subject=str(user.id))
    # normally we'd make a refresh token too
    return {"access_token": access_token, "refresh_token": "dummy_refresh", "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.post("/forgot-password")
def forgot_password(req: ForgotPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user:
        # Prevent email enumeration mapping
        return {"msg": "If email exists, a reset link was sent."}
        
    token = secrets.token_urlsafe(32)
    user.reset_token = token
    # simplistic expiry strategy
    db.commit()
    
    EmailService.send_reset_password_email(user.email, token)
    return {"msg": "Reset link sent"}

@router.post("/reset-password")
def reset_password(req: ResetPassword, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.reset_token == req.token).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid token")
        
    user.hashed_password = get_password_hash(req.new_password)
    user.reset_token = None
    db.commit()
    return {"msg": "Password reset successfully"}
