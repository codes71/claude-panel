"""API endpoints for Claude Code Router dashboard."""

from fastapi import APIRouter

from ccm.services import ccr_service

router = APIRouter(tags=["ccr"])


@router.get("/ccr")
async def get_ccr_dashboard():
    return ccr_service.get_dashboard()


@router.get("/ccr/status")
async def get_ccr_status():
    return ccr_service.get_status()
