# VoxPilot AI

Enterprise voice copilot. This repository contains the legacy Streamlit prototype
(`app.py`, `src/`) and the new React + FastAPI platform.

## Current state

Phase 1.7 — voice UX polish: fluid amplitude-reactive orb, recoverable empty-speech
handling, and normalized error presentation, on top of the Phase 1.6 conversational
workspace with a simulated enterprise connector.

- `backend/` — FastAPI service (layered architecture: api → services → domain → infra).
- `frontend/` — React + TypeScript voice-first UI (orb, mic capture, intelligence workspace).
- `app.py` / `src/` — legacy Streamlit prototype, preserved for behavioural parity and
  removed only after React/FastAPI parity is fully proven.
- `docker-compose.yml` — PostgreSQL + pgvector and the backend service.

## Layout

```
backend/
├── app/
│   ├── api/        # routers + dependency injection
│   ├── core/       # config, db, logging, errors
│   ├── domain/     # ORM models, intelligence value objects, ports (interfaces)
│   ├── infra/      # adapters: OpenAI, ElevenLabs, integrations (demo project)
│   ├── schemas/    # Pydantic request/response models
│   └── services/   # orchestrator + use cases (multi-turn aware)
├── alembic/        # database migrations
└── tests/          # pytest suite

frontend/
└── src/
    ├── api/        # typed client for the FastAPI backend
    ├── state/      # central assistant state (Zustand)
    ├── hooks/      # microphone capture + amplitude monitoring
    ├── features/   # assistant (orb), conversation, intelligence
    └── components/ # shared UI
```

## Local development

Prerequisites: Docker Desktop, `uv`, Node.js.

```bash
cp .env.example .env          # fill in API keys (or use existing .env)
docker compose up -d postgres # start the database
cd backend
uv sync
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

Frontend (separate terminal):

```bash
cd frontend
npm install
npm run dev                   # http://localhost:5173
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
- `POST /sessions/{id}/transcribe` — transcribe audio (bytes → text)
- `POST /sessions/{id}/turn` — run a turn; returns intent, response, audio URL and
  structured `project` intelligence (metrics, risks, actions, documents, sources)

Interactive docs: `http://localhost:8000/docs`

## Project intelligence

The workspace is populated by an integration connector behind
`ProjectIntelligencePort`. The current implementation is a **demo connector**
(`DemoProjectConnector`, "Project Phoenix") returning clearly-labelled static data.
Real Azure DevOps / ServiceNow / SharePoint / Confluence / Power BI connectors will
implement the same port later without changing the pipeline.

## Voice & media routing

- **Same-origin `/media`**: the backend returns relative `/media/...` audio URLs. In
  development the Vite dev server proxies `/media` to `http://localhost:8000`; in
  production the reverse proxy (nginx) must route `/media` to the backend the same way.
  Same-origin media keeps the Web Audio `MediaElementSource` analyser CORS-clean so the
  orb can react to assistant playback amplitude.
- **Amplitude → orb**: microphone level (`useMicrophone`) and assistant playback level
  (`useAudioAnalyser`) both feed a normalized 0..1 value into `AssistantOrb`, driving
  internal fluid deformation and glow (not whole-orb scaling).
- **Empty speech**: a whitespace-only transcript is intercepted before any turn/LLM/TTS
  call and produces a recoverable "I didn't catch anything…" notice that auto-clears to
  Ready. Raw API/provider errors are normalized to friendly messages (`utils/errors.ts`).

## Streaming architecture (next step)

The current pipeline is synchronous (single `/turn` round-trip). The boundaries are
already shaped for streaming without redesign:

- `LLMPort.generate`, `STTPort.transcribe` and `TTSPort.synthesize` are async ports —
  each can gain a `stream(...) -> AsyncIterator` method and a streaming adapter.
- The frontend state machine (`AssistantState`) is server-agnostic; granular
  `listening → understanding → retrieving → thinking → speaking` transitions currently
  staged client-side will instead be driven by server events.
- Plan: a `/sessions/{id}/stream` WebSocket (or SSE) endpoint emitting
  `transcript_partial`, `token`, `audio_chunk`, `sources` and `state` events; the
  frontend `api/client.ts` gains a streaming transport behind the same interfaces.

## Quality

```bash
make test        # backend pytest
make lint        # backend ruff
make typecheck   # backend mypy
cd frontend && npm run lint && npm run test && npm run build
```
