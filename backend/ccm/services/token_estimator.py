"""Estimates token costs for Claude Code configuration components."""

from ccm.models.scanner import ConfigTree, PluginInfo, McpServerInfo, ClaudeMdInfo

# Known approximate token costs for MCP server tool definitions
MCP_SERVER_BASE_TOKENS = 200  # Base cost per server registration
MCP_TOOL_TOKENS = 150  # Approximate tokens per tool definition

# Known plugin overhead estimates (from observation)
PLUGIN_BASE_TOKENS = 500  # Base cost for plugin loading
PLUGIN_SKILL_TOKENS = 800  # Approximate per-skill tokens (description + instructions)
PLUGIN_AGENT_TOKENS = 600  # Approximate per-agent tokens


def estimate_file_tokens(size_bytes: int) -> int:
    """Estimate tokens from file size using chars/4 heuristic."""
    # Rough: 1 byte ~= 1 char for text files, 4 chars ~= 1 token
    return max(size_bytes // 4, 0)


def estimate_plugin_tokens(plugin: PluginInfo) -> int:
    """Estimate token cost for a plugin."""
    if not plugin.enabled:
        return 0
    base = PLUGIN_BASE_TOKENS
    base += len(plugin.skills) * PLUGIN_SKILL_TOKENS
    base += len(plugin.agents) * PLUGIN_AGENT_TOKENS
    # Add file-based estimate if we have size data
    if plugin.size_bytes > 0:
        base = max(base, estimate_file_tokens(plugin.size_bytes))
    return base


def estimate_mcp_tokens(server: McpServerInfo, tool_count: int = 5) -> int:
    """Estimate token cost for an MCP server."""
    if not server.enabled:
        return 0
    return MCP_SERVER_BASE_TOKENS + (tool_count * MCP_TOOL_TOKENS)


def estimate_claude_md_tokens(md_file: ClaudeMdInfo) -> int:
    """Estimate token cost for a CLAUDE.md file."""
    return estimate_file_tokens(md_file.size_bytes)


def build_dashboard(tree: ConfigTree) -> dict:
    """Build complete token dashboard from config tree."""
    categories = []
    all_items = []
    suggestions = []

    # Plugins category
    plugin_items = []
    for p in tree.plugins:
        tokens = estimate_plugin_tokens(p)
        item = {
            "name": p.name,
            "category": "Plugins",
            "estimated_tokens": tokens,
            "file_path": f"~/.claude/plugins (id: {p.plugin_id})",
            "enabled": p.enabled,
        }
        plugin_items.append(item)
        all_items.append(item)

    plugin_total = sum(i["estimated_tokens"] for i in plugin_items)
    categories.append({
        "name": "Plugins",
        "total_tokens": plugin_total,
        "items": plugin_items,
        "color": "#7C3AED",
    })

    # MCP Servers category
    mcp_items = []
    for s in tree.mcp_servers:
        tokens = estimate_mcp_tokens(s)
        item = {
            "name": s.name,
            "category": "MCP Servers",
            "estimated_tokens": tokens,
            "file_path": "~/.claude.json",
            "enabled": s.enabled,
        }
        mcp_items.append(item)
        all_items.append(item)

    mcp_total = sum(i["estimated_tokens"] for i in mcp_items)
    categories.append({
        "name": "MCP Servers",
        "total_tokens": mcp_total,
        "items": mcp_items,
        "color": "#2563EB",
    })

    # CLAUDE.md files category
    md_items = []
    for md in tree.claude_md_files:
        tokens = estimate_claude_md_tokens(md)
        item = {
            "name": md.path.split("/")[-1] if "/" in md.path else md.path,
            "category": "CLAUDE.md",
            "estimated_tokens": tokens,
            "file_path": md.path,
            "enabled": True,
        }
        md_items.append(item)
        all_items.append(item)

    md_total = sum(i["estimated_tokens"] for i in md_items)
    categories.append({
        "name": "CLAUDE.md",
        "total_tokens": md_total,
        "items": md_items,
        "color": "#059669",
    })

    # Commands category
    cmd_items = []
    for cmd in tree.commands:
        tokens = estimate_file_tokens(cmd.size_bytes)
        item = {
            "name": cmd.name,
            "category": "Commands",
            "estimated_tokens": tokens,
            "file_path": cmd.file_path,
            "enabled": True,
        }
        cmd_items.append(item)
        all_items.append(item)

    cmd_total = sum(i["estimated_tokens"] for i in cmd_items)
    categories.append({
        "name": "Commands",
        "total_tokens": cmd_total,
        "items": cmd_items,
        "color": "#D97706",
    })

    # Memory & Other
    other_items = []
    for mem in tree.memory_files:
        tokens = estimate_file_tokens(mem.size_bytes)
        item = {
            "name": mem.name,
            "category": "Memory",
            "estimated_tokens": tokens,
            "file_path": mem.file_path,
            "enabled": True,
        }
        other_items.append(item)
        all_items.append(item)

    other_total = sum(i["estimated_tokens"] for i in other_items)
    categories.append({
        "name": "Memory",
        "total_tokens": other_total,
        "items": other_items,
        "color": "#DC2626",
    })

    total_tokens = sum(c["total_tokens"] for c in categories)

    # Generate optimization suggestions
    # Suggest disabling large unused plugins
    for p in tree.plugins:
        if p.enabled and estimate_plugin_tokens(p) > 2000:
            suggestions.append({
                "title": f"Disable plugin: {p.name}",
                "description": f"This plugin adds ~{estimate_plugin_tokens(p):,} tokens to every conversation.",
                "savings_tokens": estimate_plugin_tokens(p),
                "action_type": "toggle_plugin",
                "action_params": {"plugin_id": p.plugin_id, "enabled": False},
            })

    # Suggest disabling MCP servers with many tools
    for s in tree.mcp_servers:
        est = estimate_mcp_tokens(s)
        if est > 3000:
            suggestions.append({
                "title": f"Review MCP server: {s.name}",
                "description": f"This server adds ~{est:,} estimated tokens. Consider disabling if not needed.",
                "savings_tokens": est,
                "action_type": "toggle_mcp",
                "action_params": {"name": s.name, "enabled": False},
            })

    # Sort suggestions by savings
    suggestions.sort(key=lambda s: s["savings_tokens"], reverse=True)

    # Top consumers
    top_consumers = sorted(all_items, key=lambda i: i["estimated_tokens"], reverse=True)[:10]

    return {
        "total_tokens": total_tokens,
        "categories": categories,
        "suggestions": suggestions,
        "top_consumers": top_consumers,
    }
