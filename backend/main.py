from fastapi import FastAPI, HTTPException, Depends, WebSocket, WebSocketDisconnect, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
import psutil
import platform
import socket
import json
import asyncio
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional
import os
import subprocess
import shutil
from pathlib import Path
from dotenv import load_dotenv
import aiofiles
import asyncio.subprocess
import time
import threading
from concurrent.futures import ThreadPoolExecutor
import hashlib
import logging
import secrets
import mimetypes
from datetime import datetime, timedelta

# Cross-platform system information functions
def get_platform_specific_cpu_info():
    """Get CPU information optimized for different platforms"""
    system = platform.system()
    
    try:
        # Basic CPU info that works on all platforms
        cpu_count = psutil.cpu_count()
        cpu_count_logical = psutil.cpu_count(logical=True)
        cpu_count_physical = psutil.cpu_count(logical=False)
        
        # CPU frequency - handle platform differences
        cpu_freq = None
        try:
            cpu_freq = psutil.cpu_freq()
        except (AttributeError, FileNotFoundError, OSError):
            # Fallback for platforms where cpu_freq is not available
            pass
        
        # CPU model info
        cpu_model = platform.processor()
        if not cpu_model or cpu_model == "":
            # Fallback for different platforms
            if system == "Windows":
                try:
                    import subprocess
                    result = subprocess.run(['wmic', 'cpu', 'get', 'name'], 
                                         capture_output=True, text=True, timeout=5)
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')
                        if len(lines) > 1:
                            cpu_model = lines[1].strip()
                except:
                    cpu_model = "Unknown CPU"
            elif system == "Darwin":  # macOS
                try:
                    result = subprocess.run(['sysctl', '-n', 'machdep.cpu.brand_string'], 
                                         capture_output=True, text=True, timeout=5)
                    if result.returncode == 0:
                        cpu_model = result.stdout.strip()
                except:
                    cpu_model = "Unknown CPU"
            elif system == "Linux":
                try:
                    with open('/proc/cpuinfo', 'r') as f:
                        for line in f:
                            if line.startswith('model name'):
                                cpu_model = line.split(':')[1].strip()
                                break
                except:
                    cpu_model = "Unknown CPU"
            else:
                cpu_model = "Unknown CPU"
        
        return {
            "cpu_count": cpu_count,
            "cpu_count_logical": cpu_count_logical,
            "cpu_count_physical": cpu_count_physical,
            "cpu_freq": cpu_freq,
            "cpu_model": cpu_model,
            "system": system
        }
    except Exception as e:
        logging.error(f"Error getting platform-specific CPU info: {e}")
        return {
            "cpu_count": 1,
            "cpu_count_logical": 1,
            "cpu_count_physical": 1,
            "cpu_freq": None,
            "cpu_model": "Unknown CPU",
            "system": system
        }

def get_platform_specific_memory_info():
    """Get memory information optimized for different platforms"""
    try:
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        
        return {
            "memory": memory,
            "swap": swap
        }
    except Exception as e:
        logging.error(f"Error getting platform-specific memory info: {e}")
        return {
            "memory": None,
            "swap": None
        }

def get_platform_specific_disk_info():
    """Get disk information optimized for different platforms"""
    try:
        disk_partitions = psutil.disk_partitions()
        disk_io = psutil.disk_io_counters()
        
        return {
            "partitions": disk_partitions,
            "io_counters": disk_io
        }
    except Exception as e:
        logging.error(f"Error getting platform-specific disk info: {e}")
        return {
            "partitions": [],
            "io_counters": None
        }

def get_platform_specific_network_info():
    """Get network information optimized for different platforms"""
    try:
        network_io = psutil.net_io_counters()
        network_interfaces = psutil.net_if_addrs()
        network_stats = psutil.net_if_stats()
        
        return {
            "io_counters": network_io,
            "interfaces": network_interfaces,
            "stats": network_stats
        }
    except Exception as e:
        logging.error(f"Error getting platform-specific network info: {e}")
        return {
            "io_counters": None,
            "interfaces": {},
            "stats": {}
        }

