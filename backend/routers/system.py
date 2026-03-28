from typing import List, Dict, Any, Optional
import psutil
import asyncio
import logging
import json
import os
import platform
import time
from datetime import datetime
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException
from dependencies import manager, verify_token, executor, logger
from utils import (
    get_platform_specific_cpu_info,
    get_platform_specific_memory_info,
    get_platform_specific_disk_info,
    get_platform_specific_network_info,
    get_platform_specific_os_info
)

router = APIRouter(prefix="/api/system", tags=["system"])

# Global cache for system metrics
system_cache = {}
cache_lock = asyncio.Lock()
CACHE_TTL = 2

# Network utilization tracking
network_stats_cache = {}
network_last_check = None

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

# Optimized CPU info with caching
async def get_cpu_info_optimized():
    cached = await get_cached_data('cpu_info', 1)
    if cached:
        return cached
    
    loop = asyncio.get_event_loop()
    
    def get_cpu_percent():
        psutil.cpu_percent(interval=None)
        time.sleep(0.1)
        return psutil.cpu_percent(interval=None)
    
    def get_cpu_percent_per_core():
        psutil.cpu_percent(interval=None, percpu=True)
        time.sleep(0.1)
        return psutil.cpu_percent(interval=None, percpu=True)
    
    cpu_percent = await loop.run_in_executor(executor, get_cpu_percent)
    cpu_percent_per_core = await loop.run_in_executor(executor, get_cpu_percent_per_core)
    platform_cpu_info = await loop.run_in_executor(executor, get_platform_specific_cpu_info)
    
    if cpu_percent == 0.0:
        def get_cpu_usage_alternative():
            cpu_times = psutil.cpu_times_percent(interval=0.1)
            nice_value = getattr(cpu_times, 'nice', 0.0)
            return cpu_times.user + cpu_times.system + nice_value
        cpu_percent = await loop.run_in_executor(executor, get_cpu_usage_alternative)
    
    cpu_freq_info = {"current": None, "min": None, "max": None}
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

@router.get("/cpu")
async def get_cpu_info(token: str = Depends(verify_token)):
    return await get_cpu_info_optimized()

@router.get("/cpu/detailed")
async def get_detailed_cpu_info(token: str = Depends(verify_token)):
    loop = asyncio.get_event_loop()
    
    def get_standard_cpu():
        psutil.cpu_percent(interval=None)
        time.sleep(0.1)
        return psutil.cpu_percent(interval=None)
    
    def get_cpu_times():
        cpu_times = psutil.cpu_times_percent(interval=0.1)
        nice_value = getattr(cpu_times, 'nice', 0.0)
        return {
            "user": cpu_times.user,
            "system": cpu_times.system,
            "idle": cpu_times.idle,
            "nice": nice_value,
            "total_active": cpu_times.user + cpu_times.system + nice_value
        }
    
    def get_per_core_detailed():
        cpu_percent_per_core = psutil.cpu_percent(interval=0.1, percpu=True)
        cpu_freq_per_core = []
        try:
            cpu_freq_per_core = psutil.cpu_freq(percpu=True)
        except:
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

    standard_cpu = await loop.run_in_executor(executor, get_standard_cpu)
    cpu_times = await loop.run_in_executor(executor, get_cpu_times)
    per_core_detailed = await loop.run_in_executor(executor, get_per_core_detailed)
    platform_cpu_info = await loop.run_in_executor(executor, get_platform_specific_cpu_info)
    
    primary_cpu_percent = max(standard_cpu, cpu_times["total_active"])
    
    result = {
        "timestamp": datetime.now().isoformat(),
        "cpu_percent": primary_cpu_percent,
        "cpu_count": platform_cpu_info["cpu_count"],
        "cpu_count_logical": platform_cpu_info["cpu_count_logical"],
        "cpu_count_physical": platform_cpu_info["cpu_count_physical"],
        "cpu_freq": {
            "current": platform_cpu_info["cpu_freq"].current if platform_cpu_info["cpu_freq"] else None,
            "min": platform_cpu_info["cpu_freq"].min if platform_cpu_info["cpu_freq"] else None,
            "max": platform_cpu_info["cpu_freq"].max if platform_cpu_info["cpu_freq"] else None
        } if platform_cpu_info["cpu_freq"] else None,
        "cpu_times": cpu_times,
        "cpu_percent_per_core": [core["percent"] for core in per_core_detailed],
        "cpu_cores_detailed": per_core_detailed,
        "cpu_model": platform_cpu_info["cpu_model"],
        "calculation_methods": {
            "standard_psutil": standard_cpu,
            "cpu_times_total": cpu_times["total_active"],
            "primary_used": primary_cpu_percent
        }
    }
    return result

