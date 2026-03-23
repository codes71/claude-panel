"""Router for multi-instance management."""

from fastapi import APIRouter, HTTPException

from claude_panel.models.instances import InstanceSwitchRequest, InstanceAddRequest
from claude_panel.models.transfers import TransferPreviewRequest, TransferApplyRequest
from claude_panel.services import instance_service, instance_transfer_service

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


@router.post("/instances/transfers/preview")
async def preview_transfer(body: TransferPreviewRequest):
    """Preview what a cross-instance transfer would do."""
    try:
        return instance_transfer_service.preview_transfer(
            source_path=body.source_path,
            target_path=body.target_path,
            commands=[r.model_dump() for r in body.commands],
            plugins=[r.model_dump() for r in body.plugins],
            mcp_servers=[r.model_dump() for r in body.mcp_servers],
            agents=[r.model_dump() for r in body.agents],
        )
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/instances/transfers/apply")
async def apply_transfer(body: TransferApplyRequest):
    """Apply a cross-instance transfer."""
    try:
        return instance_transfer_service.apply_transfer(
            source_path=body.source_path,
            target_path=body.target_path,
            commands=[r.model_dump() for r in body.commands],
            plugins=[r.model_dump() for r in body.plugins],
            mcp_servers=[r.model_dump() for r in body.mcp_servers],
            agents=[r.model_dump() for r in body.agents],
            conflict_mode=body.conflict_mode,
        )
    except (ValueError, FileNotFoundError) as e:
        raise HTTPException(status_code=400, detail=str(e))