def get_platform_specific_os_info():
    """Get OS information optimized for different platforms"""
    try:
        system = platform.system()
        boot_time = psutil.boot_time()
        boot_time_dt = datetime.fromtimestamp(boot_time)
        uptime = datetime.now() - boot_time_dt
        
        # Platform-specific additional info
        additional_info = {}
        if system == "Windows":
            try:
                import subprocess
                result = subprocess.run(['ver'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    additional_info["windows_version"] = result.stdout.strip()
            except:
                pass
        elif system == "Darwin":  # macOS
            try:
                result = subprocess.run(['sw_vers', '-productVersion'], 
                                     capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    additional_info["macos_version"] = result.stdout.strip()
            except:
                pass
        elif system == "Linux":
            try:
                with open('/etc/os-release', 'r') as f:
                    for line in f:
                        if line.startswith('PRETTY_NAME'):
                            additional_info["linux_distro"] = line.split('=')[1].strip().strip('"')
                            break
            except:
                pass
        
        return {
            "system": system,
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "hostname": socket.gethostname(),
            "boot_time": boot_time_dt.isoformat(),
            "uptime": {
                "days": uptime.days,
                "hours": uptime.seconds // 3600,
                "minutes": (uptime.seconds % 3600) // 60,
                "seconds": uptime.seconds % 60
            },
            "additional_info": additional_info
        }
    except Exception as e:
        logging.error(f"Error getting platform-specific OS info: {e}")
        return {
            "system": platform.system(),
            "release": platform.release(),
            "version": platform.version(),
            "machine": platform.machine(),
            "processor": platform.processor(),
            "hostname": socket.gethostname(),
            "boot_time": datetime.now().isoformat(),
            "uptime": {"days": 0, "hours": 0, "minutes": 0, "seconds": 0},
            "additional_info": {}
        }

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('system_monitor.log')
    ]
)
logger = logging.getLogger(__name__)

load_dotenv()

app = FastAPI(title="System Info API", version="1.0.0")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Simple authentication (in production, use proper JWT)
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ADMIN_USERNAME = os.getenv("ADMIN_USERNAME", "admin")
ADMIN_PASSWORD = os.getenv("ADMIN_PASSWORD", "admin123")

security = HTTPBearer()

# Global cache for system metrics
system_cache = {}
cache_lock = asyncio.Lock()
CACHE_TTL = 2  # 2 seconds cache TTL for more real-time updates

# Network utilization tracking
network_stats_cache = {}
network_last_check = None

# Shareable links storage with expiry
shareable_links = {}

# Thread pool for CPU-intensive operations
executor = ThreadPoolExecutor(max_workers=4)

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
        else:
            logger.warning("Attempted to disconnect WebSocket that was not in active connections")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        try:
            await websocket.send_text(message)
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            # Only disconnect if the websocket is still in active connections
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
        
        # Remove disconnected connections
        for connection in disconnected_connections:
            self.disconnect(connection)

manager = ConnectionManager()

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if credentials.credentials != "valid-token":
        raise HTTPException(status_code=401, detail="Invalid token")
    return credentials.credentials

# Cache management functions
async def get_cached_data(key: str, ttl: int = CACHE_TTL):
    """Get cached data if it's still valid"""
    async with cache_lock:
        if key in system_cache:
            data, timestamp = system_cache[key]
            if time.time() - timestamp < ttl:
                return data
    return None

async def set_cached_data(key: str, data: Any):
    """Set cached data with timestamp"""
    async with cache_lock:
        system_cache[key] = (data, time.time())

async def clear_cache():
    """Clear all cached data"""
    async with cache_lock:
        system_cache.clear()
        logger.info("Cache cleared")

def generate_shareable_link(file_path: str, expires_in: int = 1200) -> dict:
    """Generate a shareable link for a file with expiry"""
    link_id = secrets.token_urlsafe(16)
    expires_at = datetime.now() + timedelta(seconds=expires_in)
    
    shareable_links[link_id] = {
        "file_path": file_path,
        "expires_at": expires_at,
        "created_at": datetime.now()
    }
    
    # Clean up expired links
    cleanup_expired_links()
    
    return {
        "link_id": link_id,
        "url": f"/api/files/share/{link_id}",
        "expires_at": expires_at.isoformat(),
        "file_path": file_path
    }

def cleanup_expired_links():
    """Remove expired shareable links"""
    current_time = datetime.now()
    expired_links = [
        link_id for link_id, link_data in shareable_links.items()
        if link_data["expires_at"] < current_time
    ]
    for link_id in expired_links:
        del shareable_links[link_id]
    if expired_links:
        logger.info(f"Cleaned up {len(expired_links)} expired shareable links")

def get_file_mime_type(file_path: str) -> str:
    """Get MIME type for a file"""
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type or 'application/octet-stream'

# Optimized CPU info with caching - Cross-platform optimized
async def get_cpu_info_optimized():
    cached = await get_cached_data('cpu_info', 1)  # 1 second cache for real-time updates
    if cached:
        return cached
    
    # Run CPU-intensive operations in thread pool
    loop = asyncio.get_event_loop()
    
    # Use a more reliable CPU percentage calculation
    def get_cpu_percent():
        # First call to initialize the counter
        psutil.cpu_percent(interval=None)
        # Small delay to get accurate measurement
        import time
        time.sleep(0.1)
        # Get the actual percentage
        return psutil.cpu_percent(interval=None)
    
    def get_cpu_percent_per_core():
        # First call to initialize the counter
        psutil.cpu_percent(interval=None, percpu=True)
        # Small delay to get accurate measurement
        import time
        time.sleep(0.1)
        # Get the actual percentage per core
        return psutil.cpu_percent(interval=None, percpu=True)
    
    # Get platform-specific CPU info
    def get_platform_cpu_info():
        return get_platform_specific_cpu_info()
    
    cpu_percent = await loop.run_in_executor(executor, get_cpu_percent)
    cpu_percent_per_core = await loop.run_in_executor(executor, get_cpu_percent_per_core)
    platform_cpu_info = await loop.run_in_executor(executor, get_platform_cpu_info)
    
    # Ensure we don't return 0 if there's actual CPU usage
    # Use a minimum threshold or alternative calculation
    if cpu_percent == 0.0:
        # Try alternative method using CPU times
        def get_cpu_usage_alternative():
            cpu_times = psutil.cpu_times_percent(interval=0.1)
            # Calculate total CPU usage from user + system + nice (handle Windows)
            nice_value = getattr(cpu_times, 'nice', 0.0)
            return cpu_times.user + cpu_times.system + nice_value
        
        cpu_percent = await loop.run_in_executor(executor, get_cpu_usage_alternative)
    
    # Handle CPU frequency safely
    cpu_freq_info = {
        "current": None,
        "min": None,
        "max": None
    }
    
    if platform_cpu_info["cpu_freq"]:
        try:
            cpu_freq_info = {
                "current": platform_cpu_info["cpu_freq"].current,
                "min": platform_cpu_info["cpu_freq"].min,
                "max": platform_cpu_info["cpu_freq"].max
            }
        except (AttributeError, TypeError):
            pass
    
    result = {
        "timestamp": datetime.now().isoformat(),
        "cpu_percent": cpu_percent,
        "cpu_count": platform_cpu_info["cpu_count"],
        "cpu_count_logical": platform_cpu_info["cpu_count_logical"],
        "cpu_count_physical": platform_cpu_info["cpu_count_physical"],
        "cpu_freq": cpu_freq_info,
        "cpu_percent_per_core": cpu_percent_per_core,
        "cpu_model": platform_cpu_info["cpu_model"],
        "platform": platform_cpu_info["system"]
    }
    
    await set_cached_data('cpu_info', result)
    return result

@app.post("/api/auth/login", response_model=LoginResponse)
async def login(request: LoginRequest):
    logger.info(f"Login attempt for user: {request.username}")
    if request.username == ADMIN_USERNAME and request.password == ADMIN_PASSWORD:
        logger.info(f"Login successful for user: {request.username}")
        return LoginResponse(access_token="valid-token", token_type="bearer")
    logger.warning(f"Login failed for user: {request.username}")
    raise HTTPException(status_code=401, detail="Invalid credentials")

@app.get("/api/system/cpu")
async def get_cpu_info(token: str = Depends(verify_token)):
    try:
        logger.debug("Fetching CPU info")
        return await get_cpu_info_optimized()
    except Exception as e:
        logger.error(f"Error fetching CPU info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/cpu/detailed")
async def get_detailed_cpu_info(token: str = Depends(verify_token)):
    """Get detailed CPU information with multiple calculation methods - Cross-platform optimized"""
    try:
        logger.debug("Fetching detailed CPU info")
        loop = asyncio.get_event_loop()
        
        # Method 1: Standard psutil CPU percent
        def get_standard_cpu():
            psutil.cpu_percent(interval=None)
            import time
            time.sleep(0.1)
            return psutil.cpu_percent(interval=None)
        
        # Method 2: CPU times calculation
        def get_cpu_times():
            cpu_times = psutil.cpu_times_percent(interval=0.1)
            # Handle Windows vs Unix differences
            nice_value = getattr(cpu_times, 'nice', 0.0)
            iowait_value = getattr(cpu_times, 'iowait', 0.0)
            irq_value = getattr(cpu_times, 'irq', 0.0)
            softirq_value = getattr(cpu_times, 'softirq', 0.0)
            steal_value = getattr(cpu_times, 'steal', 0.0)
            guest_value = getattr(cpu_times, 'guest', 0.0)
            guest_nice_value = getattr(cpu_times, 'guest_nice', 0.0)
            
            return {
                "user": cpu_times.user,
                "system": cpu_times.system,
                "idle": cpu_times.idle,
                "nice": nice_value,
                "iowait": iowait_value,
                "irq": irq_value,
                "softirq": softirq_value,
                "steal": steal_value,
                "guest": guest_value,
                "guest_nice": guest_nice_value,
                "total_active": cpu_times.user + cpu_times.system + nice_value
            }
        
        # Method 3: Per-core detailed information with safe frequency handling
        def get_per_core_detailed():
            cpu_percent_per_core = psutil.cpu_percent(interval=0.1, percpu=True)
            
            # Safely get per-core frequency
            cpu_freq_per_core = []
            try:
                cpu_freq_per_core = psutil.cpu_freq(percpu=True)
            except (AttributeError, FileNotFoundError, OSError):
                # Fallback: create empty frequency data
                cpu_freq_per_core = [None] * len(cpu_percent_per_core)
            
            detailed_cores = []
            for i, percent in enumerate(cpu_percent_per_core):
                freq = cpu_freq_per_core[i] if i < len(cpu_freq_per_core) else None
                detailed_cores.append({
                    "core": i,
                    "percent": percent,
                    "frequency": {
                        "current": freq.current if freq else None,
                        "min": freq.min if freq else None,
                        "max": freq.max if freq else None
                    }
                })
            return detailed_cores
        
        # Get platform-specific CPU info
        def get_platform_cpu_info():
            return get_platform_specific_cpu_info()
        
        # Get all CPU information concurrently
        standard_cpu = await loop.run_in_executor(executor, get_standard_cpu)
        cpu_times = await loop.run_in_executor(executor, get_cpu_times)
        per_core_detailed = await loop.run_in_executor(executor, get_per_core_detailed)
        platform_cpu_info = await loop.run_in_executor(executor, get_platform_cpu_info)
        
        # Use the most reliable method as the primary CPU percentage
        primary_cpu_percent = max(standard_cpu, cpu_times["total_active"])
        
        # Handle CPU frequency safely
        cpu_freq_info = {
            "current": None,
            "min": None,
            "max": None
        }
        
        if platform_cpu_info["cpu_freq"]:
            try:
                cpu_freq_info = {
                    "current": platform_cpu_info["cpu_freq"].current,
                    "min": platform_cpu_info["cpu_freq"].min,
                    "max": platform_cpu_info["cpu_freq"].max
                }
            except (AttributeError, TypeError):
                pass
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": primary_cpu_percent,
            "cpu_count": platform_cpu_info["cpu_count"],
            "cpu_count_logical": platform_cpu_info["cpu_count_logical"],
            "cpu_count_physical": platform_cpu_info["cpu_count_physical"],
            "cpu_freq": cpu_freq_info,
            "cpu_times": cpu_times,
            "cpu_percent_per_core": [core["percent"] for core in per_core_detailed],
            "cpu_cores_detailed": per_core_detailed,
            "cpu_model": platform_cpu_info["cpu_model"],
            "platform": platform_cpu_info["system"],
            "calculation_methods": {
                "standard_psutil": standard_cpu,
                "cpu_times_total": cpu_times["total_active"],
                "primary_used": primary_cpu_percent
            }
        }
        
        return result
    except Exception as e:
        logger.error(f"Error fetching detailed CPU info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/memory")
