import os
import sys
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from fastapi.testclient import TestClient
from app.main import app

BASE_URL = "/api"

def test_live_workflow():
    client = TestClient(app)
    print("\n--- 1. Testing Customer Login ---")
    res = client.post(f"{BASE_URL}/auth/login", json={
        "email": "customer@zfit.com",
        "password": "Customer@123"
    })
    assert res.status_code == 200, f"Customer login failed: {res.text}"
    cust_token = res.json()["access_token"]
    cust_headers = {"Authorization": f"Bearer {cust_token}"}
    print(f"Logged in as Customer: {res.json()['user']['full_name']}")

    print("\n--- 2. Fetching Current Workout ---")
    res = client.get(f"{BASE_URL}/workouts/current", headers=cust_headers)
    assert res.status_code == 200, f"Get current workout failed: {res.text}"
    curr = res.json()
    print(f"Current Program: {curr['program_name']}")
    print(f"Current Day: Day {curr['day_order']} - {curr['day_name']} ({curr['day_type']})")
    print(f"Exercises count: {len(curr['exercises'])}")
    print(f"Progress: {curr['completed_days_count']} / {curr['total_program_days']} days, {curr['days_remaining']} days left")
    initial_day = curr['day_order']

    # Explicitly test and handle completed program state
    if curr.get('is_program_completed') or not curr.get('has_assignment') or curr.get('assignment_status') == 'COMPLETED':
        print("\n--- 2b. Verifying Completed Program State ---")
        assert curr.get('is_program_completed') is True
        assert curr.get('has_assignment') is False
        assert curr.get('day_order') is None
        assert len(curr.get('exercises', [])) == 0
        assert curr.get('completed_days_count') == curr.get('total_program_days')
        print("Verified clean completed-program state: has_assignment=False, is_program_completed=True, day_order=None, exercises=[]")

        # Verify /workouts/complete cannot be called on a completed program
        reject_res = client.post(f"{BASE_URL}/workouts/complete", headers=cust_headers, json={
            "day_order": None,
            "duration_seconds": 1800,
            "sets": []
        })
        assert reject_res.status_code == 400
        print(f"Verified /workouts/complete rejection on completed program: {reject_res.json()['detail']}")

        # Reset customer to Day 1 via Admin to test the live completion & sequence progression workflow
        print("\n--- 2c. Resetting Progress via Admin for Progression Verification ---")
        admin_login = client.post(f"{BASE_URL}/auth/login", json={
            "email": "admin@zfit.com",
            "password": "Admin@123"
        })
        assert admin_login.status_code == 200
        admin_tok = admin_login.json()["access_token"]
        admin_hdrs = {"Authorization": f"Bearer {admin_tok}"}

        customers_res = client.get(f"{BASE_URL}/admin/customers", headers=admin_hdrs)
        cust_user = next(c for c in customers_res.json() if c["email"] == "customer@zfit.com")

        reset_res = client.post(
            f"{BASE_URL}/admin/customers/{cust_user['id']}/reset-progress",
            headers=admin_hdrs,
            json={"new_day_order": 1}
        )
        assert reset_res.status_code == 200
        print("Reset customer progress to Day 1.")

        # Re-fetch active workout
        res = client.get(f"{BASE_URL}/workouts/current", headers=cust_headers)
        assert res.status_code == 200
        curr = res.json()
        assert curr['has_assignment'] is True
        assert curr['is_program_completed'] is False
        assert curr['day_order'] == 1
        initial_day = curr['day_order']
        print(f"Resumed Active Workout: Day {curr['day_order']} - {curr['day_name']}")

    print("\n--- 3. Completing Current Workout ---")
    sets_payload = []
    for ex in curr['exercises']:
        sets_payload.append({
            "exercise_id": ex['exercise_id'],
            "exercise_name": ex['name'],
            "set_number": 1,
            "target_weight_kg": 60.0,
            "target_reps": 10,
            "actual_weight_kg": 65.0,
            "actual_reps": 10,
            "is_completed": True
        })

    res = client.post(f"{BASE_URL}/workouts/complete", headers=cust_headers, json={
        "program_day_id": curr['day_id'],
        "day_order": curr['day_order'],
        "duration_seconds": 3300,
        "notes": "Live test completion - sets recorded smoothly",
        "sets": sets_payload
    })
    assert res.status_code == 200, f"Complete workout failed: {res.text}"
    comp_result = res.json()
    print(f"Completion message: {comp_result['message']}")
    print(f"Sequence advanced: Previous Day {comp_result['previous_day_order']} -> Next Day {comp_result['new_day_order']}")

    print("\n--- 4. Checking Automatic Progression & Rest Day Handling ---")
    res = client.get(f"{BASE_URL}/workouts/current", headers=cust_headers)
    assert res.status_code == 200
    next_workout = res.json()
    print(f"New Current Day: Day {next_workout['day_order']} - {next_workout['day_name']}")
    print(f"Is Rest Day: {next_workout['is_rest_day']}")

    if next_workout['is_rest_day']:
        print("Rest Day detected. Triggering [CONTINUE TO NEXT WORKOUT]...")
        res = client.post(f"{BASE_URL}/workouts/advance-rest", headers=cust_headers)
        assert res.status_code == 200
        print(f"Advanced past rest day: New Day {res.json()['new_day_order']}")

        res = client.get(f"{BASE_URL}/workouts/current", headers=cust_headers)
        resumed_workout = res.json()
        print(f"Resumed Training: Day {resumed_workout['day_order']} - {resumed_workout['day_name']}")

    print("\n--- 5. Checking Progress Analytics & Workout Journey ---")
    res = client.get(f"{BASE_URL}/progress", headers=cust_headers)
    assert res.status_code == 200
    progress = res.json()
    print(f"Overall Completion: {progress['overall_completion_percent']}%")
    print(f"Current Streak: {progress['current_streak']} Days")
    print(f"Personal Records count: {len(progress['personal_records'])}")
    print(f"Weekly Completion Chart datapoints: {len(progress['completion_chart'])}")

    res = client.get(f"{BASE_URL}/progress/journey", headers=cust_headers)
    assert res.status_code == 200
    journey = res.json()
    print(f"Workout Journey Roadmap Steps: {len(journey)}")
    for j in journey:
        print(f"  Day {j['day_order']:02d}: {j['day_name']} [{j['status']}]")

    print("\n--- 6. Testing Admin Login & Dashboard ---")
    res = client.post(f"{BASE_URL}/auth/login", json={
        "email": "admin@zfit.com",
        "password": "Admin@123"
    })
    assert res.status_code == 200
    admin_token = res.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("Logged in as Administrator")

    res = client.get(f"{BASE_URL}/admin/stats", headers=admin_headers)
    assert res.status_code == 200
    stats = res.json()
    print(f"Admin Stats: Total Customers={stats['total_customers']}, Active Customers={stats['active_customers']}, Workouts Today={stats['completed_workouts_today']}")
    print(f"Recent Activities: {len(stats['recent_activities'])} events")

    print("\n--- 7. Testing Admin Customer Management ---")
    res = client.get(f"{BASE_URL}/admin/customers", headers=admin_headers)
    assert res.status_code == 200
    customers = res.json()
    target_cust = next((c for c in customers if c["email"] == "customer@zfit.com"), None)
    assert target_cust is not None
    print(f"Customer '{target_cust['full_name']}': Current Day={target_cust['current_day_order']}, Completed Workouts={target_cust['completed_workouts_count']}")

    print("\n--- 8. Security Role-Enforcement Test ---")
    res = client.get(f"{BASE_URL}/admin/customers", headers=cust_headers)
    assert res.status_code == 403, f"Expected 403 Forbidden for customer accessing admin, got {res.status_code}"
    print("Role-based authorization confirmed: Customer denied access to admin routes with 403 Forbidden.")

    print("\n>>> ALL LIVE FULL-STACK WORKFLOW TESTS PASSED SUCCESSFULLY! <<<\n")

if __name__ == "__main__":
    test_live_workflow()
