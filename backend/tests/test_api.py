import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from datetime import date, timedelta
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database.base import Base
from app.core.deps import get_db
from app.main import app
from app.services.seed import seed_database

from sqlalchemy.pool import StaticPool

# Use StaticPool with in-memory SQLite so all connections share the same memory database
TEST_SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    TEST_SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    seed_database(db)
    db.close()
    app.dependency_overrides[get_db] = override_get_db
    yield
    app.dependency_overrides.pop(get_db, None)
    Base.metadata.drop_all(bind=engine)

client = TestClient(app)

def test_admin_login():
    response = client.post("/api/auth/login", json={
        "email": "admin@zfit.com",
        "password": "Admin@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "ADMIN"
    assert "access_token" in data

def test_customer_login():
    response = client.post("/api/auth/login", json={
        "email": "customer@zfit.com",
        "password": "Customer@123"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["role"] == "CUSTOMER"
    assert "access_token" in data

def test_role_enforcement_customer_denied_admin_endpoint():
    cust_res = client.post("/api/auth/login", json={
        "email": "customer@zfit.com",
        "password": "Customer@123"
    })
    cust_token = cust_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {cust_token}"}

    # Customer attempts to view admin stats
    res = client.get("/api/admin/stats", headers=headers)
    assert res.status_code == 403
    assert "Admin privileges required" in res.json()["detail"]

def test_customer_current_workout_and_progression():
    cust_res = client.post("/api/auth/login", json={
        "email": "customer@zfit.com",
        "password": "Customer@123"
    })
    cust_token = cust_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {cust_token}"}

    # Fetch current workout (should be Day 3 Legs from seed)
    curr_res = client.get("/api/workouts/current", headers=headers)
    assert curr_res.status_code == 200
    curr_data = curr_res.json()
    assert curr_data["has_assignment"] is True
    assert curr_data["day_order"] == 3
    assert "Legs" in curr_data["day_name"]
    assert len(curr_data["exercises"]) > 0

    # User completes Day 3
    complete_res = client.post("/api/workouts/complete", headers=headers, json={
        "day_order": 3,
        "duration_seconds": 3600,
        "notes": "Solid squat session",
        "sets": [
            {
                "exercise_id": curr_data["exercises"][0]["exercise_id"],
                "exercise_name": curr_data["exercises"][0]["name"],
                "set_number": 1,
                "target_weight_kg": 90.0,
                "target_reps": 8,
                "actual_weight_kg": 105.0,  # New PR!
                "actual_reps": 8,
                "is_completed": True
            }
        ]
    })
    assert complete_res.status_code == 200
    comp_data = complete_res.json()
    assert comp_data["previous_day_order"] == 3
    assert comp_data["new_day_order"] == 4  # Advanced to Day 4

    # Now verify current workout is Day 4 (Rest Day)
    curr_after = client.get("/api/workouts/current", headers=headers)
    assert curr_after.status_code == 200
    curr_after_data = curr_after.json()
    assert curr_after_data["day_order"] == 4
    assert curr_after_data["is_rest_day"] is True

    # Advance past rest day
    rest_res = client.post("/api/workouts/advance-rest", headers=headers)
    assert rest_res.status_code == 200
    assert rest_res.json()["new_day_order"] == 5

    # Now current day is Day 5
    curr_day5 = client.get("/api/workouts/current", headers=headers)
    assert curr_day5.status_code == 200
    assert curr_day5.json()["day_order"] == 5

def test_progress_and_journey_endpoints():
    cust_res = client.post("/api/auth/login", json={
        "email": "customer@zfit.com",
        "password": "Customer@123"
    })
    cust_token = cust_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {cust_token}"}

    prog_res = client.get("/api/progress", headers=headers)
    assert prog_res.status_code == 200
    prog_data = prog_res.json()
    assert prog_data["has_assignment"] is True
    assert len(prog_data["personal_records"]) > 0
    assert len(prog_data["completion_chart"]) == 4

    journey_res = client.get("/api/progress/journey", headers=headers)
    assert journey_res.status_code == 200
    journey_data = journey_res.json()
    assert len(journey_data) == 7
    # Day 1, 2, 3, 4 should be COMPLETED, Day 5 should be CURRENT
    assert journey_data[0]["status"] == "COMPLETED"
    assert journey_data[1]["status"] == "COMPLETED"
    assert journey_data[2]["status"] == "COMPLETED"
    assert journey_data[3]["status"] == "COMPLETED"
    assert journey_data[4]["status"] == "CURRENT"
    assert journey_data[5]["status"] == "UPCOMING"

def test_admin_customer_management_and_program_assignment():
    admin_res = client.post("/api/auth/login", json={
        "email": "admin@zfit.com",
        "password": "Admin@123"
    })
    admin_token = admin_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {admin_token}"}

    # 1. Admin stats
    stats_res = client.get("/api/admin/stats", headers=headers)
    assert stats_res.status_code == 200
    assert stats_res.json()["total_customers"] >= 1

    # 2. List customers
    cust_list = client.get("/api/admin/customers", headers=headers)
    assert cust_list.status_code == 200
    assert len(cust_list.json()) >= 1

    # 3. Create a new customer
    new_cust = client.post("/api/admin/customers", headers=headers, json={
        "email": "newuser@zfit.com",
        "full_name": "Arun Prakash",
        "password": "Password@123",
        "is_active": True
    })
    assert new_cust.status_code == 200
    new_cust_id = new_cust.json()["id"]

    # 4. Assign program with due date
    today = date.today()
    assign_res = client.post(f"/api/admin/customers/{new_cust_id}/assign-program", headers=headers, json={
        "user_id": new_cust_id,
        "program_id": 1,
        "start_date": str(today),
        "due_date": str(today + timedelta(days=30)),
        "start_day_order": 1
    })
    assert assign_res.status_code == 200

    # 5. Reset progress test
    reset_res = client.post(f"/api/admin/customers/{new_cust_id}/reset-progress", headers=headers, json={
        "new_day_order": 2
    })
    assert reset_res.status_code == 200
    assert reset_res.json()["current_day_order"] == 2