async def get_memory_info(token: str = Depends(verify_token)):
    try:
        cached = await get_cached_data('memory_info', 1)  # 1 second cache for real-time updates
        if cached:
            return cached
        
        loop = asyncio.get_event_loop()
        
        # Get platform-specific memory info
        def get_platform_memory_info():
            return get_platform_specific_memory_info()
        
        platform_memory_info = await loop.run_in_executor(executor, get_platform_memory_info)
        
        # Handle memory info safely
        memory_info = {
            "total": 0,
            "available": 0,
            "used": 0,
            "free": 0,
            "percent": 0
        }
        
        swap_info = {
            "total": 0,
            "used": 0,
            "free": 0,
            "percent": 0
        }
        
        if platform_memory_info["memory"]:
            try:
                memory = platform_memory_info["memory"]
                memory_info = {
                    "total": memory.total,
                    "available": memory.available,
                    "used": memory.used,
                    "free": memory.free,
                    "percent": memory.percent
                }
            except (AttributeError, TypeError):
                pass
        
        if platform_memory_info["swap"]:
            try:
                swap = platform_memory_info["swap"]
                swap_info = {
                    "total": swap.total,
                    "used": swap.used,
                    "free": swap.free,
                    "percent": swap.percent
                }
            except (AttributeError, TypeError):
                pass
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "memory": memory_info,
            "swap": swap_info,
            "platform": platform.system()
        }
        
        await set_cached_data('memory_info', result)
        return result
    except Exception as e:
        logger.error(f"Error fetching memory info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/disk")
async def get_disk_info(token: str = Depends(verify_token)):
    try:
        cached = await get_cached_data('disk_info', 2)  # 2 second cache for disk info
        if cached:
            return cached
        
        loop = asyncio.get_event_loop()
        
        # Get platform-specific disk info
        def get_platform_disk_info():
            return get_platform_specific_disk_info()
        
        platform_disk_info = await loop.run_in_executor(executor, get_platform_disk_info)
        
        disk_usage = {}
        if platform_disk_info["partitions"]:
            for partition in platform_disk_info["partitions"]:
                try:
                    usage = await loop.run_in_executor(executor, lambda p=partition: psutil.disk_usage(p.mountpoint))
                    disk_usage[partition.device] = {
                        "mountpoint": partition.mountpoint,
                        "fstype": partition.fstype,
                        "total": usage.total,
                        "used": usage.used,
                        "free": usage.free,
                        "percent": usage.percent
                    }
                except (PermissionError, FileNotFoundError, OSError):
                    continue
        
        # Handle IO counters safely
        io_counters = {
            "read_count": 0,
            "write_count": 0,
            "read_bytes": 0,
            "write_bytes": 0
        }
        
        if platform_disk_info["io_counters"]:
            try:
                disk_io = platform_disk_info["io_counters"]
                io_counters = {
                    "read_count": disk_io.read_count,
                    "write_count": disk_io.write_count,
                    "read_bytes": disk_io.read_bytes,
                    "write_bytes": disk_io.write_bytes
                }
            except (AttributeError, TypeError):
                pass
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "partitions": disk_usage,
            "io_counters": io_counters,
            "platform": platform.system()
        }
        
        await set_cached_data('disk_info', result)
        return result
    except Exception as e:
        logger.error(f"Error fetching disk info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/network")
async def get_network_info(token: str = Depends(verify_token)):
    try:
        cached = await get_cached_data('network_info', 1)  # 1 second cache for real-time network info
        if cached:
            return cached
        
        loop = asyncio.get_event_loop()
        
        # Get platform-specific network info
        def get_platform_network_info():
            return get_platform_specific_network_info()
        
        platform_network_info = await loop.run_in_executor(executor, get_platform_network_info)
        
        # Handle network data safely
        network_io = platform_network_info["io_counters"]
        network_interfaces = platform_network_info["interfaces"]
        network_stats = platform_network_info["stats"]
        
        # Calculate real-time network utilization
        current_time = time.time()
        global network_last_check, network_stats_cache
        
        utilization = {
            "bytes_sent_per_sec": 0,
            "bytes_recv_per_sec": 0,
            "packets_sent_per_sec": 0,
            "packets_recv_per_sec": 0,
            "mb_sent_per_sec": 0,
            "mb_recv_per_sec": 0
        }
        
        if network_last_check and network_last_check in network_stats_cache:
            # Calculate speed based on time difference
            time_diff = current_time - network_last_check
            if time_diff > 0:
                prev_stats = network_stats_cache[network_last_check]
                
                # Calculate bytes per second
                bytes_sent_diff = network_io.bytes_sent - prev_stats['bytes_sent']
                bytes_recv_diff = network_io.bytes_recv - prev_stats['bytes_recv']
                packets_sent_diff = network_io.packets_sent - prev_stats['packets_sent']
                packets_recv_diff = network_io.packets_recv - prev_stats['packets_recv']
                
                utilization = {
                    "bytes_sent_per_sec": bytes_sent_diff / time_diff,
                    "bytes_recv_per_sec": bytes_recv_diff / time_diff,
                    "packets_sent_per_sec": packets_sent_diff / time_diff,
                    "packets_recv_per_sec": packets_recv_diff / time_diff,
                    "mb_sent_per_sec": (bytes_sent_diff / time_diff) / (1024 * 1024),
                    "mb_recv_per_sec": (bytes_recv_diff / time_diff) / (1024 * 1024)
                }
        
        # Store current stats for next calculation
        network_stats_cache[current_time] = {
            'bytes_sent': network_io.bytes_sent,
            'bytes_recv': network_io.bytes_recv,
            'packets_sent': network_io.packets_sent,
            'packets_recv': network_io.packets_recv
        }
        network_last_check = current_time
        
        # Clean up old cache entries (keep last 10 entries)
        if len(network_stats_cache) > 10:
            oldest_keys = sorted(network_stats_cache.keys())[:-10]
            for key in oldest_keys:
                del network_stats_cache[key]
        
        interfaces = {}
        for interface_name, addresses in network_interfaces.items():
            interface_info = {
                "addresses": [],
                "stats": {}
            }
            
            for addr in addresses:
                interface_info["addresses"].append({
                    "family": str(addr.family),
                    "address": addr.address,
                    "netmask": addr.netmask,
                    "broadcast": addr.broadcast
                })
            
            if interface_name in network_stats:
                stats = network_stats[interface_name]
                interface_info["stats"] = {
                    "isup": stats.isup,
                    "duplex": stats.duplex,
                    "speed": stats.speed,
                    "mtu": stats.mtu
                }
            
            interfaces[interface_name] = interface_info
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "interfaces": interfaces,
            "io_counters": {
                "bytes_sent": network_io.bytes_sent,
                "bytes_recv": network_io.bytes_recv,
                "packets_sent": network_io.packets_sent,
                "packets_recv": network_io.packets_recv
            },
            "utilization": utilization,
            "formatted_utilization": {
                "upload_speed": f"{utilization['mb_sent_per_sec']:.2f} MB/s",
                "download_speed": f"{utilization['mb_recv_per_sec']:.2f} MB/s",
                "upload_packets": f"{utilization['packets_sent_per_sec']:.1f} pkt/s",
                "download_packets": f"{utilization['packets_recv_per_sec']:.1f} pkt/s"
            }
        }
        
        await set_cached_data('network_info', result)
        return result
    except Exception as e:
        logger.error(f"Error fetching network info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/os")