@router.get("/memory")
async def get_memory_info(token: str = Depends(verify_token)):
    cached = await get_cached_data('memory_info', 1)
    if cached:
        return cached
    
    platform_memory_info = await asyncio.get_event_loop().run_in_executor(executor, get_platform_specific_memory_info)
    
    memory_info = {"total": 0, "available": 0, "used": 0, "free": 0, "percent": 0}
    swap_info = {"total": 0, "used": 0, "free": 0, "percent": 0}
    
    if platform_memory_info["memory"]:
        m = platform_memory_info["memory"]
        memory_info = {"total": m.total, "available": m.available, "used": m.used, "free": m.free, "percent": m.percent}
    
    if platform_memory_info["swap"]:
        s = platform_memory_info["swap"]
        swap_info = {"total": s.total, "used": s.used, "free": s.free, "percent": s.percent}
    
    result = {
        "timestamp": datetime.now().isoformat(),
        "memory": memory_info,
        "swap": swap_info,
        "platform": platform.system()
    }
    await set_cached_data('memory_info', result)
    return result

@router.get("/disk")
async def get_disk_info(token: str = Depends(verify_token)):
    cached = await get_cached_data('disk_info', 2)
    if cached:
        return cached
    
    loop = asyncio.get_event_loop()
    platform_disk_info = await loop.run_in_executor(executor, get_platform_specific_disk_info)
    
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
            except:
                continue
    
    io_counters = {"read_count": 0, "write_count": 0, "read_bytes": 0, "write_bytes": 0}
    if platform_disk_info["io_counters"]:
        d_io = platform_disk_info["io_counters"]
        io_counters = {"read_count": d_io.read_count, "write_count": d_io.write_count, "read_bytes": d_io.read_bytes, "write_bytes": d_io.write_bytes}
    
    result = {"timestamp": datetime.now().isoformat(), "partitions": disk_usage, "io_counters": io_counters, "platform": platform.system()}
    await set_cached_data('disk_info', result)
    return result

@router.get("/network")
async def get_network_info(token: str = Depends(verify_token)):
    cached = await get_cached_data('network_info', 1)
    if cached:
        return cached
    
    loop = asyncio.get_event_loop()
    platform_network_info = await loop.run_in_executor(executor, get_platform_specific_network_info)
    
    # Calculate real-time utilization
    current_time = time.time()
    global network_last_check, network_stats_cache
    network_io = platform_network_info["io_counters"]
    
    utilization = {
        "bytes_sent_per_sec": 0, 
        "bytes_recv_per_sec": 0,
        "packets_sent_per_sec": 0,
        "packets_recv_per_sec": 0
    }
    
    if network_last_check and network_last_check in network_stats_cache:
        time_diff = current_time - network_last_check
        if time_diff > 0:
            prev = network_stats_cache[network_last_check]
            utilization = {
                "bytes_sent_per_sec": (network_io.bytes_sent - prev['bytes_sent']) / time_diff,
                "bytes_recv_per_sec": (network_io.bytes_recv - prev['bytes_recv']) / time_diff,
                "packets_sent_per_sec": (network_io.packets_sent - prev.get('packets_sent', network_io.packets_sent)) / time_diff,
                "packets_recv_per_sec": (network_io.packets_recv - prev.get('packets_recv', network_io.packets_recv)) / time_diff
            }
            
    network_stats_cache[current_time] = {
        'bytes_sent': network_io.bytes_sent, 
        'bytes_recv': network_io.bytes_recv,
        'packets_sent': network_io.packets_sent,
        'packets_recv': network_io.packets_recv
    }
    network_last_check = current_time
    # Clean up cache
    if len(network_stats_cache) > 10:
        oldest = min(network_stats_cache.keys())
        del network_stats_cache[oldest]

    # Helper for formatting
    def format_speed(bps):
        if bps < 1024: return f"{bps:.2f} B/s"
        kbps = bps / 1024
        if kbps < 1024: return f"{kbps:.2f} KB/s"
        mbps = kbps / 1024
        return f"{mbps:.2f} MB/s"

    formatted = {
        "upload_speed": format_speed(utilization["bytes_sent_per_sec"]),
        "download_speed": format_speed(utilization["bytes_recv_per_sec"]),
        "upload_packets": f"{utilization['packets_sent_per_sec']:.1f} pkt/s",
        "download_packets": f"{utilization['packets_recv_per_sec']:.1f} pkt/s"
    }

    result = {
        "timestamp": datetime.now().isoformat(),
        "interfaces": platform_network_info["interfaces"],
        "io_counters": {
            "bytes_sent": network_io.bytes_sent,
            "bytes_recv": network_io.bytes_recv,
            "packets_sent": network_io.packets_sent,
            "packets_recv": network_io.packets_recv
        },
        "utilization": utilization,
        "formatted_utilization": formatted
    }
    await set_cached_data('network_info', result)
    return result

