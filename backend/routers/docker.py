from fastapi import APIRouter, Depends, HTTPException
import asyncio
import logging
import subprocess
import json
from dependencies import verify_token, executor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/docker", tags=["docker"])

@router.get("/containers")
async def get_containers(token: str = Depends(verify_token)):
    loop = asyncio.get_event_loop()
    def list_containers():
        try:
            cmd = ['docker', 'ps', '-a', '--format', 'json']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            containers = [json.loads(line) for line in result.stdout.strip().split('\n') if line]
            return {"available": True, "containers": containers}
        except Exception as e:
            return {"available": False, "error": str(e)}
            
    return await loop.run_in_executor(executor, list_containers)

@router.get("/images")
async def get_images(token: str = Depends(verify_token)):
    loop = asyncio.get_event_loop()
    def list_images():
        try:
            cmd = ['docker', 'images', '--format', 'json']
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
            images = [json.loads(line) for line in result.stdout.strip().split('\n') if line]
            return {"available": True, "images": images}
        except Exception as e:
            return {"available": False, "error": str(e)}
            
    return await loop.run_in_executor(executor, list_images)
