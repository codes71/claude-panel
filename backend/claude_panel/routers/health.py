from fastapi import APIRouter

from claude_panel.config import settings
from claude_panel.models.common import HealthCheck

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthCheck)
async def health_check():
    return HealthCheck(claude_home=str(settings.claude_home))
