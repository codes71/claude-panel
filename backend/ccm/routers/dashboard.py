from fastapi import APIRouter

from ccm.services.scanner import scan_config_tree
from ccm.services.token_estimator import build_dashboard

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
async def get_dashboard():
    tree = scan_config_tree()
    return build_dashboard(tree)
