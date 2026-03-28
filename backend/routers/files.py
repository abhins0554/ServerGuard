from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from fastapi.responses import FileResponse, StreamingResponse
import os
import shutil
import aiofiles
import logging
from datetime import datetime, timedelta
import secrets
import hashlib
import platform
import psutil
from dependencies import verify_token, executor
from models import FileUpdateRequest, CreateDirectoryRequest, ShareableLinkRequest, ShareableLinkResponse
from utils import get_file_mime_type

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/files", tags=["files"])

# In-memory storage for shareable links (temporary, should be moved to DB)
shareable_links = {}

@router.get("/list")
async def list_directory(path: str = ".", token: str = Depends(verify_token)):
    try:
        if path == "." or path == "/" or path == "\\" or path == "System Drives":
            if platform.system() == "Windows":
                import string
                drives = []
                for letter in string.ascii_uppercase:
                    drive = f"{letter}:\\"
                    if os.path.exists(drive):
                        try:
                            usage = psutil.disk_usage(drive)
                            drives.append({
                                "name": f"{letter}:",
                                "path": drive,
                                "is_directory": True,
                                "size": None,
                                "modified": datetime.now().isoformat(),
                                "is_drive": True,
                                "free_space": usage.free,
                                "total_space": usage.total
                            })
                        except:
                            continue
                return {"path": "System Drives", "items": drives, "is_root": True}
            else:
                path = "/"
        
        abs_path = os.path.abspath(path)
        sensitive_paths = ["C:\\Windows", "/etc", "/usr", "/bin", "/sbin"]
        if any(abs_path.startswith(s) for s in sensitive_paths):
            raise HTTPException(status_code=403, detail="Access to system directories is restricted")

        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="Path not found")
        
        items = []
        with os.scandir(abs_path) as entries:
            for entry in entries:
                try:
                    stats = entry.stat()
                    items.append({
                        "name": entry.name,
                        "path": entry.path,
                        "is_directory": entry.is_dir(),
                        "size": stats.st_size if not entry.is_dir() else None,
                        "modified": datetime.fromtimestamp(stats.st_mtime).isoformat()
                    })
                except:
                    continue
        return {"path": abs_path, "items": items}
    except Exception as e:
        logger.error(f"Error listing directory {path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/content")
async def get_file_content(path: str, token: str = Depends(verify_token)):
    if not os.path.exists(path) or os.path.isdir(path):
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        async with aiofiles.open(path, mode='r', encoding='utf-8') as f:
            content = await f.read()
            return {"content": content, "mime_type": get_file_mime_type(path)}
    except UnicodeDecodeError:
        return {"content": None, "is_binary": True, "mime_type": get_file_mime_type(path)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/update")
async def update_file(request: FileUpdateRequest, token: str = Depends(verify_token)):
    try:
        async with aiofiles.open(request.path, mode='w', encoding='utf-8') as f:
            await f.write(request.content)
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/create-directory")
async def create_directory(request: CreateDirectoryRequest, token: str = Depends(verify_token)):
    try:
        os.makedirs(request.path, exist_ok=True)
        return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_file(path: str, file: UploadFile = File(...), token: str = Depends(verify_token)):
    try:
        dest_path = os.path.join(path, file.filename)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"success": True, "path": dest_path}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download")
async def download_file(path: str, token: str = Depends(verify_token)):
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(path, filename=os.path.basename(path))

@router.post("/share")
async def share_file(request: ShareableLinkRequest, token: str = Depends(verify_token)):
    if not os.path.exists(request.path):
        raise HTTPException(status_code=404, detail="File not found")
    
    link_id = secrets.token_urlsafe(16)
    expires_at = datetime.now() + timedelta(seconds=request.expires_in)
    shareable_links[link_id] = {
        "path": request.path,
        "expires_at": expires_at
    }
    
    return {
        "link_id": link_id,
        "expires_at": expires_at.isoformat(),
        "url": f"/api/files/shared/{link_id}"
    }

@router.get("/shared/{link_id}")
async def get_shared_file(link_id: str):
    if link_id not in shareable_links:
        raise HTTPException(status_code=404, detail="Link invalid or expired")
    
    link_data = shareable_links[link_id]
    if datetime.now() > link_data["expires_at"]:
        del shareable_links[link_id]
        raise HTTPException(status_code=404, detail="Link expired")
    
    return FileResponse(link_data["path"], filename=os.path.basename(link_data["path"]))
