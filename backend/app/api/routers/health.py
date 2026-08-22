
from fastapi import APIRouter
from sqlalchemy import text

from app.api.deps import DbSession
from app.core.config import get_settings

router = APIRouter(tags=["health"])


@router.get("/health")
async def liveness() -> dict[str, str]:
    settings = get_settings()
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
    }


@router.get("/health/ready")
async def readiness(db: DbSession) -> dict[str, object]:
    database = "ok"
    try:
        await db.execute(text("SELECT 1"))
    except Exception:  # pragma: no cover - depends on runtime DB availability
        database = "unavailable"

    return {
        "status": "ok",
        "checks": {"database": database},
    }
