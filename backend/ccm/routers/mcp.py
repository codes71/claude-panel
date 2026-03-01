from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ccm.services import mcp_service
from ccm.services.claude_json_service import add_mcp_server, remove_mcp_server

router = APIRouter(tags=["mcp"])


class McpServerCreateBody(BaseModel):
    name: str
    command: str
    args: list[str] = []
    env: dict[str, str] = {}


@router.get("/mcp")
async def list_mcp_servers():
    servers = mcp_service.list_all_servers()
    total_tokens = sum(s["estimated_tokens"] for s in servers)
    return {"servers": servers, "total_tokens": total_tokens}


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
    config = {"command": body.command, "args": body.args}
    if body.env:
        config["env"] = body.env
    try:
        add_mcp_server(body.name, config)
        return {"name": body.name, "status": "created"}
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/mcp/{name}")
async def delete_mcp_server(name: str):
    try:
        remove_mcp_server(name)
        return {"name": name, "status": "deleted"}
    except KeyError as e:
        raise HTTPException(status_code=404, detail=str(e))
