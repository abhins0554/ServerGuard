from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class SystemInfo(BaseModel):
    timestamp: str
    data: Dict[str, Any]

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str

class CommandRequest(BaseModel):
    command: str

class CommandResponse(BaseModel):
    output: str
    error: Optional[str] = None
    exit_code: int

class FileRequest(BaseModel):
    path: str

class FileUpdateRequest(BaseModel):
    path: str
    content: str

class CreateDirectoryRequest(BaseModel):
    path: str

class ShareableLinkRequest(BaseModel):
    path: str
    expires_in: int = 1200  # 20 minutes in seconds

class ShareableLinkResponse(BaseModel):
    link_id: str
    url: str
    expires_at: str
    file_path: str

class DirectoryItem(BaseModel):
    name: str
    path: str
    is_directory: bool
    size: Optional[int] = None
    modified: Optional[str] = None

class ScreenControlRequest(BaseModel):
    type: str  # 'mouse_move', 'mouse_click', 'mouse_scroll', 'zoom_gesture', ...
    x: Optional[float] = None
    y: Optional[float] = None
    button: Optional[str] = None  # 'left', 'right', 'middle'
    scroll: Optional[int] = None
    scroll_horizontal: Optional[int] = None
    direction: Optional[str] = None  # zoom_gesture: 'in' | 'out'
    key: Optional[str] = None
    text: Optional[str] = None

class ScreenSettingsRequest(BaseModel):
    session_id: str
    quality: Optional[int] = 75
    scale: Optional[float] = 1.0
    fps: Optional[int] = 10

class PingRequest(BaseModel):
    host: str
    count: int = 4
    timeout: int = 5

class TracerouteRequest(BaseModel):
    host: str
    max_hops: int = 30

class PortScanRequest(BaseModel):
    host: str
    ports: str  # Comma-separated or range like "80,443,8000-8010"
    timeout: float = 1.0

class NetworkDevice(BaseModel):
    ip: str
    mac: str = "Unknown"
    hostname: Optional[str] = None
    identifier: Optional[str] = None
    status: str = "active"

class DeviceConnection(BaseModel):
    local_address: Optional[str] = None
    remote_address: Optional[str] = None
    remote_ip: Optional[str] = None
    remote_port: Optional[int] = None
    status: Optional[str] = None
    type: Optional[str] = None
    pid: Optional[int] = None
    family: Optional[str] = None
    direction: str  # 'inbound' or 'outbound'
