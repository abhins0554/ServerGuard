from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
import asyncio
import os
import platform
import json
import re
import logging
import subprocess
from datetime import datetime
from dependencies import manager, verify_token, executor
from models import CommandRequest, CommandResponse

logger = logging.getLogger(__name__)
router = APIRouter(tags=["terminal"])

@router.websocket("/ws/terminal/{session_id}")
async def terminal_websocket(websocket: WebSocket, session_id: str):
    await manager.connect(websocket)
    
    if session_id not in manager.terminal_sessions:
        manager.terminal_sessions[session_id] = {
            "process": None,
            "current_directory": os.getcwd(),
            "connected": True
        }
    
    try:
        welcome_msg = {
            "type": "system",
            "message": f"Terminal session {session_id} established.",
            "current_directory": manager.terminal_sessions[session_id]["current_directory"]
        }
        await websocket.send_text(json.dumps(welcome_msg))
        
        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            
            if message["type"] == "command":
                command = message["command"]
                
                # Enhanced security check
                dangerous_patterns = [
                    r'rm\s+-rf', r'del\s+/s', r'format\s+', r'dd\s+', 
                    r'shutdown', r'reboot', r'mkfs', r'taskkill\s+/f'
                ]
                if any(re.search(p, command.lower()) for p in dangerous_patterns):
                    await websocket.send_text(json.dumps({"type": "error", "message": "Dangerous command rejected for safety"}))
                    continue
                
                # Handle directory change (cd)
                if command.strip().startswith('cd '):
                    new_dir = command.strip()[3:].strip()
                    if new_dir:
                        try:
                            # Handle relative and absolute paths
                            curr_dir = manager.terminal_sessions[session_id]["current_directory"]
                            if new_dir == "~":
                                target_dir = os.path.expanduser("~")
                            else:
                                target_dir = os.path.abspath(os.path.join(curr_dir, new_dir))
                                
                            if os.path.isdir(target_dir):
                                manager.terminal_sessions[session_id]["current_directory"] = target_dir
                                await websocket.send_text(json.dumps({
                                    "type": "system", 
                                    "message": f"Changed directory to {target_dir}",
                                    "path": target_dir
                                }))
                                # Also send a directory update message
                                await websocket.send_text(json.dumps({
                                    "type": "directory",
                                    "path": target_dir
                                }))
                                continue
                            else:
                                await websocket.send_text(json.dumps({"type": "error", "message": f"Directory not found: {new_dir}"}))
                                continue
                        except Exception as e:
                            await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
                            continue

                # Execute with real-time streaming
                try:
                    env = dict(os.environ)
                    env['PWD'] = manager.terminal_sessions[session_id]["current_directory"]
                    cwd = manager.terminal_sessions[session_id]["current_directory"]
                    
                    if platform.system() == "Windows":
                        process = await asyncio.create_subprocess_exec(
                            'cmd', '/c', command,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE,
                            cwd=cwd,
                            env=env
                        )
                    else:
                        shell = os.environ.get('SHELL', '/bin/sh')
                        process = await asyncio.create_subprocess_exec(
                            shell, '-c', command,
                            stdout=asyncio.subprocess.PIPE,
                            stderr=asyncio.subprocess.PIPE,
                            cwd=cwd,
                            env=env
                        )
                    
                    manager.terminal_sessions[session_id]["process"] = process
                    
                    # Stream output tasks
                    async def stream_output(stream, msg_type):
                        try:
                            while True:
                                line = await stream.readline()
                                if not line:
                                    break
                                await websocket.send_text(json.dumps({
                                    "type": msg_type,
                                    "data": line.decode('utf-8', errors='replace')
                                }))
                        except Exception as e:
                            logger.error(f"Stream error: {e}")

                    # Run stdout and stderr streaming concurrently
                    await asyncio.gather(
                        stream_output(process.stdout, "output"),
                        stream_output(process.stderr, "error")
                    )
                    
                    return_code = await process.wait()
                    await websocket.send_text(json.dumps({"type": "exit", "code": return_code}))
                    
                except Exception as e:
                    logger.error(f"Execution error: {e}")
                    await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
            
            elif message["type"] == "ping":
                await websocket.send_text(json.dumps({"type": "pong"}))
            
            elif message["type"] == "get_directory":
                await websocket.send_text(json.dumps({
                    "type": "directory",
                    "path": manager.terminal_sessions[session_id]["current_directory"]
                }))
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"Terminal WebSocket error: {e}")
        manager.disconnect(websocket)
    finally:
        if session_id in manager.terminal_sessions:
            # Clean up process if still running
            proc = manager.terminal_sessions[session_id].get("process")
            if proc and proc.returncode is None:
                try: proc.terminate()
                except: pass
            del manager.terminal_sessions[session_id]

@router.post("/api/system/command", response_model=CommandResponse)
async def execute_command_http(command_request: CommandRequest, token: str = Depends(verify_token)):
    """Execute a single command via HTTP (fallback mode)"""
    try:
        # Security check
        dangerous = ['rm -rf', 'shutdown', 'reboot', 'format', 'mkfs', 'dd ']
        if any(d in command_request.command.lower() for d in dangerous):
            raise HTTPException(status_code=403, detail="Dangerous command rejected")
            
        loop = asyncio.get_event_loop()
        process = await loop.run_in_executor(
            executor,
            lambda: subprocess.run(
                command_request.command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30
            )
        )
        return CommandResponse(
            output=process.stdout,
            error=process.stderr,
            exit_code=process.returncode
        )
    except subprocess.TimeoutExpired:
        raise HTTPException(status_code=408, detail="Command timed out")
    except Exception as e:
        logger.error(f"HTTP Command error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
