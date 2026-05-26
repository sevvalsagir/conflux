import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import auth, projects, baselines, change_requests, drift

# Create all tables on startup
Base.metadata.create_all(bind=engine)


def _run_migrations():
    """Idempotent: add any new columns that were introduced after the initial deploy."""
    from sqlalchemy import text, inspect as sa_inspect
    try:
        insp = sa_inspect(engine)
        feature_cols = [c['name'] for c in insp.get_columns('features')]
        cr_cols = [c['name'] for c in insp.get_columns('change_requests')]
        with engine.begin() as conn:
            if 'start_date' not in feature_cols:
                conn.execute(text("ALTER TABLE features ADD COLUMN start_date VARCHAR"))
                print("[migration] Added column: features.start_date")
            if 'assignee_ids' not in feature_cols:
                conn.execute(text("ALTER TABLE features ADD COLUMN assignee_ids JSON"))
                print("[migration] Added column: features.assignee_ids")
            if 'completed_at' not in feature_cols:
                conn.execute(text("ALTER TABLE features ADD COLUMN completed_at VARCHAR"))
                print("[migration] Added column: features.completed_at")
            if 'roadmap_start' not in cr_cols:
                conn.execute(text("ALTER TABLE change_requests ADD COLUMN roadmap_start VARCHAR"))
                print("[migration] Added column: change_requests.roadmap_start")
            if 'roadmap_end' not in cr_cols:
                conn.execute(text("ALTER TABLE change_requests ADD COLUMN roadmap_end VARCHAR"))
                print("[migration] Added column: change_requests.roadmap_end")
    except Exception as e:
        print(f"[migration] Warning: {e}")


_run_migrations()

# Auto-seed demo data if SEED_DEMO=true (Railway demo deployment)
if os.getenv("SEED_DEMO", "").lower() == "true":
    try:
        from seed_demo import seed
        seed()
    except Exception as _seed_err:
        print(f"[seed] Warning: {_seed_err}")

app = FastAPI(
    title="Conflux API",
    description="Project scope management and change control platform",
    version="1.0.0",
)

# CORS — dev: localhost only; production: set CORS_ORIGINS env var
_raw = os.getenv("CORS_ORIGINS", "http://localhost:5173,http://localhost:3000")
origins = [o.strip() for o in _raw.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register all routers
app.include_router(auth.router)
app.include_router(projects.router)
app.include_router(baselines.router)
app.include_router(change_requests.router)
app.include_router(drift.router)


@app.get("/")
def root():
    return {"message": "Conflux API is running. Visit /docs for the API documentation."}
