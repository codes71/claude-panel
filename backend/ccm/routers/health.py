from fastapi import APIRouter

from ccm.config import settings
from ccm.models.common import HealthCheck

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthCheck)
async def health_check():
    return HealthCheck(claude_home=str(settings.claude_home))
