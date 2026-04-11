"""Diagnostics helpers for MCP server configuration health."""

import shutil
import time


def _check_transport(server: dict) -> dict:
    transport = server.get("server_type")
    if transport not in {"stdio", "http"}:
        return {
            "code": "TRANSPORT_INVALID",
            "status": "fail",
            "message": f"Unsupported server_type '{transport}'.",
        }
    return {
        "code": "TRANSPORT_VALID",
        "status": "ok",
        "message": f"Transport '{transport}' is valid.",
    }


def _check_stdio_command(server: dict) -> dict:
    if server.get("server_type") != "stdio":
        return {
            "code": "COMMAND_NOT_REQUIRED",
            "status": "ok",
            "message": "Command check skipped for non-stdio server.",
        }

    command = str(server.get("command", "")).strip()
    if not command:
        return {
            "code": "COMMAND_MISSING",
            "status": "fail",
            "message": "Stdio server requires a command.",
        }

    command_bin = command.split()[0]
    if "/" not in command_bin and shutil.which(command_bin) is None:
        return {
            "code": "COMMAND_NOT_FOUND",
            "status": "warn",
            "message": f"Command '{command_bin}' is not found on PATH.",
        }

    return {
        "code": "COMMAND_VALID",
        "status": "ok",
        "message": "Command is configured.",
    }


def _check_http_url(server: dict) -> dict:
    if server.get("server_type") != "http":
        return {
            "code": "URL_NOT_REQUIRED",
            "status": "ok",
            "message": "URL check skipped for non-HTTP server.",
        }

    url = str(server.get("url", server.get("command", ""))).strip()
    if not url.startswith(("http://", "https://")):
        return {
            "code": "URL_INVALID",
            "status": "fail",
            "message": "HTTP server URL must start with http:// or https://.",
        }

    return {
        "code": "URL_VALID",
        "status": "ok",
        "message": "HTTP URL is configured.",
    }


def _check_args(server: dict) -> dict:
    args = server.get("args", [])
    if not isinstance(args, list):
        return {
            "code": "ARGS_INVALID",
            "status": "fail",
            "message": "Args must be a list of strings.",
        }
    if not all(isinstance(a, str) for a in args):
        return {
            "code": "ARGS_INVALID",
            "status": "fail",
            "message": "All args must be strings.",
        }
    return {
        "code": "ARGS_VALID",
        "status": "ok",
        "message": "Args shape is valid.",
    }


def _check_env(server: dict) -> dict:
    env = server.get("env", {})
    if not isinstance(env, dict):
        return {
            "code": "ENV_INVALID",
            "status": "fail",
            "message": "Env must be a key/value object.",
        }
    non_strings = [k for k, v in env.items() if not isinstance(k, str) or not isinstance(v, str)]
    if non_strings:
        return {
            "code": "ENV_INVALID",
            "status": "fail",
            "message": "Env keys and values must be strings.",
        }
    return {
        "code": "ENV_VALID",
        "status": "ok",
        "message": "Env shape is valid.",
    }


def diagnose_server(server: dict) -> dict:
    """Return diagnostics for one MCP server config."""
    checks = [
        _check_transport(server),
        _check_stdio_command(server),
        _check_http_url(server),
        _check_args(server),
        _check_env(server),
    ]

    if any(c["status"] == "fail" for c in checks):
        status = "fail"
    elif any(c["status"] == "warn" for c in checks):
        status = "warn"
    else:
        status = "ok"

    return {
        "status": status,
        "checks": checks,
        "checked_at": time.time(),
    }