async def get_os_info(token: str = Depends(verify_token)):
    try:
        cached = await get_cached_data('os_info', 60)  # Cache OS info for 1 minute
        if cached:
            return cached
        
        loop = asyncio.get_event_loop()
        
        # Get platform-specific OS info
        def get_platform_os_info():
            return get_platform_specific_os_info()
        
        platform_os_info = await loop.run_in_executor(executor, get_platform_os_info)
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "system": platform_os_info["system"],
            "release": platform_os_info["release"],
            "version": platform_os_info["version"],
            "machine": platform_os_info["machine"],
            "processor": platform_os_info["processor"],
            "hostname": platform_os_info["hostname"],
            "boot_time": platform_os_info["boot_time"],
            "uptime": platform_os_info["uptime"],
            "additional_info": platform_os_info["additional_info"]
        }
        
        await set_cached_data('os_info', result)
        return result
    except Exception as e:
        logger.error(f"Error fetching OS info: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/system/summary")
async def get_system_summary(token: str = Depends(verify_token)):
    try:
        cached = await get_cached_data('system_summary', 1)  # 1 second cache for real-time updates
        if cached:
            return cached
        
        # Get all metrics concurrently
        cpu_task = get_cpu_info_optimized()
        memory_task = get_memory_info(token)
        
        cpu_data, memory_data = await asyncio.gather(cpu_task, memory_task)
        
        # Get disk usage for main partition using platform-specific approach
        loop = asyncio.get_event_loop()
        
        def get_platform_disk_info():
            return get_platform_specific_disk_info()
        
        platform_disk_info = await loop.run_in_executor(executor, get_platform_disk_info)
        
        disk_usage = {}
        if platform_disk_info["partitions"]:
            for partition in platform_disk_info["partitions"]:
                try:
                    usage = await loop.run_in_executor(executor, lambda p=partition: psutil.disk_usage(p.mountpoint))
                    disk_usage[partition.device] = {
                        "mountpoint": partition.mountpoint,
                        "total": usage.total,
                        "used": usage.used,
                        "free": usage.free,
                        "percent": usage.percent
                    }
                    break  # Just get the first partition for summary
                except (PermissionError, FileNotFoundError, OSError):
                    continue
        
        # Get network info safely
        network_bytes_sent = 0
        network_bytes_recv = 0
        
        def get_platform_network_info():
            return get_platform_specific_network_info()
        
        platform_network_info = await loop.run_in_executor(executor, get_platform_network_info)
        
        if platform_network_info["io_counters"]:
            try:
                network_io = platform_network_info["io_counters"]
                network_bytes_sent = network_io.bytes_sent
                network_bytes_recv = network_io.bytes_recv
            except (AttributeError, TypeError):
                pass
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": cpu_data["cpu_percent"],
            "memory_percent": memory_data["memory"]["percent"],
            "memory_used": memory_data["memory"]["used"],
            "memory_total": memory_data["memory"]["total"],
            "disk_usage": disk_usage,
            "network_bytes_sent": network_bytes_sent,
            "network_bytes_recv": network_bytes_recv,
            "platform": platform.system()
        }
        
        await set_cached_data('system_summary', result)
        return result
    except Exception as e:
        logger.error(f"Error fetching system summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/system")
async def websocket_endpoint(websocket: WebSocket):
    logger.info("System WebSocket connection attempt")
    await manager.connect(websocket)
    try:
        while True:
            # Send system summary every 2 seconds
            summary = await get_system_summary("valid-token")
            await manager.send_personal_message(json.dumps(summary), websocket)
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        logger.info("System WebSocket disconnected")
        manager.disconnect(websocket)
    except Exception as e:
        logger.error(f"System WebSocket error: {e}")
        manager.disconnect(websocket)

