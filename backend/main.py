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
        with engine.begin() as conn:
            if 'start_date' not in feature_cols:
                conn.execute(text("ALTER TABLE features ADD COLUMN start_date VARCHAR"))
                print("[migration] Added column: features.start_date")
            if 'assignee_ids' not in feature_cols:
                conn.execute(text("ALTER TABLE features ADD COLUMN assignee_ids JSON"))
                print("[migration] Added column: features.assignee_ids")
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
