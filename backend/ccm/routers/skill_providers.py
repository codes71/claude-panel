"""Router for skill provider management."""

import subprocess

from fastapi import APIRouter, HTTPException, Query

from ccm.models.skill_providers import (
    SkillProviderAddRequest,
    SkillInstallRequest,
)
from ccm.services import skill_provider_service
from ccm.services import skill_index_service
from ccm.services import provider_provenance_service

router = APIRouter(tags=["skill-providers"])


@router.get("/skill-providers/catalog")
async def catalog_skills(
    page: int = Query(1, ge=1),
    page_size: int = Query(48, ge=1, le=200),
    search: str = Query(""),
    provider: str = Query(""),
    type: str = Query("all"),
):
    """Browse the skill catalog with pagination and search."""
    return skill_index_service.query_catalog(
        page=page,
        page_size=page_size,
        search=search,
        provider_slug=provider,
        item_type=type,
    )


@router.get("/skill-providers")
async def list_skill_providers():
    """List all registered skill providers with discovered skills and commands."""
    return skill_provider_service.list_skill_providers()


@router.get("/skill-providers/provenance")
async def get_provider_provenance():
    """Return provider lock metadata (repo/branch/commit)."""
    return provider_provenance_service.read_lock()


@router.post("/skill-providers")
async def add_skill_provider(body: SkillProviderAddRequest):
    """Add a new skill provider by cloning its repo."""
    try:
        return skill_provider_service.add_skill_provider(body.source, body.branch)
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=502, detail=f"Git clone failed: {e.stderr or str(e)}")


@router.post("/skill-providers/update")
async def update_all_providers():
    """Pull latest changes for all registered providers."""
    try:
        return skill_provider_service.update_skill_provider()
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=502, detail=f"Git pull failed: {e.stderr or str(e)}")


@router.post("/skill-providers/{slug}/update")
async def update_provider(slug: str):
    """Pull latest changes for a specific provider."""
    try:
        return skill_provider_service.update_skill_provider(slug)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except subprocess.CalledProcessError as e:
        raise HTTPException(status_code=502, detail=f"Git pull failed: {e.stderr or str(e)}")


@router.delete("/skill-providers/{slug}")
async def remove_skill_provider(slug: str):
    """Remove a skill provider and its cloned repo."""
    try:
        return skill_provider_service.remove_skill_provider(slug)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/skill-providers/install")
async def install_skill(body: SkillInstallRequest):
    """Install a skill or command from a provider repo."""
    try:
        return skill_provider_service.install_skill(body.item_id, body.scope)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except FileExistsError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.post("/skill-providers/uninstall")
async def uninstall_skill(body: SkillInstallRequest):
    """Uninstall a previously installed skill or command."""
    try:
        return skill_provider_service.uninstall_skill(body.item_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
