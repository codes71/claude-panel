from fastapi import APIRouter, HTTPException

from claude_panel.services import plugin_service

router = APIRouter(tags=["plugins"])


@router.get("/plugins")
async def list_plugins():
    plugins = plugin_service.list_plugins()
    total_tokens = sum(p["estimated_tokens"] for p in plugins)
    return {"plugins": plugins, "total_tokens": total_tokens}


@router.put("/plugins/{plugin_id}/toggle")
async def toggle_plugin(plugin_id: str, enabled: bool = True):
    try:
        return plugin_service.toggle_plugin(plugin_id, enabled)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
