"""Diagnostics helpers for MCP server configuration health."""

import shutil
import time


def _check_transport(server: dict) -> dict:
    transport = server.get("server_type")
    if transport not in {"stdio", "sse"}:
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


def _check_sse_url(server: dict) -> dict:
    if server.get("server_type") != "sse":
        return {
            "code": "URL_NOT_REQUIRED",
            "status": "ok",
            "message": "URL check skipped for non-SSE server.",
        }

    url = str(server.get("command", "")).strip()
    if not url.startswith(("http://", "https://")):
        return {
            "code": "URL_INVALID",
            "status": "fail",
            "message": "SSE server URL must start with http:// or https://.",
        }

    return {
        "code": "URL_VALID",
        "status": "ok",
        "message": "SSE URL is configured.",
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


def _check_oauth_config(server: dict) -> dict:
    """Check OAuth configuration for MCP server."""
    oauth_url = server.get("oauth_auth_server_metadata_url")

    if not oauth_url:
        return {
            "code": "OAUTH_NOT_CONFIGURED",
            "status": "ok",
            "message": "OAuth not configured (optional).",
        }

    if not isinstance(oauth_url, str):
        return {
            "code": "OAUTH_INVALID_TYPE",
            "status": "fail",
            "message": "OAuth auth server metadata URL must be a string.",
        }

    if not oauth_url.startswith(("http://", "https://")):
        return {
            "code": "OAUTH_INVALID_URL",
            "status": "fail",
            "message": "OAuth auth server metadata URL must be a valid HTTP/HTTPS URL.",
        }

    return {
        "code": "OAUTH_CONFIGURED",
        "status": "ok",
        "message": "OAuth configuration is valid.",
    }


def _check_headers_helper(server: dict) -> dict:
    """Check headers helper configuration and connection status."""
    has_headers_helper = server.get("has_headers_helper", False)
    connection_status = server.get("connection_status", "unknown")

    if not has_headers_helper:
        return {
            "code": "HEADERS_HELPER_NOT_CONFIGURED",
            "status": "ok",
            "message": "Headers helper not configured (optional).",
        }

    if connection_status == "reconnecting":
        return {
            "code": "HEADERS_HELPER_RECONNECTING",
            "status": "warn",
            "message": "Server is reconnecting due to connection issues.",
        }
    elif connection_status == "disconnected":
        return {
            "code": "HEADERS_HELPER_DISCONNECTED",
            "status": "fail",
            "message": "Server is disconnected and unable to reconnect.",
        }
    elif connection_status == "connected":
        return {
            "code": "HEADERS_HELPER_CONNECTED",
            "status": "ok",
            "message": "Server is connected and functioning normally.",
        }
    else:
        return {
            "code": "HEADERS_HELPER_STATUS_UNKNOWN",
            "status": "warn",
            "message": "Connection status is unknown.",
        }


def _check_output_schema(server: dict) -> dict:
    """Check for output schema validation issues."""
    has_issues = server.get("has_output_schema_issues", False)
    warnings = server.get("validation_warnings", [])

    if not has_issues and not warnings:
        return {
            "code": "OUTPUT_SCHEMA_VALID",
            "status": "ok",
            "message": "No output schema validation issues detected.",
        }

    if has_issues:
        warning_text = "; ".join(warnings) if warnings else "Unknown validation issues"
        return {
            "code": "OUTPUT_SCHEMA_ISSUES",
            "status": "warn",
            "message": f"Output schema validation issues: {warning_text}",
        }

    if warnings:
        return {
            "code": "OUTPUT_SCHEMA_WARNINGS",
            "status": "warn",
            "message": f"Output schema warnings: {'; '.join(warnings)}",
        }

    return {
        "code": "OUTPUT_SCHEMA_VALID",
        "status": "ok",
        "message": "No output schema validation issues detected.",
    }


def diagnose_server(server: dict) -> dict:
    """Return diagnostics for one MCP server config."""
    checks = [
        _check_transport(server),
        _check_stdio_command(server),
        _check_sse_url(server),
        _check_args(server),
        _check_env(server),
        _check_oauth_config(server),
        _check_headers_helper(server),
        _check_output_schema(server),
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
