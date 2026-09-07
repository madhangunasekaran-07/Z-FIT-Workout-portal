import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import datetime, timezone, timedelta
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from jose import jwt

from app.database.base import Base
from app.core.config import settings
from app.core.deps import get_db
from app.core.security import hash_token, get_password_hash
from app.models.user import User, UserRole
from app.models.password_reset import PasswordResetToken
from app.main import app
from app.services.seed import seed_database

# Use StaticPool with in-memory SQLite so all test threads share state
TEST_DB_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_DB_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSession = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSession()
    seed_database(db)
    db.close()
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

# ==================== 1. LOGIN TESTS ====================

def test_login_successful_admin():
    res = client.post("/api/auth/login", json={
        "email": "admin@zfit.com",
        "password": "Admin@123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "ADMIN"
    assert "access_token" in data
    assert data["user"]["email"] == "admin@zfit.com"

def test_login_successful_customer():
    res = client.post("/api/auth/login", json={
        "email": "customer@zfit.com",
        "password": "Customer@123"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["role"] == "CUSTOMER"
    assert "access_token" in data
    assert data["user"]["email"] == "customer@zfit.com"

def test_login_invalid_password():
    res = client.post("/api/auth/login", json={
        "email": "customer@zfit.com",
        "password": "WrongPassword!999"
    })
    assert res.status_code == 401
    assert "Incorrect email or password" in res.json()["detail"]

def test_login_nonexistent_user():
    res = client.post("/api/auth/login", json={
        "email": "nobody@zfit.com",
        "password": "Password@123"
    })
    assert res.status_code == 401
    assert "Incorrect email or password" in res.json()["detail"]

def test_login_inactive_user():
    db = TestingSession()
    inactive_user = User(
        email="inactive@zfit.com",
        hashed_password=get_password_hash("Password@123"),
        full_name="Inactive Athlete",
        role=UserRole.CUSTOMER,
        is_active=False
    )
    db.add(inactive_user)
    db.commit()
    db.close()

    res = client.post("/api/auth/login", json={
        "email": "inactive@zfit.com",
        "password": "Password@123"
    })
    assert res.status_code == 401

# ==================== 2. PROTECTED ENDPOINTS & TOKEN VALIDATION ====================

def test_protected_endpoint_without_token():
    res = client.get("/api/auth/me")
    assert res.status_code == 401

def test_protected_endpoint_with_invalid_token():
    headers = {"Authorization": "Bearer totally_bogus_token_12345"}
    res = client.get("/api/auth/me", headers=headers)
    assert res.status_code == 401
    assert "Could not validate credentials" in res.json()["detail"]

def test_protected_endpoint_with_malformed_sub():
    # Token with non-numeric sub
    payload = {"sub": "not-an-integer", "role": "CUSTOMER", "exp": datetime.now(timezone.utc) + timedelta(minutes=10)}
    token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert res.status_code == 401
    assert "Could not validate credentials" in res.json()["detail"]

def test_protected_endpoint_with_expired_token():
    # Expired token in the past
    payload = {"sub": "1", "role": "CUSTOMER", "exp": datetime.now(timezone.utc) - timedelta(minutes=10)}
    expired_token = jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    res = client.get("/api/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
    assert res.status_code == 401
    assert "Token has expired" in res.json()["detail"]

# ==================== 3. RBAC (ROLE-BASED ACCESS CONTROL) ====================

def test_customer_denied_admin_endpoint():
    cust_res = client.post("/api/auth/login", json={"email": "customer@zfit.com", "password": "Customer@123"})
    cust_token = cust_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {cust_token}"}

    res = client.get("/api/admin/stats", headers=headers)
    assert res.status_code == 403
    assert "Admin privileges required" in res.json()["detail"]

def test_admin_allowed_admin_endpoint():
    admin_res = client.post("/api/auth/login", json={"email": "admin@zfit.com", "password": "Admin@123"})
    admin_token = admin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    res = client.get("/api/admin/stats", headers=headers)
    assert res.status_code == 200
    assert "total_customers" in res.json()

# ==================== 4. LOGOUT & PROFILE ====================

def test_logout_endpoint():
    res = client.post("/api/auth/logout")
    assert res.status_code == 200
    assert "logged out" in res.json()["message"].lower()

def test_update_profile():
    cust_res = client.post("/api/auth/login", json={"email": "customer@zfit.com", "password": "Customer@123"})
    cust_token = cust_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {cust_token}"}

    res = client.put("/api/auth/profile", headers=headers, json={"full_name": "Madhan G. Kumar"})
    assert res.status_code == 200
    assert res.json()["full_name"] == "Madhan G. Kumar"

    # Blank name rejected
    res_blank = client.put("/api/auth/profile", headers=headers, json={"full_name": "   "})
    assert res_blank.status_code == 400

# ==================== 5. CHANGE PASSWORD ====================

def test_change_password_flow():
    # Login as customer
    cust_res = client.post("/api/auth/login", json={"email": "customer@zfit.com", "password": "Customer@123"})
    cust_token = cust_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {cust_token}"}

    # 1. Wrong current password
    res_wrong = client.post("/api/auth/change-password", headers=headers, json={
        "current_password": "WrongPassword@123",
        "new_password": "NewSecretPassword@123",
        "confirm_password": "NewSecretPassword@123"
    })
    assert res_wrong.status_code == 400
    assert "Current password is incorrect" in res_wrong.json()["detail"]

    # 2. Mismatched confirmation
    res_mismatch = client.post("/api/auth/change-password", headers=headers, json={
        "current_password": "Customer@123",
        "new_password": "NewSecretPassword@123",
        "confirm_password": "DifferentPassword@123"
    })
    assert res_mismatch.status_code == 400
    assert "do not match" in res_mismatch.json()["detail"]

    # 3. Same as current password
    res_same = client.post("/api/auth/change-password", headers=headers, json={
        "current_password": "Customer@123",
        "new_password": "Customer@123",
        "confirm_password": "Customer@123"
    })
    assert res_same.status_code == 400
    assert "different from your current password" in res_same.json()["detail"]

    # 4. Weak new password (too short)
    res_short = client.post("/api/auth/change-password", headers=headers, json={
        "current_password": "Customer@123",
        "new_password": "abc1",
        "confirm_password": "abc1"
    })
    assert res_short.status_code == 400
    assert "at least 8 characters" in res_short.json()["detail"]

    # 5. Success
    res_ok = client.post("/api/auth/change-password", headers=headers, json={
        "current_password": "Customer@123",
        "new_password": "UpdatedPassword@2026",
        "confirm_password": "UpdatedPassword@2026"
    })
    assert res_ok.status_code == 200
    assert "Password changed successfully" in res_ok.json()["message"]

    # Verify old password no longer works
    res_old = client.post("/api/auth/login", json={"email": "customer@zfit.com", "password": "Customer@123"})
    assert res_old.status_code == 401

    # Verify new password works
    res_new = client.post("/api/auth/login", json={"email": "customer@zfit.com", "password": "UpdatedPassword@2026"})
    assert res_new.status_code == 200

    # Reset back to Customer@123 so other tests are unaffected
    new_token = res_new.json()["access_token"]
    client.post("/api/auth/change-password", headers={"Authorization": f"Bearer {new_token}"}, json={
        "current_password": "UpdatedPassword@2026",
        "new_password": "Customer@123",
        "confirm_password": "Customer@123"
    })

# ==================== 6. FORGOT & RESET PASSWORD ====================

def test_forgot_password_no_enumeration():
    # Nonexistent user
    res_nonexistent = client.post("/api/auth/forgot-password", json={"email": "nonexistent@zfit.com"})
    assert res_nonexistent.status_code == 200
    assert "password reset instructions have been generated" in res_nonexistent.json()["message"]
    assert res_nonexistent.json()["dev_token"] is None

    # Existing user
    res_existing = client.post("/api/auth/forgot-password", json={"email": "customer@zfit.com"})
    assert res_existing.status_code == 200
    # Both messages are strictly identical!
    assert res_existing.json()["message"] == res_nonexistent.json()["message"]
    # In dev mode, dev_token is provided for easy local testing
    raw_token = res_existing.json()["dev_token"]
    assert raw_token is not None

def test_verify_reset_token():
    # Request a reset token
    res = client.post("/api/auth/forgot-password", json={"email": "customer@zfit.com"})
    token = res.json()["dev_token"]

    # Valid token verification
    res_verify = client.get(f"/api/auth/verify-reset-token?token={token}")
    assert res_verify.status_code == 200
    assert res_verify.json()["valid"] is True
    assert "cu***@zfit.com" in res_verify.json()["email"]

    # Bogus token
    res_bogus = client.get("/api/auth/verify-reset-token?token=bogus_token_1234567890")
    assert res_bogus.status_code == 400
    assert "Invalid or already used" in res_bogus.json()["detail"]

def test_reset_password_expired_token():
    # Create expired token directly in test database
    db = TestingSession()
    user = db.query(User).filter(User.email == "customer@zfit.com").first()
    raw_token = "expired_raw_token_xyz_1234567890"
    expired_record = PasswordResetToken(
        user_id=user.id,
        token_hash=hash_token(raw_token),
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=5),
        is_used=False
    )
    db.add(expired_record)
    db.commit()
    db.close()

    # Attempt verification
    res_verify = client.get(f"/api/auth/verify-reset-token?token={raw_token}")
    assert res_verify.status_code == 400
    assert "expired" in res_verify.json()["detail"].lower()

    # Attempt reset
    res_reset = client.post("/api/auth/reset-password", json={
        "token": raw_token,
        "new_password": "NewValidPassword@2026",
        "confirm_password": "NewValidPassword@2026"
    })
    assert res_reset.status_code == 400
    assert "expired" in res_reset.json()["detail"].lower()

def test_reset_password_single_use_success():
    # Request token
    req_res = client.post("/api/auth/forgot-password", json={"email": "customer@zfit.com"})
    token = req_res.json()["dev_token"]

    # Mismatch passwords rejected
    res_mismatch = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "ResetPass@2026",
        "confirm_password": "DifferentPass@2026"
    })
    assert res_mismatch.status_code == 400
    assert "do not match" in res_mismatch.json()["detail"]

    # Successfully reset password
    res_reset = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "FreshResetPassword@2026",
        "confirm_password": "FreshResetPassword@2026"
    })
    assert res_reset.status_code == 200
    assert "successfully reset" in res_reset.json()["message"]

    # SINGLE-USE TEST: Second attempt with the same token MUST FAIL
    res_reuse = client.post("/api/auth/reset-password", json={
        "token": token,
        "new_password": "AnotherPassword@2026",
        "confirm_password": "AnotherPassword@2026"
    })
    assert res_reuse.status_code == 400
    assert "Invalid or already used" in res_reuse.json()["detail"]

    # Verify login with new password works
    res_login = client.post("/api/auth/login", json={
        "email": "customer@zfit.com",
        "password": "FreshResetPassword@2026"
    })
    assert res_login.status_code == 200

    # Reset back to Customer@123
    new_token = res_login.json()["access_token"]
    client.post("/api/auth/change-password", headers={"Authorization": f"Bearer {new_token}"}, json={
        "current_password": "FreshResetPassword@2026",
        "new_password": "Customer@123",
        "confirm_password": "Customer@123"
    })
