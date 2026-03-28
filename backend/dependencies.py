import os
import logging
from fastapi import WebSocket, Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import List, Dict, Any
import json
from dotenv import load_dotenv

from concurrent.futures import ThreadPoolExecutor

load_dotenv()

logger = logging.getLogger(__name__)

# Executor for IO-intensive tasks (DNS, Pings, etc.)
executor = ThreadPoolExecutor(max_workers=20)

# Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

security = HTTPBearer()

# WebSocket connection manager
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.terminal_sessions: Dict[str, Any] = {}

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info(f"WebSocket connected. Total connections: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info(f"WebSocket disconnected. Total connections: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            if websocket in self.active_connections:
                self.disconnect(websocket)

    async def broadcast(self, message: str):
        disconnected_connections = []
        for connection in self.active_connections:
            try:
                await connection.send_text(message)
            except Exception as e:
                logger.error(f"Failed to broadcast message: {e}")
                disconnected_connections.append(connection)
        for connection in disconnected_connections:
            self.disconnect(connection)

manager = ConnectionManager()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != "valid-token":
        raise HTTPException(status_code=401, detail="Invalid token")
    return credentials.credentials
