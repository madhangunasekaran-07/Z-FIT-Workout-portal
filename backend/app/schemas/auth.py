from typing import Optional
from pydantic import BaseModel, EmailStr

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user: dict

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str
    confirm_password: str

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ForgotPasswordResponse(BaseModel):
    message: str
    dev_reset_url: Optional[str] = None
    dev_token: Optional[str] = None

class VerifyTokenResponse(BaseModel):
    valid: bool
    email: Optional[str] = None

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str
    confirm_password: str

class UpdateProfileRequest(BaseModel):
    full_name: str
