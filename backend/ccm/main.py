"""Claude Code Configuration Manager — FastAPI application."""

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from ccm.config import settings
from ccm.routers import health, dashboard, settings as settings_router, plugins, mcp, claude_md, visibility


def create_app() -> FastAPI:
    app = FastAPI(
        title="Claude Code Config Manager",
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    # CORS for dev frontend
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Mount API routes
    app.include_router(health.router, prefix="/api")
    app.include_router(dashboard.router, prefix="/api")
    app.include_router(settings_router.router, prefix="/api")
    app.include_router(plugins.router, prefix="/api")
    app.include_router(mcp.router, prefix="/api")
    app.include_router(claude_md.router, prefix="/api")
    app.include_router(visibility.router, prefix="/api")

    # Serve built frontend in production
    static_dir = Path(__file__).parent / "static"
    if static_dir.exists():
        app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

    return app


app = create_app()
