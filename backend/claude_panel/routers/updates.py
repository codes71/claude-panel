"""Router for update checking and auto-update."""

from fastapi import APIRouter

from claude_panel.services import update_service

router = APIRouter(tags=["updates"])


@router.get("/updates/check")
async def check_for_update(force: bool = False):
    """Check if a newer version of claude-panel is available on npm."""
    return await update_service.check_for_update(force=force)


@router.post("/updates/apply")
async def apply_update():
    """Attempt to update claude-panel to the latest version."""
    return update_service.apply_update()
