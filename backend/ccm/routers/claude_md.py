from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ccm.services import claude_md_drift_service, claude_md_service

router = APIRouter(tags=["claude-md"])


class ClaudeMdWriteBody(BaseModel):
    path: str
    content: str


@router.get("/claude-md")
async def list_claude_md_files():
    return claude_md_service.list_claude_md_files()


@router.get("/claude-md/drift")
async def list_claude_md_drift():
    return claude_md_drift_service.list_drift_events()


@router.get("/claude-md/file")
async def read_claude_md(path: str = Query(...)):
    try:
        return claude_md_service.read_claude_md(path)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/claude-md")
async def update_claude_md(body: ClaudeMdWriteBody):
    try:
        return claude_md_service.write_claude_md(body.path, body.content)
    except (FileNotFoundError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/claude-md")
async def create_claude_md(body: ClaudeMdWriteBody):
    try:
        return claude_md_service.create_claude_md(body.path, body.content)
    except (FileExistsError, ValueError) as e:
        raise HTTPException(status_code=400, detail=str(e))
