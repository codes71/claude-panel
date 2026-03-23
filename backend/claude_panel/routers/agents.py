"""Router for custom agent management."""

from fastapi import APIRouter, HTTPException, Path as PathParam

from claude_panel.models.agents import (
    AgentCreateRequest,
    AgentImportRequest,
    AgentRenameRequest,
    AgentScanRequest,
    AgentUpdateRequest,
    BrowseRequest,
)
from claude_panel.services import agent_service

router = APIRouter(tags=["agents"])


@router.get("/agents")
async def list_agents():
    """List all custom agents."""
    return agent_service.list_agents()


@router.get("/agents/{name}")
async def read_agent(
    name: str = PathParam(..., description="Agent name without .md extension"),
):
    """Read a single agent's full details and content."""
    try:
        return agent_service.read_agent(name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/agents")
async def create_agent(body: AgentCreateRequest):
    """Create a new custom agent."""
    try:
        return agent_service.create_agent(body.name, body.content)
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/agents/{name}")
async def update_agent(
    body: AgentUpdateRequest,
    name: str = PathParam(..., description="Agent name without .md extension"),
):
    """Update an existing agent's content."""
    try:
        return agent_service.update_agent(name, body.content)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/agents/{name}/rename")
async def rename_agent(
    body: AgentRenameRequest,
    name: str = PathParam(..., description="Agent name without .md extension"),
):
    """Rename an agent."""
    try:
        return agent_service.rename_agent(name, body.new_name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.delete("/agents/{name}")
async def delete_agent(
    name: str = PathParam(..., description="Agent name without .md extension"),
):
    """Delete an agent (with backup)."""
    try:
        return agent_service.delete_agent(name)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/agents/browse")
async def browse_directory(body: BrowseRequest):
    """Browse filesystem directories for folder selection."""
    try:
        return agent_service.browse_directory(body.path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/agents/scan")
async def scan_folder(body: AgentScanRequest):
    """Scan a folder for importable agent .md files."""
    try:
        return agent_service.scan_folder(body.folder_path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/agents/import")
async def import_agents(body: AgentImportRequest):
    """Import selected agents from a folder."""
    try:
        return agent_service.import_agents(
            body.folder_path, body.names, body.overwrite
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
