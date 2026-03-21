# Conflux — Project Scope Management Platform

## How to Run

### Backend (FastAPI)

```bash
cd backend

# 1. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# 2. Install dependencies
pip install -r requirements.txt

# 3. Create .env file
copy .env.example .env
# Edit .env and set your OPENAI_API_KEY (optional — works without it)

# 4. Start the server
uvicorn main:app --reload
```

API runs at: http://localhost:8000
API docs at: http://localhost:8000/docs

---

### Frontend (React)

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

App runs at: http://localhost:5173

---

## Project Structure

```
conflux/
├── backend/
│   ├── main.py              # FastAPI app entry point
│   ├── database.py          # SQLite + SQLAlchemy setup
│   ├── models.py            # Database models
│   ├── schemas.py           # Request/response types (Pydantic)
│   ├── auth.py              # JWT authentication
│   ├── routers/
│   │   ├── auth.py          # /api/auth/*
│   │   ├── projects.py      # /api/projects/*
│   │   ├── baselines.py     # /api/projects/{id}/baseline/*
│   │   ├── change_requests.py  # /api/projects/{id}/change-requests/*
│   │   └── drift.py         # /api/projects/{id}/drift
│   └── services/
│       ├── ai_service.py    # OpenAI impact analysis
│       └── drift_service.py # Drift calculation logic
│
└── frontend/
    └── src/
        ├── api/             # Axios API calls
        ├── store/           # Zustand global state
        ├── types/           # TypeScript interfaces
        ├── components/      # Reusable UI components
        │   ├── ui/          # Button, Input, Badge, Modal...
        │   ├── layout/      # Sidebar, Header, AppLayout
        │   └── dashboard/   # DriftMeter, StatsCard, charts...
        └── pages/           # Full page components
```

## Tech Stack

| Layer     | Technology                              |
|-----------|-----------------------------------------|
| Backend   | Python · FastAPI · SQLAlchemy · SQLite  |
| Auth      | JWT (python-jose) · bcrypt              |
| Frontend  | React 18 · TypeScript · Vite            |
| Styling   | TailwindCSS                             |
| State     | Zustand                                 |
| Charts    | Recharts                                |
| AI        | OpenAI GPT-4o-mini (optional)           |
