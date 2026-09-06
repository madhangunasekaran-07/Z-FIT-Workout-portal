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
