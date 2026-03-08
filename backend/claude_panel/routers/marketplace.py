from fastapi import APIRouter, HTTPException

from claude_panel.services import marketplace_service
from claude_panel.models.marketplace import PluginInstallRequest, ProviderAddRequest

router = APIRouter(tags=["marketplace"])


@router.get("/marketplace")
async def list_marketplace():
    return marketplace_service.list_available_plugins()


@router.post("/marketplace/install")
async def install_plugin(req: PluginInstallRequest):
    result = marketplace_service.install_plugin(req.plugin_id, req.scope)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/marketplace/uninstall")
async def uninstall_plugin(req: PluginInstallRequest):
    result = marketplace_service.uninstall_plugin(req.plugin_id)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


# --- Provider endpoints ---
# NOTE: /providers/update must come before /providers/{name} to avoid path conflict


@router.get("/marketplace/providers")
async def list_providers():
    providers = marketplace_service.list_providers()
    return {"providers": providers}


@router.post("/marketplace/providers")
async def add_provider(req: ProviderAddRequest):
    result = marketplace_service.add_provider(req.source)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/marketplace/providers/update")
async def update_all_providers():
    result = marketplace_service.update_provider()
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.post("/marketplace/providers/{name}/update")
async def update_single_provider(name: str):
    result = marketplace_service.update_provider(name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result


@router.delete("/marketplace/providers/{name}")
async def remove_provider(name: str):
    result = marketplace_service.remove_provider(name)
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result
