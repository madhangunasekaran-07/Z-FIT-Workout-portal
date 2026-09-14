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

## Phase 3: Machine Learning & Performance Progression Engine

Z Fit includes an explainable machine learning and algorithmic inference layer powered by `scikit-learn` and `numpy`. It analyzes real user workout histories chronologically to forecast strength adaptation, detect plateaus, and recommend personalized next-session loads without breaking progressive overload principles.

### Key ML Capabilities

1. **Strength & Performance Forecasting (`fit_and_predict_progress`)**
   - Employs **Ridge Regression** (`alpha=1.0`) for small-to-moderate historical datasets (>= 3 sessions) and **Random Forest Regressor** when rich longitudinal data is available.
   - Extracts 22 chronological features per session (prior weights, volume, rep counts, moving averages, fatigue indicators) without lookahead leakage.
   - Strict safety bounds: predicted weights are clamped to `[-15%, +10%]` of recent performance and rounded to standard gym plate increments (1.25kg for upper body, 2.5kg for lower body).
   - Generates plain-language, explainable narratives justifying the prediction.

2. **Personalized Workout Recommendations (`generate_workout_recommendation`)**
   - Conservative micro-loading rules:
     - **Conservative Increase**: If athlete completed target reps with healthy RPE, recommend +1.25kg (upper) or +2.5kg (lower).
     - **Maintain / Volume Focus**: If target reps met but RPE was high (>= 9), recommend maintaining load to solidify mechanics.
     - **Rep Recovery**: If reps were missed or high fatigue detected, recommend maintaining or slightly lowering weight until rep targets are consistently hit.

3. **Training Plateau Detection (`detect_exercise_plateau`)**
   - Evaluates consecutive recent sessions (3-5 sessions) for weight variance (`<= 2.5%`), rep difference (`<= 1`), and volume coefficient of variation (`<= 4%`).
   - Flags stagnated movements with constructive coaching suggestions (e.g. rep range variation, tempo changes, or scheduled deload).

4. **Fatigue Signals (`evaluate_fatigue_signal`)**
   - Monitors acute volume drops (`> 15%` drop vs 3-session rolling baseline).
   - Surfaces severity levels (`mild`, `moderate`, `high`) using non-medical terminology to prompt recovery awareness.

5. **Data Sufficiency & Graceful Fallbacks**
   - Strictly enforces a minimum threshold of **3 completed sessions** for an exercise before activating ML models.
   - For athletes with fewer than 3 sessions, displays an informative unlock progression banner and uses conservative rule-based baselines (`is_ml_prediction: false`).

6. **Gym-Wide Admin Progression Intelligence**
   - Coaches and gym admins can track gym-wide overload rate (`% athletes improving`), detect athletes facing stagnation, and review live fatigue signals on the Admin Command Center (`/admin` -> AI Progression).

### ML API Endpoints

| Endpoint | Method | Role | Description |
| :--- | :--- | :--- | :--- |
| `/api/ml/progress` | `GET` | Customer | Full ML dashboard (predictions, recommendations, insights, plateaus, fatigue) |
| `/api/ml/recommendations` | `GET` | Customer | List of next-session load and rep recommendations for assigned exercises |
| `/api/ml/insights` | `GET` | Customer | Performance insight cards, detected plateaus, and fatigue signals |
| `/api/ml/exercises/{id}/prediction` | `GET` | Customer | Deep-dive forecast and historical progression curve for a single exercise |
| `/api/ml/admin/analytics` | `GET` | Admin | Gym-wide progression surveillance and coach decision support |

---

## Automated Testing

Run the full integration and ML test suite (89 passing tests):
```powershell
cd backend
.\venv\Scripts\pytest.exe -v
```
The test suite covers:
- **Phase 1**: Authentication, JWT tokens, RBAC, sequence advancement, rest days, program assignment.
- **Phase 2**: Analytics, volume calculations, PR tracking, streak logic, workout history detail.
- **Phase 3**: Feature engineering, Ridge/RF model fitting, recommendation rules, plateau detection, fatigue thresholds, in-memory caching, API endpoints, and admin surveillance.

---

## Technology Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, Lucide Icons, Recharts (Area, Bar, ComposedChart, ReferenceDot), Canvas-Confetti, Axios.
- **Backend**: Python 3.12, FastAPI, SQLAlchemy 2.0, Pydantic v2, Passlib (bcrypt), Python-Jose (JWT), Scikit-Learn 1.9, NumPy 2.5.
- **Database**: Dual-compatible PostgreSQL / SQLite ORM schema.
