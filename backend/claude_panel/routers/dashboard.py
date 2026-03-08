from fastapi import APIRouter

from claude_panel.services.scanner import scan_config_tree
from claude_panel.services.token_estimator import build_dashboard
from claude_panel.services.stats_service import get_usage_stats

router = APIRouter(tags=["dashboard"])


@router.get("/dashboard")
async def get_dashboard():
    tree = scan_config_tree()
    dashboard = build_dashboard(tree)
    dashboard["usage_stats"] = get_usage_stats()
    dashboard["inventory"] = {
        "plugins": len(tree.plugins),
        "plugins_enabled": sum(1 for p in tree.plugins if p.enabled),
        "mcp_servers": len(tree.mcp_servers),
        "mcp_servers_enabled": sum(1 for s in tree.mcp_servers if s.enabled),
        "claude_md_files": len(tree.claude_md_files),
        "commands": len(tree.commands),
        "hooks": len(tree.hooks),
        "agents": len(tree.agents),
        "memory_files": len(tree.memory_files),
    }
    return dashboard