@router.get("/os")
async def get_os_info(token: str = Depends(verify_token)):
    return await asyncio.get_event_loop().run_in_executor(executor, get_platform_specific_os_info)

@router.get("/summary")
async def get_system_summary(token: str = Depends(verify_token)):
    try:
        cpu_data = await get_cpu_info_optimized()
        memory_data = await get_memory_info(token)
        disk_data = await get_disk_info(token)
        net_data = await get_network_info(token)
        
        # Get primary disk usage
        partitions = disk_data.get("partitions", {})
        if not partitions:
            # Try to get it directly if partitions is empty
            try:
                usage = psutil.disk_usage('C:\\' if platform.system() == "Windows" else '/')
                partitions["primary"] = {
                    "total": usage.total,
                    "used": usage.used,
                    "free": usage.free,
                    "percent": usage.percent
                }
            except:
                pass

        return {
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": cpu_data.get("cpu_percent", 0),
            "cpu_percent_per_core": cpu_data.get("cpu_percent_per_core", [0]),
            "memory_percent": memory_data.get("memory", {}).get("percent", 0),
            "memory_used": memory_data.get("memory", {}).get("used", 0),
            "memory_total": memory_data.get("memory", {}).get("total", 0),
            "disk_usage": partitions,
            "network_bytes_sent": net_data.get("io_counters", {}).get("bytes_sent", 0),
            "network_bytes_recv": net_data.get("io_counters", {}).get("bytes_recv", 0),
            "platform": platform.system()
        }
    except Exception as e:
        logger.error(f"Error generating summary: {e}")
        # Return at least a basic structure to prevent frontend crash
        return {
            "timestamp": datetime.now().isoformat(),
            "cpu_percent": 0,
            "cpu_percent_per_core": [0],
            "memory_percent": 0,
            "memory_used": 0,
            "memory_total": 0,
            "disk_usage": {},
            "network_bytes_sent": 0,
            "network_bytes_recv": 0,
            "platform": platform.system(),
            "error": str(e)
        }

@router.get("/processes")
async def get_processes(
    page: int = 1, limit: int = 50, sort_by: str = "cpu_percent", sort_order: str = "desc",
    token: str = Depends(verify_token)
):
    loop = asyncio.get_event_loop()
    def get_data():
        processes = []
        for proc in psutil.process_iter(['pid', 'name', 'username', 'memory_percent', 'status', 'create_time']):
            try:
                pinfo = proc.info
                pinfo['cpu_percent'] = proc.cpu_percent(interval=None)
                processes.append(pinfo)
            except:
                pass
        return processes
    
    processes = await loop.run_in_executor(executor, get_data)
    reverse = sort_order == "desc"
    processes.sort(key=lambda x: x.get(sort_by, 0) or 0, reverse=reverse)
    
    total = len(processes)
    start = (page - 1) * limit
    return {
        "processes": processes[start:start+limit],
        "total": total,
        "page": page,
        "pages": (total + limit - 1) // limit
    }

@router.websocket("/ws/system")
async def system_websocket(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            summary = await get_system_summary("valid-token")
            await manager.send_personal_message(json.dumps(summary), websocket)
            await asyncio.sleep(2)
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def update_system_cache_all():
    """Update all system metrics in the cache"""
    try:
        await get_cpu_info_optimized()
        await get_memory_info("valid-token")
        await get_disk_info("valid-token")
        await get_network_info("valid-token")
    except Exception as e:
        logger.error(f"Error updating system cache: {e}")

async def periodic_update():
    """Periodic task to update cache"""
    while True:
        await update_system_cache_all()
        await asyncio.sleep(CACHE_TTL)

@router.on_event("startup")
async def on_startup():
    # Initial update
    await update_system_cache_all()
    # Schedule periodic update
    asyncio.create_task(periodic_update())
