# Z Fit — Modern Workout Management & Fitness Progress Portal

**Z Fit** is a production-grade full-stack web application designed for progressive workout tracking and structured fitness program management.

Unlike traditional fitness apps that advance routines merely when the calendar date changes, **Z Fit enforces strict sequence-based progression**. An athlete advances to the next workout day only after logging actual performance and completing their assigned routine. If an athlete misses several days, they resume exactly where they left off without skipping sessions.

---

## Key Features

### Role-Based Access Control (RBAC)
- **Customer / Athlete**: Interactive workout session logger, real-time rest timer, sequential workout journey timeline, performance metrics, weekly consistency charts, and personal records (PRs).
- **Administrator**: Comprehensive management console, customer table, program assignment with start and due dates, visual split builder with reorderable sequence items, master exercise library, workout levels, and progress reset controls.
- **Backend Protected**: Admin endpoints are strictly verified on the backend with JWT roles, not just hidden in the frontend.

### Master Data vs. User Execution Data
- Master routines (Exercises, Programs, Splits, Target Sets/Reps) remain untouched.
- Customer workouts are recorded separately in audit logs (`workout_logs` & `workout_set_logs`) preserving historical performance.

### Dual-Database Compatibility
- Native support for **PostgreSQL** in production via `DATABASE_URL`.
- Seamless zero-configuration **SQLite** fallback for immediate local testing and offline development.

---

## Quick Start Guide

### 1. Default Credentials
| Role | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@zfit.com` | `Admin@123` |
| **Demo Customer** | `customer@zfit.com` | `Customer@123` |

*(You can also use the registration form to create new customer accounts at any time).*

---

### 2. Running Locally

#### Step 1: Start Backend API (FastAPI)
```powershell
cd backend
.\venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
```
*Alternatively, double-click `backend/run_backend.bat` or run `backend/run_backend.ps1`.*
The API documentation is available at `http://127.0.0.1:8000/api/docs`.

#### Step 2: Start Frontend (React + Vite + Tailwind CSS)
```powershell
cd frontend
npm run dev
```
*Alternatively, double-click `frontend/run_frontend.bat` or run `frontend/run_frontend.ps1`.*
The application will be accessible at `http://localhost:5173`.

---

## Automated Testing

Run the integration test suite:
```powershell
cd backend
.\venv\Scripts\pytest.exe tests\test_api.py -v
```
All 6 tests verify authentication, role enforcement, sequence progression, rest day handling, and admin program assignment.

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Canvas-Confetti, Axios.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Passlib (bcrypt), Python-Jose (JWT).
- **Database**: PostgreSQL / SQLite dual-compatible ORM schema.
