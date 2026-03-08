"""Router for multi-instance management."""

from fastapi import APIRouter, HTTPException

from claude_panel.models.instances import InstanceSwitchRequest, InstanceAddRequest
from claude_panel.services import instance_service

router = APIRouter(tags=["instances"])


@router.get("/instances")
async def list_instances():
    """List all discovered instances with metadata."""
    try:
        return instance_service.list_instances()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/instances/active")
async def get_active_instance():
    """Return the currently active instance."""
    try:
        return instance_service.get_active_instance()
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/instances/switch")
async def switch_instance(body: InstanceSwitchRequest):
    """Switch to a different instance by path."""
    try:
        return instance_service.switch_instance(body.path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/instances/add")
async def add_instance(body: InstanceAddRequest):
    """Register a new instance by path."""
    try:
        return instance_service.add_instance(body.path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/instances/{instance_path:path}")
async def remove_instance(instance_path: str):
    """Remove an instance by path."""
    try:
        return instance_service.remove_instance(instance_path)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
