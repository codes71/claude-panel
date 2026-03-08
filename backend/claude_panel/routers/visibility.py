from fastapi import APIRouter

from claude_panel.services import visibility_service

router = APIRouter(tags=["visibility"])


@router.get("/visibility")
async def get_visibility():
    return visibility_service.get_visibility()
