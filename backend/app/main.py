from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.routers import health, sessions, transcribe, turn
from app.api.ws import router as ws_router
from app.core.config import get_settings
from app.core.errors import ProviderError, VoxPilotError
from app.core.logging import configure_logging


def _register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(VoxPilotError)
    async def handle_voxpilot_error(request: Request, exc: VoxPilotError) -> JSONResponse:
        # Provider unavailability (e.g. missing key) is a controlled 503; any
        # other internal application error maps to 500. The detail message is
        # deliberately free of credentials.
        status = 503 if isinstance(exc, ProviderError) else 500
        return JSONResponse(status_code=status, content={"detail": str(exc)})


def create_app() -> FastAPI:
    settings = get_settings()
    configure_logging()

    app = FastAPI(title=settings.app_name, version=settings.version)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    _register_exception_handlers(app)

    settings.output_dir.mkdir(parents=True, exist_ok=True)
    app.mount("/media", StaticFiles(directory=settings.output_dir), name="media")

    app.include_router(health.router)
    app.include_router(sessions.router)
    app.include_router(transcribe.router)
    app.include_router(turn.router)
    app.include_router(ws_router)

    return app


app = create_app()
