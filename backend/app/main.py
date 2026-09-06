from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.database.base import Base
from app.database.session import engine, SessionLocal
from app.services.seed import seed_database
# Import models to ensure all metadata is registered
import app.models  # noqa: F401

from app.api.auth import router as auth_router
from app.api.workouts import router as workouts_router
from app.api.progress import router as progress_router
from app.api.exercises import router as exercises_router
from app.api.admin import router as admin_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables if not exist and seed data
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    lifespan=lifespan
)

# Set up CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(workouts_router, prefix=settings.API_V1_STR)
app.include_router(progress_router, prefix=settings.API_V1_STR)
app.include_router(exercises_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)

@app.get("/api/health")
def health_check():
    return {"status": "ok", "app": settings.PROJECT_NAME}
