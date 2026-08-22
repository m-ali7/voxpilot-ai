# VoxPilot AI

Enterprise voice copilot. This repository contains the legacy Streamlit prototype
(`app.py`, `src/`) and the new production-oriented FastAPI backend (`backend/`).

## Current state

Phase 0 of the migration to an enterprise AI assistant platform:

- `backend/` — FastAPI service (layered architecture: api → services → domain → infra).
- `app.py` / `src/` — legacy Streamlit prototype, preserved for behavioural parity and
  removed only after React/FastAPI parity is achieved.
- `docker-compose.yml` — PostgreSQL + pgvector and the backend service.

## Layout

```
backend/
├── app/
│   ├── api/        # routers + dependency injection
│   ├── core/       # config, db, logging, errors
│   ├── domain/     # ORM models + ports (interfaces)
│   ├── infra/      # adapters: OpenAI, ElevenLabs, demo business context
│   ├── schemas/    # Pydantic request/response models
│   └── services/   # orchestrator + use cases
├── alembic/        # database migrations
└── tests/          # pytest suite
```

## Local development

Prerequisites: Docker Desktop, `uv`.

```bash
cp .env.example .env          # fill in API keys (or use existing .env)
docker compose up -d postgres # start the database
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Or run the full stack:

```bash
docker compose up --build
```

## API

- `GET /health` — liveness
- `GET /health/ready` — readiness (includes database check)
- `POST /sessions` — create a session
- `GET /sessions` — list sessions
- `POST /sessions/{id}/turn` — run a turn (text in, voice out)

Interactive docs: `http://localhost:8000/docs`

## Quality

```bash
make test
make lint
make typecheck
```
