from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from claude_panel.services import mcp_service
from claude_panel.services.claude_json_service import remove_mcp_server

router = APIRouter(tags=["mcp"])


class McpServerCreateBody(BaseModel):
    name: str
    server_type: str = "stdio"
    command: str | None = None
    args: list[str] = []
    env: dict[str, str] = {}
    url: str | None = None
    scope: str = "global"
    project_path: str | None = None


@router.get("/mcp")
async def list_mcp_servers():
    servers = mcp_service.list_all_servers()
    total_tokens = sum(s["estimated_tokens"] for s in servers)
    return {"servers": servers, "total_tokens": total_tokens}


@router.get("/mcp/diagnostics")
async def list_mcp_diagnostics():
    return mcp_service.diagnose_all_servers()


@router.get("/mcp/health")
async def list_mcp_health():
    return mcp_service.list_health()


@router.get("/mcp/projects")
async def list_mcp_projects():
    return {"projects": mcp_service.list_project_paths()}


@router.get("/mcp/{name}/diagnose")
async def diagnose_mcp_server(name: str):
    try:
        return mcp_service.diagnose_server(name)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/mcp/{name}/toggle")
async def toggle_mcp_server(name: str, enabled: bool = True):
    try:
        return mcp_service.toggle_server(name, enabled)
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/mcp")
async def create_mcp_server(body: McpServerCreateBody):
    # Build the raw config dict for ~/.claude.json
    if body.server_type == "http":
        if not body.url:
            raise HTTPException(status_code=400, detail="URL is required for HTTP servers")
        config = {"type": "http", "url": body.url}
        if body.env:
            config["env"] = body.env
    else:
        if not body.command:
            raise HTTPException(status_code=400, detail="Command is required for stdio servers")
        config = {"command": body.command, "args": body.args}
        if body.env:
            config["env"] = body.env
    try:
        return mcp_service.create_server(body.name, config, body.scope, body.project_path)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/mcp/{name}")
async def delete_mcp_server(name: str):
    try:
        remove_mcp_server(name)
        return {"name": name, "status": "deleted"}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