# Optimized processes endpoint with pagination and caching
@app.get("/api/system/processes")
async def get_processes(
    page: int = 1, 
    limit: int = 50, 
    sort_by: str = "cpu_percent", 
    sort_order: str = "desc",
    token: str = Depends(verify_token)
):
    try:
        # Cache key includes pagination parameters
        cache_key = f"processes_{page}_{limit}_{sort_by}_{sort_order}"
        cached = await get_cached_data(cache_key, 1)  # 1 second cache for processes
        if cached:
            return cached
        
        loop = asyncio.get_event_loop()
        
        # Get all processes efficiently
        def get_processes_data():
            processes = []
            for proc in psutil.process_iter(['pid', 'name', 'username', 'memory_percent', 'status', 'create_time']):
                try:
                    pinfo = proc.info
                    # Get CPU percent without blocking
                    pinfo['cpu_percent'] = proc.cpu_percent(interval=None)
                    # Convert create_time to ISO format
                    if pinfo['create_time']:
                        pinfo['create_time'] = datetime.fromtimestamp(pinfo['create_time']).isoformat()
                    processes.append(pinfo)
                except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
                    pass
            return processes
        
        processes = await loop.run_in_executor(executor, get_processes_data)
        
        # Sort processes
        reverse = sort_order == "desc"
        if sort_by == "cpu_percent":
            processes.sort(key=lambda x: x.get('cpu_percent', 0) or 0, reverse=reverse)
        elif sort_by == "memory_percent":
            processes.sort(key=lambda x: x.get('memory_percent', 0) or 0, reverse=reverse)
        elif sort_by == "name":
            processes.sort(key=lambda x: x.get('name', '').lower(), reverse=reverse)
        elif sort_by == "pid":
            processes.sort(key=lambda x: x.get('pid', 0), reverse=reverse)
        
        # Pagination
        total = len(processes)
        start_idx = (page - 1) * limit
        end_idx = start_idx + limit
        paginated_processes = processes[start_idx:end_idx]
        
        result = {
            "timestamp": datetime.now().isoformat(),
            "processes": paginated_processes,
            "pagination": {
                "page": page,
                "limit": limit,
                "total": total,
                "pages": (total + limit - 1) // limit
            }
        }
        
        await set_cached_data(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"Error fetching processes: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Real-time terminal with WebSocket support
@app.websocket("/ws/terminal/{session_id}")
async def terminal_websocket(websocket: WebSocket, session_id: str):
    logger.info(f"Terminal WebSocket connection attempt for session: {session_id}")
    await manager.connect(websocket)
    
    if session_id not in manager.terminal_sessions:
        manager.terminal_sessions[session_id] = {
            "process": None,
            "history": [],
            "connected": True,
            "current_directory": os.getcwd(),
            "environment": dict(os.environ)
        }
        logger.info(f"Created new terminal session: {session_id}")
    
    try:
        # Send welcome message
        welcome_msg = {
            "type": "system",
            "message": f"Terminal session {session_id} established. Ready for commands.",
            "current_directory": manager.terminal_sessions[session_id]["current_directory"]
        }
        await websocket.send_text(json.dumps(welcome_msg))
        logger.info(f"Sent welcome message to session: {session_id}")
        
        # Add a timeout for receiving messages to prevent hanging
        while True:
            try:
                # Use asyncio.wait_for to add a timeout to receive_text
                data = await asyncio.wait_for(websocket.receive_text(), timeout=300.0)  # 5 minute timeout
                message = json.loads(data)
                
                if message["type"] == "command":
                    command = message["command"]
                    logger.info(f"Received command in session {session_id}: {command}")
                    
                    # Enhanced security check with more comprehensive dangerous command detection
                    dangerous_patterns = [
                        # File system destruction
                        r'rm\s+-rf', r'del\s+/s\s+/q', r'format\s+[c-z]:', r'mkfs\..*',
                        # System commands
                        r'shutdown', r'reboot', r'halt', r'poweroff',
                        # Disk operations
                        r'fdisk', r'parted', r'dd\s+if=/dev/zero', r'dd\s+if=/dev/urandom',
                        # Network manipulation
                        r'iptables\s+-F', r'ipconfig\s+/release', r'ipconfig\s+/renew',
                        # User management
                        r'net\s+user\s+add', r'net\s+user\s+delete', r'useradd', r'userdel',
                        # Service manipulation
                        r'sc\s+delete', r'systemctl\s+disable', r'chkconfig\s+--del',
                        # Registry/configuration
                        r'reg\s+delete', r'reg\s+add', r'reg\s+export',
                        # Process manipulation
                        r'taskkill\s+/f', r'killall', r'pkill\s+-9',
                        # Package management
                        r'yum\s+remove', r'apt\s+remove', r'apt\s+purge', r'choco\s+uninstall',
                        # Network scanning
                        r'nmap', r'netstat\s+-an', r'arp\s+-a',
                        # System information gathering
                        r'wmic\s+process', r'wmic\s+service', r'wmic\s+startup'
                    ]
                    
                    import re
                    command_lower = command.lower()
                    if any(re.search(pattern, command_lower) for pattern in dangerous_patterns):
                        error_msg = {
                            "type": "error",
                            "message": "Potentially dangerous command rejected for safety",
                            "command": command
                        }
                        await websocket.send_text(json.dumps(error_msg))
                        logger.warning(f"Dangerous command rejected in session {session_id}: {command}")
                        continue
                    
                    # Execute command asynchronously with real-time output streaming
                    try:
                        logger.info(f"Executing command in session {session_id}: {command}")
                        
                        # Update current directory if it's a cd command
                        if command.strip().startswith('cd '):
                            new_dir = command.strip()[3:].strip()
                            if new_dir:
                                try:
                                    if new_dir == '~':
                                        new_dir = os.path.expanduser('~')
                                    elif not os.path.isabs(new_dir):
                                        new_dir = os.path.join(manager.terminal_sessions[session_id]["current_directory"], new_dir)
                                    
                                    if os.path.exists(new_dir) and os.path.isdir(new_dir):
                                        manager.terminal_sessions[session_id]["current_directory"] = os.path.abspath(new_dir)
                                        success_msg = {
                                            "type": "system",
                                            "message": f"Changed directory to: {manager.terminal_sessions[session_id]['current_directory']}"
                                        }
                                        await websocket.send_text(json.dumps(success_msg))
                                        continue
                                    else:
                                        error_msg = {
                                            "type": "error",
                                            "message": f"Directory not found: {new_dir}"
                                        }
                                        await websocket.send_text(json.dumps(error_msg))
                                        continue
                                except Exception as e:
                                    error_msg = {
                                        "type": "error",
                                        "message": f"Error changing directory: {str(e)}"
                                    }
                                    await websocket.send_text(json.dumps(error_msg))
                                    continue
                        
                        # Prepare environment with current directory
                        env = dict(os.environ)
                        env['PWD'] = manager.terminal_sessions[session_id]["current_directory"]
                        
                        # Use asyncio.create_subprocess_exec for better control
                        if platform.system() == "Windows":
                            process = await asyncio.create_subprocess_exec(
                                'cmd', '/c', command,
                                stdout=asyncio.subprocess.PIPE,
                                stderr=asyncio.subprocess.PIPE,
                                stdin=asyncio.subprocess.PIPE,
                                cwd=manager.terminal_sessions[session_id]["current_directory"],
                                env=env
                            )
                        else:
                            process = await asyncio.create_subprocess_exec(
                                'bash', '-c', command,
                                stdout=asyncio.subprocess.PIPE,
                                stderr=asyncio.subprocess.PIPE,
                                stdin=asyncio.subprocess.PIPE,
                                cwd=manager.terminal_sessions[session_id]["current_directory"],
                                env=env
                            )
                        
                        manager.terminal_sessions[session_id]["process"] = process
                        
                        # Stream output in real-time
                        async def stream_output():
                            try:
                                # Read stdout and stderr concurrently
                                stdout_task = asyncio.create_task(process.stdout.read())
                                stderr_task = asyncio.create_task(process.stderr.read())
                                
                                # Wait for both to complete
                                stdout_data, stderr_data = await asyncio.gather(stdout_task, stderr_task)
                                
                                # Send stdout
                                if stdout_data:
                                    output_msg = {
                                        "type": "output",
                                        "data": stdout_data.decode('utf-8', errors='replace')
                                    }
                                    await websocket.send_text(json.dumps(output_msg))
                                    logger.debug(f"Sent stdout to session {session_id}: {len(stdout_data)} bytes")
                                
                                # Send stderr
                                if stderr_data:
                                    error_msg = {
                                        "type": "error",
                                        "data": stderr_data.decode('utf-8', errors='replace')
                                    }
                                    await websocket.send_text(json.dumps(error_msg))
                                    logger.debug(f"Sent stderr to session {session_id}: {len(stderr_data)} bytes")
                                
                                # Wait for process to complete
                                return_code = await process.wait()
                                
                                # Send exit code
                                exit_msg = {
                                    "type": "exit",
                                    "code": return_code
                                }
                                await websocket.send_text(json.dumps(exit_msg))
                                logger.info(f"Command completed in session {session_id} with exit code: {return_code}")
                                
                            except Exception as e:
                                logger.error(f"Error streaming output in session {session_id}: {e}")
                                error_msg = {
                                    "type": "error",
                                    "message": f"Error streaming command output: {str(e)}"
                                }
                                await websocket.send_text(json.dumps(error_msg))
                        
                        # Start streaming in background
                        asyncio.create_task(stream_output())
                        
                    except Exception as e:
                        error_msg = {
                            "type": "error",
                            "message": f"Command execution failed: {str(e)}"
                        }
                        await websocket.send_text(json.dumps(error_msg))
                        logger.error(f"Command execution failed in session {session_id}: {e}")
                
                elif message["type"] == "get_directory":
                    # Send current directory
                    dir_msg = {
                        "type": "directory",
                        "path": manager.terminal_sessions[session_id]["current_directory"]
                    }
                    await websocket.send_text(json.dumps(dir_msg))
                
                elif message["type"] == "ping":
                    # Respond to ping for connection health check
                    pong_msg = {
                        "type": "pong",
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send_text(json.dumps(pong_msg))
                        
            except asyncio.TimeoutError:
                # Send a heartbeat to keep the connection alive
                try:
                    heartbeat_msg = {
                        "type": "heartbeat",
                        "timestamp": datetime.now().isoformat()
                    }
                    await websocket.send_text(json.dumps(heartbeat_msg))
                    logger.debug(f"Sent heartbeat to session {session_id}")
                except Exception as e:
                    logger.error(f"Failed to send heartbeat to session {session_id}: {e}")
                    break
            except json.JSONDecodeError:
                error_msg = {
                    "type": "error",
                    "message": "Invalid JSON message received"
                }
                await websocket.send_text(json.dumps(error_msg))
                logger.warning(f"Invalid JSON received in session {session_id}")
            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected for session {session_id}")
                break
            except Exception as e:
                logger.error(f"WebSocket receive error in session {session_id}: {e}")
                # Don't break immediately, try to continue the connection
                try:
                    error_msg = {
                        "type": "error",
                        "message": f"Connection error: {str(e)}"
                    }
                    await websocket.send_text(json.dumps(error_msg))
                except:
                    # If we can't send error message, then break
                    logger.error(f"Cannot send error message to session {session_id}, breaking connection")
                    break
    
    except WebSocketDisconnect:
        logger.info(f"Terminal WebSocket disconnected for session {session_id}")
    except Exception as e:
        logger.error(f"Terminal WebSocket error for session {session_id}: {e}")
    finally:
        # Mark session as disconnected
        if session_id in manager.terminal_sessions:
            manager.terminal_sessions[session_id]["connected"] = False
            
        manager.disconnect(websocket)
        # Clean up process if still running
        if session_id in manager.terminal_sessions:
            process = manager.terminal_sessions[session_id]["process"]
            if process and process.returncode is None:
                try:
                    process.terminate()
                    logger.info(f"Terminated process for session {session_id}")
                except:
                    pass
            # Clean up session
            del manager.terminal_sessions[session_id]
            logger.info(f"Cleaned up terminal session: {session_id}")

@app.post("/api/system/command", response_model=CommandResponse)
async def execute_command(command_request: CommandRequest, token: str = Depends(verify_token)):
    try:
        logger.info(f"HTTP command execution: {command_request.command}")
        
        # Simple security check for HTTP endpoint
        dangerous_commands = ['rm -rf', 'shutdown', 'reboot', 'halt', 'poweroff', 'format', 'mkfs', 'dd if=/dev/zero']
        command_lower = command_request.command.lower()
        if any(cmd in command_lower for cmd in dangerous_commands):
            logger.warning(f"Dangerous HTTP command rejected: {command_request.command}")
            raise HTTPException(status_code=403, detail="Potentially dangerous command rejected")
        
        # Execute the command asynchronously
        loop = asyncio.get_event_loop()
        process = await loop.run_in_executor(
            executor,
            lambda: subprocess.run(
                command_request.command,
                shell=True,
                capture_output=True,
                text=True,
                timeout=30  # 30 second timeout
            )
        )
        
        logger.info(f"HTTP command completed with exit code: {process.returncode}")
        return {
            "output": process.stdout,
            "error": process.stderr,
            "exit_code": process.returncode
        }
    except subprocess.TimeoutExpired:
        logger.error(f"HTTP command timed out: {command_request.command}")
        raise HTTPException(status_code=408, detail="Command execution timed out")
    except Exception as e:
        logger.error(f"HTTP command execution failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# Optimized file operations with async support
@app.get("/api/files/list")
async def list_directory(path: str = ".", token: str = Depends(verify_token)):
    try:
        # Handle root path and system drives
        if path == "." or path == "/" or path == "\\" or path == "System Drives":
            # List system drives on Windows
            if platform.system() == "Windows":
                import string
                drives = []
                for letter in string.ascii_uppercase:
                    drive = f"{letter}:\\"
                    if os.path.exists(drive):
                        try:
                            # Use psutil.disk_usage for cross-platform disk space info
                            disk_usage = psutil.disk_usage(drive)
                            drives.append({
                                "name": f"{letter}:",
                                "path": drive,
                                "is_directory": True,
                                "size": None,
                                "modified": datetime.now().isoformat(),
                                "is_drive": True,
                                "free_space": disk_usage.free,
                                "total_space": disk_usage.total
                            })
                        except (PermissionError, OSError):
                            continue
                return {
                    "path": "System Drives",
                    "items": drives,
                    "is_root": True
                }
            else:
                # On Unix systems, start from root
                path = "/"
        
        # Convert to absolute path if relative
        abs_path = os.path.abspath(path)
        
        # Security check - prevent access to system critical directories
        sensitive_paths = [
            "/System", "/Library", "/usr", "/bin", "/sbin", "/etc", "/var", "/tmp",
            "C:\\Windows", "C:\\System32", "C:\\Program Files", "C:\\Program Files (x86)"
        ]
        
        for sensitive in sensitive_paths:
            if abs_path.startswith(sensitive):
                logger.warning(f"Access attempt to sensitive path: {abs_path}")
                raise HTTPException(status_code=403, detail="Access to system directories is restricted for security")
        
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail=f"Path not found: {path}")
        
        if not os.path.isdir(abs_path):
            raise HTTPException(status_code=400, detail=f"Not a directory: {path}")
        
        # Cache key for directory listing
        cache_key = f"dir_list_{hashlib.md5(abs_path.encode()).hexdigest()}"
        cached = await get_cached_data(cache_key, 10)  # 10 second cache for directory listings
        if cached:
            return cached
        
        # Use scandir instead of listdir for better performance
        loop = asyncio.get_event_loop()
        
        def scan_directory():
            items = []
            try:
                with os.scandir(abs_path) as entries:
                    for entry in entries:
                        try:
                            is_dir = entry.is_dir()
                            # Use entry.stat() which is more efficient than os.stat
                            stats = entry.stat()
                            
                            # Get file permissions
                            permissions = oct(stats.st_mode)[-3:] if hasattr(stats, 'st_mode') else "000"
                            
                            items.append({
                                "name": entry.name,
                                "path": os.path.join(path, entry.name),
                                "is_directory": is_dir,
                                "size": None if is_dir else stats.st_size,
                                "modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
                                "permissions": permissions,
                                "readable": os.access(entry.path, os.R_OK),
                                "writable": os.access(entry.path, os.W_OK),
                                "executable": os.access(entry.path, os.X_OK),
                                "is_hidden": entry.name.startswith('.') or (platform.system() == "Windows" and bool(stats.st_file_attributes & 2) if hasattr(stats, 'st_file_attributes') else False)
                            })
                        except (PermissionError, FileNotFoundError, OSError) as e:
                            # Log but continue with other files
                            logger.debug(f"Cannot access {entry.path}: {e}")
                            continue
            except PermissionError as e:
                logger.error(f"Permission denied accessing directory {abs_path}: {e}")
                raise HTTPException(status_code=403, detail="Permission denied accessing directory")
            
            return items
        
        items = await loop.run_in_executor(executor, scan_directory)
        
        # Sort items: directories first, then files, both alphabetically
        items.sort(key=lambda x: (not x["is_directory"], x["name"].lower()))
        
        result = {
            "path": path,
            "items": items,
            "parent_path": os.path.dirname(path) if path not in [".", "/", "\\"] else None
        }
        
        await set_cached_data(cache_key, result)
        return result
    except Exception as e:
        logger.error(f"Error listing directory {path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/content")
async def get_file_content(path: str, token: str = Depends(verify_token)):
    try:
        abs_path = os.path.abspath(path)
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail=f"File not found: {path}")
        
        if os.path.isdir(abs_path):
            raise HTTPException(status_code=400, detail=f"Path is a directory: {path}")
        
        # Check file size to prevent loading huge files
        file_size = os.path.getsize(abs_path)
        if file_size > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=413, detail="File too large to display")
        
        # Check if it's likely a binary file based on extension and MIME type
        mime_type = get_file_mime_type(abs_path)
        file_extension = os.path.splitext(abs_path)[1].lower()
        
        # List of known binary file extensions
        binary_extensions = {
            '.exe', '.dll', '.so', '.dylib', '.bin', '.dat', '.db', '.sqlite', 
            '.sqlite3', '.zip', '.rar', '.7z', '.tar', '.gz', '.bz2', '.xz',
            '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.ico', '.svg',
            '.mp3', '.mp4', '.avi', '.mov', '.wmv', '.flv', '.mkv', '.wav',
            '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
            '.msi', '.pkg', '.deb', '.rpm', '.app', '.dmg'
        }
        
        # Check if it's a known binary file
        if file_extension in binary_extensions or not mime_type.startswith('text/'):
            return {"content": None, "is_binary": True, "mime_type": mime_type}
        
        # Try to read as text, but handle binary files gracefully
        try:
            async with aiofiles.open(abs_path, 'r', encoding='utf-8') as f:
                content = await f.read()
            return {"content": content, "is_binary": False, "mime_type": mime_type}
        except UnicodeDecodeError:
            # It's a binary file that wasn't detected by extension/MIME type
            return {"content": None, "is_binary": True, "mime_type": mime_type}
        except Exception as e:
            logger.error(f"Error reading file content for {path}: {e}")
            raise HTTPException(status_code=500, detail=f"Error reading file content: {str(e)}")
            
    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    except Exception as e:
        logger.error(f"Error reading file {path}: {e}")
        raise HTTPException(status_code=500, detail=f"Error reading file: {str(e)}")

