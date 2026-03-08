"""Router for custom slash command management."""

from fastapi import APIRouter, HTTPException, Path as PathParam

from claude_panel.models.commands import CommandCreateRequest, CommandRenameRequest, CommandUpdateRequest
from claude_panel.services import command_service

router = APIRouter(tags=["commands"])


def _normalize_namespace(namespace: str) -> str:
    """Convert the URL sentinel '_root_' back to empty string."""
    return "" if namespace == "_root_" else namespace


@router.get("/commands")
async def list_commands():
    """List all custom slash commands with namespace groupings."""
    return command_service.list_commands()


@router.get("/commands/{namespace}/{name}")
async def read_command(
    namespace: str = PathParam(..., description="Namespace or '_root_' for root-level commands"),
    name: str = PathParam(..., description="Command name without .md extension"),
):
    """Read a single command's full details and content."""
    ns = _normalize_namespace(namespace)
    try:
        return command_service.read_command(ns, name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/commands")
async def create_command(body: CommandCreateRequest):
    """Create a new custom slash command."""
    try:
        return command_service.create_command(body.namespace, body.name, body.content)
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/commands/{namespace}/{name}")
async def update_command(
    body: CommandUpdateRequest,
    namespace: str = PathParam(..., description="Namespace or '_root_' for root-level commands"),
    name: str = PathParam(..., description="Command name without .md extension"),
):
    """Update an existing command's content."""
    ns = _normalize_namespace(namespace)
    try:
        return command_service.update_command(ns, name, body.content)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/commands/{namespace}/{name}/rename")
async def rename_command(
    body: CommandRenameRequest,
    namespace: str = PathParam(..., description="Namespace or '_root_' for root-level commands"),
    name: str = PathParam(..., description="Command name without .md extension"),
):
    """Rename or move a command to a new namespace and/or name."""
    ns = _normalize_namespace(namespace)
    try:
        return command_service.rename_command(ns, name, body.new_namespace, body.new_name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/commands/{namespace}/{name}")
async def delete_command(
    namespace: str = PathParam(..., description="Namespace or '_root_' for root-level commands"),
    name: str = PathParam(..., description="Command name without .md extension"),
):
    """Delete a command (with backup)."""
    ns = _normalize_namespace(namespace)
    try:
        return command_service.delete_command(ns, name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
