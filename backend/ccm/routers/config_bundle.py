"""Router for config bundle export/validate/apply APIs."""

from fastapi import APIRouter
from pydantic import BaseModel, Field

from ccm.services import config_bundle_service

router = APIRouter(tags=["config-bundle"])


class ConfigBundleValidateBody(BaseModel):
    bundle: dict = Field(default_factory=dict)


class ConfigBundleApplyBody(BaseModel):
    bundle: dict = Field(default_factory=dict)
    dry_run: bool = True


@router.get("/config-bundle/export")
async def export_config_bundle():
    return config_bundle_service.export_bundle()


@router.post("/config-bundle/validate")
async def validate_config_bundle(body: ConfigBundleValidateBody):
    return config_bundle_service.validate_bundle(body.bundle)


@router.post("/config-bundle/apply")
async def apply_config_bundle(body: ConfigBundleApplyBody):
    return config_bundle_service.apply_bundle(body.bundle, dry_run=body.dry_run)