@app.post("/api/files/update")
async def update_file_content(file_update: FileUpdateRequest, token: str = Depends(verify_token)):
    try:
        abs_path = os.path.abspath(file_update.path)
        
        # Security check - prevent updates to system directories
        sensitive_paths = [
            "/System", "/Library", "/usr", "/bin", "/sbin", "/etc", "/var", "/tmp",
            "C:\\Windows", "C:\\System32", "C:\\Program Files", "C:\\Program Files (x86)"
        ]
        
        for sensitive in sensitive_paths:
            if abs_path.startswith(sensitive):
                logger.warning(f"Update attempt to sensitive path: {abs_path}")
                raise HTTPException(status_code=403, detail="Updates to system directories are restricted for security")
        
        # Create parent directories if they don't exist
        parent_dir = os.path.dirname(abs_path)
        if parent_dir and not os.path.exists(parent_dir):
            try:
                os.makedirs(parent_dir, exist_ok=True)
            except PermissionError:
                raise HTTPException(status_code=403, detail="Permission denied creating directory")
        
        # Check if we have write permission
        if os.path.exists(abs_path) and not os.access(abs_path, os.W_OK):
            raise HTTPException(status_code=403, detail="Permission denied writing to file")
        
        async with aiofiles.open(abs_path, 'w', encoding='utf-8') as f:
            await f.write(file_update.content)
        
        # Clear directory cache for the parent directory
        cache_key = f"dir_list_{hashlib.md5(parent_dir.encode()).hexdigest()}"
        async with cache_lock:
            if cache_key in system_cache:
                del system_cache[cache_key]
        
        logger.info(f"File updated: {file_update.path}")
        return {"success": True, "message": f"File updated: {file_update.path}"}
    except Exception as e:
        logger.error(f"Error updating file {file_update.path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/download")
