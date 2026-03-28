from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
import asyncio
import json
import logging
from datetime import datetime
from dependencies import manager, verify_token, executor
from utils import capture_screen, execute_control_command
from models import ScreenSettingsRequest, ScreenControlRequest

logger = logging.getLogger(__name__)
router = APIRouter(tags=["screen"])

# Shared state for screen settings per session (simplified)
session_settings = {}

@router.get("/api/screen/info")
async def get_screen_info(token: str = Depends(verify_token)):
    from mss import mss
    try:
        with mss() as sct:
            monitor = sct.monitors[1]
            return {
                "width": monitor["width"],
                "height": monitor["height"],
                "left": monitor["left"],
                "top": monitor["top"]
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/api/screen/update-settings")
async def update_settings(request: dict, token: str = Depends(verify_token)):
    # request: {session_id, quality, scale, fps}
    session_id = request.get("session_id")
    if session_id:
        session_settings[session_id] = {
            "quality": request.get("quality", 75),
            "scale": request.get("scale", 1.0),
            "fps": request.get("fps", 10)
        }
    return {"success": True}

@router.websocket("/ws/screen/{session_id}")
async def screen_websocket(websocket: WebSocket, session_id: str):
    await manager.connect(websocket)
    try:
        # Send initial screen info
        from mss import mss
        with mss() as sct:
            monitor = sct.monitors[1]
            await websocket.send_text(json.dumps({
                "type": "screen_info",
                "width": monitor["width"],
                "height": monitor["height"]
            }))

        while True:
            # Get settings for this session
            settings = session_settings.get(session_id, {"quality": 75, "scale": 1.0, "fps": 10})
            
            # Capture and send frame
            img_data = await asyncio.get_event_loop().run_in_executor(
                executor, 
                lambda: capture_screen(quality=settings["quality"], scale=settings["scale"])
            )
            
            await websocket.send_text(json.dumps({
                "type": "frame",
                "data": img_data
            }))
            
            # Control FPS
            await asyncio.sleep(1.0 / settings["fps"])
            
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Screen Stream WebSocket error ({session_id}): {e}")
        manager.disconnect(websocket)

@router.websocket("/ws/screen-control/{session_id}")
async def screen_control_websocket(websocket: WebSocket, session_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "control":
                control_data = message.get("data")
                if control_data:
                    await asyncio.get_event_loop().run_in_executor(
                        executor, 
                        execute_control_command, 
                        control_data
                    )
                    
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Screen Control WebSocket error ({session_id}): {e}")
        manager.disconnect(websocket)

@router.post("/api/screen/control")
async def control_screen_http(request: ScreenControlRequest, token: str = Depends(verify_token)):
    success = execute_control_command(request.dict())
    return {"success": success}
