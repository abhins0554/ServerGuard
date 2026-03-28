import psutil
import platform
import socket
import logging
from datetime import datetime, timedelta
import mimetypes
import secrets
import io
import base64
from mss import mss
from PIL import Image
import pyautogui

import asyncio
import re
import subprocess

logger = logging.getLogger(__name__)

async def ping_ip(ip, system):
    """Ping a single IP address asynchronously"""
    try:
        if system == "Windows":
            # Windows: -w is in milliseconds. 200ms is usually enough for local network.
            proc = await asyncio.create_subprocess_exec(
                'ping', '-n', '1', '-w', '200', ip,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            # wait_for slightly longer than -w
            await asyncio.wait_for(proc.communicate(), timeout=0.5)
        else:
            # Linux: -W is in seconds. 1s is the minimum.
            proc = await asyncio.create_subprocess_exec(
                'ping', '-c', '1', '-W', '1', ip,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            await asyncio.wait_for(proc.communicate(), timeout=1.2)
        return ip if proc.returncode == 0 else None
    except:
        return None

async def ping_scan_network(base_ip, start_octet, end_octet):
    """Scan a network range using pings in batches"""
    system = platform.system()
    device_ips = []
    ips_to_scan = [f"{base_ip}.{i}" for i in range(start_octet, end_octet + 1)]
    
    # Increase batch size for better parallelism
    batch_size = 100
    for i in range(0, len(ips_to_scan), batch_size):
        batch = ips_to_scan[i:i+batch_size]
        results = await asyncio.gather(*[ping_ip(ip, system) for ip in batch], return_exceptions=True)
        for result in results:
            if result and isinstance(result, str):
                device_ips.append(result)
    return device_ips

def get_network_range():
    """Calculate local network range for scanning"""
    interfaces = psutil.net_if_addrs()
    network_info = None
    
    for _, addrs in interfaces.items():
        for addr in addrs:
            if addr.family == socket.AF_INET and not addr.address.startswith('127.'):
                ip = addr.address
                if not network_info:
                    try:
                        if addr.netmask:
                            try:
                                import ipaddress
                                network = ipaddress.IPv4Network(f"{ip}/{addr.netmask}", strict=False)
                                hosts = list(network.hosts())
                                if hosts:
                                    start_parts = str(hosts[0]).split('.')
                                    end_parts = str(hosts[-1]).split('.')
                                    network_info = {
                                        "base": f"{start_parts[0]}.{start_parts[1]}.{start_parts[2]}",
                                        "start_octet": int(start_parts[3]),
                                        "end_octet": int(end_parts[3])
                                    }
                            except ImportError:
                                ip_parts = ip.split('.')
                                network_info = {"base": f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}", "start_octet": 1, "end_octet": 254}
                        else:
                            ip_parts = ip.split('.')
                            network_info = {"base": f"{ip_parts[0]}.{ip_parts[1]}.{ip_parts[2]}", "start_octet": 1, "end_octet": 254}
                    except:
                        pass
    return network_info

def get_platform_specific_cpu_info():
    """Get CPU information optimized for different platforms"""
    system = platform.system()
    try:
        cpu_count = psutil.cpu_count()
        cpu_count_logical = psutil.cpu_count(logical=True)
        cpu_count_physical = psutil.cpu_count(logical=False)
        
        cpu_freq = None
        try:
            cpu_freq = psutil.cpu_freq()
        except (AttributeError, FileNotFoundError, OSError):
            pass
        
        cpu_model = platform.processor()
        if not cpu_model or cpu_model == "":
            if system == "Windows":
                try:
                    import subprocess
                    result = subprocess.run(['wmic', 'cpu', 'get', 'name'], capture_output=True, text=True, timeout=5)
                    if result.returncode == 0:
                        lines = result.stdout.strip().split('\n')
                        if len(lines) > 1:
                            cpu_model = lines[1].strip()
                except:
                    cpu_model = "Unknown CPU"
            elif system == "Darwin":
                try:
                    import subprocess
                    result = subprocess.run(['sysctl', '-n', 'machdep.cpu.brand_string'], capture_output=True, text=True, timeout=5)
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
        
        return {
            "cpu_count": cpu_count,
            "cpu_count_logical": cpu_count_logical,
            "cpu_count_physical": cpu_count_physical,
            "cpu_freq": cpu_freq,
            "cpu_model": cpu_model,
            "system": system
        }
    except Exception as e:
        logger.error(f"Error getting platform-specific CPU info: {e}")
        return {
            "cpu_count": 1,
            "cpu_count_logical": 1,
            "cpu_count_physical": 1,
            "cpu_freq": None,
            "cpu_model": "Unknown CPU",
            "system": system
        }

def get_platform_specific_memory_info():
    try:
        memory = psutil.virtual_memory()
        swap = psutil.swap_memory()
        return {"memory": memory, "swap": swap}
    except Exception as e:
        logger.error(f"Error getting platform-specific memory info: {e}")
        return {"memory": None, "swap": None}

def get_platform_specific_disk_info():
    try:
        disk_partitions = psutil.disk_partitions()
        disk_io = psutil.disk_io_counters()
        return {"partitions": disk_partitions, "io_counters": disk_io}
    except Exception as e:
        logger.error(f"Error getting platform-specific disk info: {e}")
        return {"partitions": [], "io_counters": None}

def get_platform_specific_network_info():
    try:
        network_io = psutil.net_io_counters()
        network_interfaces = psutil.net_if_addrs()
        network_stats = psutil.net_if_stats()
        return {"io_counters": network_io, "interfaces": network_interfaces, "stats": network_stats}
    except Exception as e:
        logger.error(f"Error getting platform-specific network info: {e}")
        return {"io_counters": None, "interfaces": {}, "stats": {}}

def get_platform_specific_os_info():
    try:
        system = platform.system()
        boot_time = psutil.boot_time()
        boot_time_dt = datetime.fromtimestamp(boot_time)
        uptime = datetime.now() - boot_time_dt
        additional_info = {}
        if system == "Windows":
            try:
                import subprocess
                result = subprocess.run(['ver'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    additional_info["windows_version"] = result.stdout.strip()
            except:
                pass
        elif system == "Darwin":
            try:
                import subprocess
                result = subprocess.run(['sw_vers', '-productVersion'], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    additional_info["macos_version"] = result.stdout.strip()
                
                # Add macOS thermal/battery info if possible
                battery = psutil.sensors_battery()
                if battery:
                    additional_info["battery"] = {
                        "percent": battery.percent,
                        "plugged": battery.power_plugged,
                        "time_left": battery.secsleft if battery.secsleft != psutil.POWER_TIME_UNLIMITED else -1
                    }
                
                # List active applications (macOS specific)
                script = 'tell application "System Events" to get name of every process whose background only is false'
                result = subprocess.run(['osascript', '-e', script], capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    apps = [app.strip() for app in result.stdout.split(',')]
                    additional_info["active_apps"] = apps
            except Exception as e:
                logger.debug(f"macOS specific info error: {e}")
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
        logger.error(f"Error getting platform-specific OS info: {e}")
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

def get_file_mime_type(file_path: str) -> str:
    mime_type, _ = mimetypes.guess_type(file_path)
    return mime_type or 'application/octet-stream'

def capture_screen(quality=75, scale=1.0):
    try:
        with mss() as sct:
            monitor = sct.monitors[1]
            screenshot = sct.grab(monitor)
            img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
            if scale != 1.0:
                new_size = (int(img.width * scale), int(img.height * scale))
                img = img.resize(new_size, Image.Resampling.LANCZOS)
            buffer = io.BytesIO()
            img.save(buffer, format='JPEG', quality=quality, optimize=True)
            buffer.seek(0)
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return img_base64
    except Exception as e:
        logger.error(f"Error capturing screen: {e}")
        raise

def execute_control_command(control_data: dict):
    try:
        cmd_type = control_data.get('type')
        if cmd_type == 'mouse_move':
            pyautogui.moveTo(control_data.get('x', 0), control_data.get('y', 0), duration=0.01)
        elif cmd_type == 'mouse_click':
            pyautogui.click(control_data.get('x', 0), control_data.get('y', 0), button=control_data.get('button', 'left'))
        elif cmd_type == 'mouse_drag':
            pyautogui.dragTo(control_data.get('x', 0), control_data.get('y', 0), duration=0.1, button='left')
        elif cmd_type == 'mouse_scroll':
            pyautogui.scroll(control_data.get('scroll', 0), x=control_data.get('x', 0), y=control_data.get('y', 0))
        elif cmd_type == 'key_press':
            if control_data.get('key'): pyautogui.press(control_data.get('key'))
        elif cmd_type == 'key_down':
            if control_data.get('key'): pyautogui.keyDown(control_data.get('key'))
        elif cmd_type == 'key_up':
            if control_data.get('key'): pyautogui.keyUp(control_data.get('key'))
        elif cmd_type == 'key_type':
            if control_data.get('text'): pyautogui.write(control_data.get('text'), interval=0.01)
        elif cmd_type == 'key_combination':
            if control_data.get('keys'): pyautogui.hotkey(*control_data.get('keys'))
        return True
    except Exception as e:
        logger.error(f"Error executing control command: {e}")
        return False
