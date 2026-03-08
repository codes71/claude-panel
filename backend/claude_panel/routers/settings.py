from fastapi import APIRouter, HTTPException

from claude_panel.models.settings import EnvVarUpdate
from claude_panel.services import settings_service

router = APIRouter(tags=["settings"])


@router.get("/settings")
async def get_settings():
    return settings_service.read_settings()


@router.put("/settings")
async def put_settings(data: dict):
    settings_service.write_settings(data)
    return settings_service.read_settings()


@router.patch("/settings")
async def patch_settings(updates: dict):
    return settings_service.update_settings(updates)


@router.get("/settings/env")
async def get_env_vars():
    return settings_service.get_env_vars()


@router.put("/settings/env")
async def update_env_vars(updates: list[EnvVarUpdate]):
    changes = {u.key: u.value for u in updates}
    return settings_service.update_env_vars(changes)


@router.patch("/settings/env")
async def patch_env_vars(updates: list[EnvVarUpdate]):
    changes = {u.key: u.value for u in updates}
    return settings_service.update_env_vars(changes)
