"""Claude Panel — FastAPI application."""

from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from claude_panel.config import settings
from claude_panel.routers import (
    health,
    dashboard,
    settings as settings_router,
    plugins,
    mcp,
    claude_md,
    visibility,
    ccr,
    marketplace,
    commands,
    skill_providers,
    instances,
    config_bundle,
)


def create_app() -> FastAPI:
    app = FastAPI(
        title="Claude Panel",
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
    app.include_router(ccr.router, prefix="/api")
    app.include_router(marketplace.router, prefix="/api")
    app.include_router(commands.router, prefix="/api")
    app.include_router(skill_providers.router, prefix="/api")
    app.include_router(instances.router, prefix="/api")
    app.include_router(config_bundle.router, prefix="/api")

    @app.on_event("startup")
    async def _restore_active_instance():
        from claude_panel.services.instance_service import load_persisted_instance, switch_instance
        active = load_persisted_instance()
        if active:
            try:
                switch_instance(active)
            except Exception:
                pass  # Fall back to default ~/.claude

    static_dir = Path(__file__).parent / "static"
    if static_dir.exists():
        index_html = static_dir / "index.html"

        app.mount("/assets", StaticFiles(directory=str(static_dir / "assets")), name="assets")

        @app.get("/{full_path:path}")
        async def _spa_fallback(request: Request, full_path: str):
            file_path = static_dir / full_path
            if full_path and file_path.is_file():
                return FileResponse(file_path)
            return FileResponse(index_html)

    return app


app = create_app()
