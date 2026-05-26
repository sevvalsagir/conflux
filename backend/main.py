import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import Base, engine
from routers import auth, projects, baselines, change_requests, drift

# Create all tables on startup
Base.metadata.create_all(bind=engine)

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
