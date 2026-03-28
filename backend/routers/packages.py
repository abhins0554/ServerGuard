from fastapi import APIRouter, Depends, HTTPException
import asyncio
import platform
import logging
import subprocess
from dependencies import verify_token, executor

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/packages", tags=["packages"])

@router.get("/list")
async def list_packages(page: int = 1, limit: int = 50, search: str = "", token: str = Depends(verify_token)):
    loop = asyncio.get_event_loop()
    def get_packages():
        system = platform.system()
        packages = []
        try:
            if system == "Linux":
                # apt example
                result = subprocess.run(['dpkg-query', '-W', '-f=${Package}\t${Version}\t${Status}\n'], capture_output=True, text=True)
                for line in result.stdout.split('\n'):
                    if line: 
                        parts = line.split('\t')
                        packages.append({"name": parts[0], "version": parts[1]})
            elif system == "Darwin":
                result = subprocess.run(['brew', 'list', '--versions'], capture_output=True, text=True)
                for line in result.stdout.split('\n'):
                    if line:
                        parts = line.split()
                        packages.append({"name": parts[0], "version": parts[1]})
        except:
            pass
        return packages
        
    all_packages = await loop.run_in_executor(executor, get_packages)
    if search:
        all_packages = [p for p in all_packages if search.lower() in p["name"].lower()]
    
    total = len(all_packages)
    start = (page - 1) * limit
    return {"packages": all_packages[start:start+limit], "total": total}

@router.get("/updates")
async def check_updates(token: str = Depends(verify_token)):
    return {"available": False, "count": 0, "packages": []}
