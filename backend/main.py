import logging
import sys
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pyautogui

# Add current directory to sys.path for importing routers
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from routers import auth, system, files, terminal, screen, network, docker, packages

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()]
)
logger = logging.getLogger("serverguard")

# Global PyAutoGUI configuration for remote control
pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.01

app = FastAPI(
    title="ServerGuard API",
    description="Self-hosted server monitoring and management platform",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify actual origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register routers
app.include_router(auth.router)
app.include_router(system.router)
app.include_router(files.router)
app.include_router(terminal.router)
app.include_router(screen.router)
app.include_router(network.router)
app.include_router(docker.router)
app.include_router(packages.router)

# Define frontend paths
FRONTEND_BUILD_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "frontend", "build")

# Serve static files from the React build directory (CS, JS, images)
if os.path.exists(os.path.join(FRONTEND_BUILD_DIR, "static")):
    app.mount("/static", StaticFiles(directory=os.path.join(FRONTEND_BUILD_DIR, "static")), name="static")

@app.get("/")
async def root():
    # Try to serve index.html if it exists
    index_file = os.path.join(FRONTEND_BUILD_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "message": "Welcome to ServerGuard API (Frontend not found)",
        "status": "online",
        "version": "1.0.0"
    }

# Catch-all route for React Router (must be last)
@app.get("/{full_path:path}")
async def serve_react_app(full_path: str):
    # Try to serve the actual file if it exists in the build directory
    # This handles manifest.json, favicon.ico, etc.
    file_path = os.path.join(FRONTEND_BUILD_DIR, full_path)
    if os.path.isfile(file_path):
        return FileResponse(file_path)
        
    # Fallback to index.html for React Router client-side routing
    index_file = os.path.join(FRONTEND_BUILD_DIR, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {"error": "Not Found", "path": full_path}

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting ServerGuard API...")
    uvicorn.run(app, host="0.0.0.0", port=8000)