async def download_file(path: str, token: str = Depends(verify_token)):
    try:
        abs_path = os.path.abspath(path)
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail=f"File not found: {path}")
        
        if os.path.isdir(abs_path):
            raise HTTPException(status_code=400, detail=f"Path is a directory: {path}")
        
        # Security check - prevent downloads from system directories
        sensitive_paths = [
            "/System", "/Library", "/usr", "/bin", "/sbin", "/etc", "/var", "/tmp",
            "C:\\Windows", "C:\\System32", "C:\\Program Files", "C:\\Program Files (x86)"
        ]
        
        for sensitive in sensitive_paths:
            if abs_path.startswith(sensitive):
                logger.warning(f"Download attempt from sensitive path: {abs_path}")
                raise HTTPException(status_code=403, detail="Downloads from system directories are restricted for security")
        
        # Get MIME type for proper content type
        mime_type = get_file_mime_type(abs_path)
        filename = os.path.basename(abs_path)
        
        logger.info(f"File download requested: {path}")
        return FileResponse(
            abs_path, 
            filename=filename,
            media_type=mime_type
        )
    except Exception as e:
        logger.error(f"Error downloading file {path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/files/upload")
async def upload_file(path: str, file: UploadFile = File(...), token: str = Depends(verify_token)):
    try:
        abs_path = os.path.abspath(path)
        
        # Security check - prevent uploads to system directories
        sensitive_paths = [
            "/System", "/Library", "/usr", "/bin", "/sbin", "/etc", "/var", "/tmp",
            "C:\\Windows", "C:\\System32", "C:\\Program Files", "C:\\Program Files (x86)"
        ]
        
        for sensitive in sensitive_paths:
            if abs_path.startswith(sensitive):
                logger.warning(f"Upload attempt to sensitive path: {abs_path}")
                raise HTTPException(status_code=403, detail="Upload to system directories is restricted for security")
        
        # Create parent directories if they don't exist
        parent_dir = os.path.dirname(abs_path)
        if parent_dir and not os.path.exists(parent_dir):
            try:
                os.makedirs(parent_dir, exist_ok=True)
            except PermissionError:
                raise HTTPException(status_code=403, detail="Permission denied creating directory")
        
        # Check if we have write permission
        if os.path.exists(abs_path) and not os.access(abs_path, os.W_OK):
            raise HTTPException(status_code=403, detail="Permission denied writing to file")
        
        # Use aiofiles for async file writing
        async with aiofiles.open(abs_path, "wb") as buffer:
            content = await file.read()
            await buffer.write(content)
        
        # Clear directory cache for the parent directory
        cache_key = f"dir_list_{hashlib.md5(parent_dir.encode()).hexdigest()}"
        async with cache_lock:
            if cache_key in system_cache:
                del system_cache[cache_key]
        
        logger.info(f"File uploaded: {path}")
        return {"success": True, "message": f"File uploaded to: {path}"}
    except Exception as e:
        logger.error(f"Error uploading file to {path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/files/create-directory")
async def create_directory(request: CreateDirectoryRequest, token: str = Depends(verify_token)):
    """Create a new directory"""
    try:
        abs_path = os.path.abspath(request.path)
        
        # Security check - prevent creation in system directories
        sensitive_paths = [
            "/System", "/Library", "/usr", "/bin", "/sbin", "/etc", "/var", "/tmp",
            "C:\\Windows", "C:\\System32", "C:\\Program Files", "C:\\Program Files (x86)"
        ]
        
        for sensitive in sensitive_paths:
            if abs_path.startswith(sensitive):
                logger.warning(f"Directory creation attempt in sensitive path: {abs_path}")
                raise HTTPException(status_code=403, detail="Creation in system directories is restricted for security")
        
        # Create parent directories if they don't exist
        parent_dir = os.path.dirname(abs_path)
        if parent_dir and not os.path.exists(parent_dir):
            try:
                os.makedirs(parent_dir, exist_ok=True)
            except PermissionError:
                raise HTTPException(status_code=403, detail="Permission denied creating parent directory")
        
        # Create the directory
        try:
            os.makedirs(abs_path, exist_ok=True)
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied creating directory")
        
        # Clear directory cache for the parent directory
        cache_key = f"dir_list_{hashlib.md5(parent_dir.encode()).hexdigest()}"
        async with cache_lock:
            if cache_key in system_cache:
                del system_cache[cache_key]
        
        logger.info(f"Directory created: {request.path}")
        return {"success": True, "message": f"Directory created: {request.path}"}
    except Exception as e:
        logger.error(f"Error creating directory {request.path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.delete("/api/files/delete")
async def delete_file_or_directory(path: str, token: str = Depends(verify_token)):
    """Delete a file or directory"""
    try:
        abs_path = os.path.abspath(path)
        
        # Security check - prevent deletion in system directories
        sensitive_paths = [
            "/System", "/Library", "/usr", "/bin", "/sbin", "/etc", "/var", "/tmp",
            "C:\\Windows", "C:\\System32", "C:\\Program Files", "C:\\Program Files (x86)"
        ]
        
        for sensitive in sensitive_paths:
            if abs_path.startswith(sensitive):
                logger.warning(f"Deletion attempt in sensitive path: {abs_path}")
                raise HTTPException(status_code=403, detail="Deletion in system directories is restricted for security")
        
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="File or directory not found")
        
        # Check permissions
        if not os.access(abs_path, os.W_OK):
            raise HTTPException(status_code=403, detail="Permission denied deleting file/directory")
        
        # Delete file or directory
        try:
            if os.path.isdir(abs_path):
                shutil.rmtree(abs_path)
            else:
                os.remove(abs_path)
        except PermissionError:
            raise HTTPException(status_code=403, detail="Permission denied deleting file/directory")
        
        # Clear directory cache for the parent directory
        parent_dir = os.path.dirname(abs_path)
        cache_key = f"dir_list_{hashlib.md5(parent_dir.encode()).hexdigest()}"
        async with cache_lock:
            if cache_key in system_cache:
                del system_cache[cache_key]
        
        logger.info(f"Deleted: {path}")
        return {"success": True, "message": f"Deleted: {path}"}
    except Exception as e:
        logger.error(f"Error deleting {path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/binary-info")
