from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from app.core.config import settings
from app.core.deps import get_db, get_current_user
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    validate_password_strength,
    hash_token,
    generate_reset_token,
)
from app.models.user import User, UserRole
from app.models.password_reset import PasswordResetToken
from app.schemas.auth import (
    LoginRequest,
    Token,
    ChangePasswordRequest,
    ForgotPasswordRequest,
    ForgotPasswordResponse,
    VerifyTokenResponse,
    ResetPasswordRequest,
    UpdateProfileRequest,
)
from app.schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_data.email.strip().lower()).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Account is inactive. Please contact your administrator."
        )

    access_token = create_access_token(subject=user.id, role=user.role.value)
    level_name = user.level.name if user.level else None

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value,
        "user": {
            "id": user.id,
            "email": user.email,
            "full_name": user.full_name,
            "role": user.role.value,
            "level_name": level_name,
            "level_id": user.level_id
        }
    }

@router.post("/register", response_model=UserOut)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Validate password strength
    val_err = validate_password_strength(user_in.password)
    if val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=val_err
        )

    existing = db.query(User).filter(User.email == user_in.email.strip().lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists."
        )

    user = User(
        email=user_in.email.strip().lower(),
        hashed_password=get_password_hash(user_in.password),
        full_name=user_in.full_name.strip(),
        role=UserRole.CUSTOMER,  # Self-registration is always CUSTOMER
        is_active=True,
        level_id=user_in.level_id
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me")
def get_me(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "level_name": current_user.level.name if current_user.level else None,
        "level_id": current_user.level_id,
        "created_at": current_user.created_at
    }

@router.put("/profile")
def update_profile(
    req: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    cleaned_name = req.full_name.strip()
    if not cleaned_name:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full name cannot be blank."
        )
    current_user.full_name = cleaned_name
    db.commit()
    db.refresh(current_user)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "role": current_user.role.value,
        "level_name": current_user.level.name if current_user.level else None,
        "level_id": current_user.level_id
    }

@router.post("/change-password")
def change_password(
    req: ChangePasswordRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(req.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect."
        )

    if req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New passwords do not match."
        )

    if req.current_password == req.new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password."
        )

    val_err = validate_password_strength(req.new_password)
    if val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=val_err
        )

    current_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"message": "Password changed successfully."}

@router.post("/forgot-password", response_model=ForgotPasswordResponse)
def forgot_password(
    req: ForgotPasswordRequest,
    db: Session = Depends(get_db)
):
    # Constant response to prevent email enumeration
    uniform_message = "If an account with that email exists, password reset instructions have been generated."
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()

    dev_token = None
    dev_url = None

    if user and user.is_active:
        # Invalidate any previously unused reset tokens for this user
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.is_used == False
        ).update({"is_used": True})

        raw_token = generate_reset_token()
        token_hash = hash_token(raw_token)
        expires_at = datetime.now(timezone.utc) + timedelta(minutes=settings.RESET_TOKEN_EXPIRE_MINUTES)

        reset_token_entry = PasswordResetToken(
            user_id=user.id,
            token_hash=token_hash,
            expires_at=expires_at,
            is_used=False
        )
        db.add(reset_token_entry)
        db.commit()

        if settings.ENVIRONMENT == "development":
            dev_token = raw_token
            dev_url = f"/reset-password?token={raw_token}"
            print(f"\n[DEV AUTH] Password reset link for {user.email}: http://localhost:5173{dev_url}\n")

    return ForgotPasswordResponse(
        message=uniform_message,
        dev_reset_url=dev_url,
        dev_token=dev_token
    )

@router.get("/verify-reset-token", response_model=VerifyTokenResponse)
def verify_reset_token(
    token: str = Query(..., min_length=10),
    db: Session = Depends(get_db)
):
    token_hash = hash_token(token)
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.is_used == False
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used password reset token."
        )

    now_utc = datetime.now(timezone.utc)
    record_exp = record.expires_at
    if record_exp.tzinfo is None:
        record_exp = record_exp.replace(tzinfo=timezone.utc)

    if record_exp < now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new link."
        )

    email = record.user.email if record.user else ""
    masked = ""
    if email and "@" in email:
        parts = email.split("@")
        masked = f"{parts[0][:2]}***@{parts[1]}"

    return VerifyTokenResponse(valid=True, email=masked)

@router.post("/reset-password")
def reset_password(
    req: ResetPasswordRequest,
    db: Session = Depends(get_db)
):
    token_hash = hash_token(req.token)
    record = db.query(PasswordResetToken).filter(
        PasswordResetToken.token_hash == token_hash,
        PasswordResetToken.is_used == False
    ).first()

    if not record:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or already used password reset token."
        )

    now_utc = datetime.now(timezone.utc)
    record_exp = record.expires_at
    if record_exp.tzinfo is None:
        record_exp = record_exp.replace(tzinfo=timezone.utc)

    if record_exp < now_utc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset token has expired. Please request a new link."
        )

    if req.new_password != req.confirm_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match."
        )

    val_err = validate_password_strength(req.new_password)
    if val_err:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=val_err
        )

    user = record.user
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account associated with this token no longer exists."
        )

    user.hashed_password = get_password_hash(req.new_password)
    record.is_used = True
    db.commit()

    return {"message": "Password has been successfully reset. You can now log in with your new password."}

@router.post("/logout")
def logout():
    return {"message": "Successfully logged out."}