async def get_binary_file_info(path: str, token: str = Depends(verify_token)):
    """Get information about a binary file for display"""
    try:
        abs_path = os.path.abspath(path)
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail=f"File not found: {path}")
        
        if os.path.isdir(abs_path):
            raise HTTPException(status_code=400, detail=f"Path is a directory: {path}")
        
        # Get file stats
        stats = os.stat(abs_path)
        mime_type = get_file_mime_type(abs_path)
        
        # Determine file type category
        file_category = "unknown"
        if mime_type.startswith('image/'):
            file_category = "image"
        elif mime_type.startswith('video/'):
            file_category = "video"
        elif mime_type.startswith('audio/'):
            file_category = "audio"
        elif mime_type == 'application/pdf':
            file_category = "pdf"
        elif mime_type.startswith('text/'):
            file_category = "text"
        
        return {
            "path": path,
            "name": os.path.basename(abs_path),
            "size": stats.st_size,
            "mime_type": mime_type,
            "file_category": file_category,
            "modified": datetime.fromtimestamp(stats.st_mtime).isoformat(),
            "readable": os.access(abs_path, os.R_OK)
        }
    except Exception as e:
        logger.error(f"Error getting binary file info {path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/files/create-share-link", response_model=ShareableLinkResponse)
async def create_shareable_link(request: ShareableLinkRequest, token: str = Depends(verify_token)):
    """Create a shareable link for a file with expiry"""
    try:
        abs_path = os.path.abspath(request.path)
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail=f"File not found: {request.path}")
        
        if os.path.isdir(abs_path):
            raise HTTPException(status_code=400, detail=f"Cannot create shareable link for directory: {request.path}")
        
        # Security check - prevent sharing from system directories
        sensitive_paths = [
            "/System", "/Library", "/usr", "/bin", "/sbin", "/etc", "/var", "/tmp",
            "C:\\Windows", "C:\\System32", "C:\\Program Files", "C:\\Program Files (x86)"
        ]
        
        for sensitive in sensitive_paths:
            if abs_path.startswith(sensitive):
                logger.warning(f"Share link creation attempt for sensitive path: {abs_path}")
                raise HTTPException(status_code=403, detail="Cannot create shareable links for system files")
        
        # Generate shareable link
        link_data = generate_shareable_link(request.path, request.expires_in)
        
        logger.info(f"Created shareable link for {request.path}: {link_data['link_id']}")
        return ShareableLinkResponse(**link_data)
    except Exception as e:
        logger.error(f"Error creating shareable link for {request.path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/share/{link_id}")
async def access_shareable_link(link_id: str):
    """Access a file through a shareable link"""
    try:
        # Check if link exists and is not expired
        if link_id not in shareable_links:
            raise HTTPException(status_code=404, detail="Shareable link not found or expired")
        
        link_data = shareable_links[link_id]
        if link_data["expires_at"] < datetime.now():
            # Remove expired link
            del shareable_links[link_id]
            raise HTTPException(status_code=410, detail="Shareable link has expired")
        
        file_path = link_data["file_path"]
        abs_path = os.path.abspath(file_path)
        
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        if os.path.isdir(abs_path):
            raise HTTPException(status_code=400, detail="Cannot access directory through shareable link")
        
        # Return file for download/streaming
        mime_type = get_file_mime_type(abs_path)
        filename = os.path.basename(abs_path)
        
        return FileResponse(
            abs_path,
            filename=filename,
            media_type=mime_type
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error accessing shareable link {link_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/stream")
async def stream_file(path: str, token: str = None):
    """Stream a file directly (for media files)"""
    # For streaming, accept token as query parameter for browser compatibility
    if token != "valid-token":
        raise HTTPException(status_code=403, detail="Invalid token")
    try:
        abs_path = os.path.abspath(path)
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail=f"File not found: {path}")
        
        if os.path.isdir(abs_path):
            raise HTTPException(status_code=400, detail=f"Cannot stream directory: {path}")
        
        # Get MIME type
        mime_type = get_file_mime_type(abs_path)
        
        # For media files, return streaming response with proper headers
        if mime_type.startswith(('video/', 'audio/', 'image/')):
            return FileResponse(
                abs_path,
                media_type=mime_type,
                headers={
                    "Accept-Ranges": "bytes",
                    "Cache-Control": "public, max-age=3600",
                    "Access-Control-Allow-Origin": "*"
                }
            )
        else:
            # For other files, return as download
            filename = os.path.basename(abs_path)
            return FileResponse(
                abs_path,
                filename=filename,
                media_type=mime_type
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error streaming file {path}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/files/stream/{link_id}")
async def stream_shareable_file(link_id: str):
    """Stream a file through a shareable link (for media files)"""
    try:
        # Check if link exists and is not expired
        if link_id not in shareable_links:
            raise HTTPException(status_code=404, detail="Shareable link not found or expired")
        
        link_data = shareable_links[link_id]
        if link_data["expires_at"] < datetime.now():
            # Remove expired link
            del shareable_links[link_id]
            raise HTTPException(status_code=410, detail="Shareable link has expired")
        
        file_path = link_data["file_path"]
        abs_path = os.path.abspath(file_path)
        
        if not os.path.exists(abs_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        if os.path.isdir(abs_path):
            raise HTTPException(status_code=400, detail="Cannot stream directory")
        
        # Get MIME type
        mime_type = get_file_mime_type(abs_path)
        
        # For media files, return streaming response
        if mime_type.startswith(('video/', 'audio/', 'image/')):
            return FileResponse(
                abs_path,
                media_type=mime_type,
                headers={"Accept-Ranges": "bytes"}
            )
        else:
            # For other files, return as download
            filename = os.path.basename(abs_path)
            return FileResponse(
                abs_path,
                filename=filename,
                media_type=mime_type
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error streaming shareable file {link_id}: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/system/clear-cache")
async def clear_system_cache(token: str = Depends(verify_token)):
    """Clear all cached system data for real-time updates"""
    try:
        await clear_cache()
        logger.info("System cache cleared")
        return {"success": True, "message": "Cache cleared successfully"}
    except Exception as e:
        logger.error(f"Error clearing cache: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    logger.info("Starting System Monitor API server...")
    uvicorn.run(app, host="0.0.0.0", port=8000)