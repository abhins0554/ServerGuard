from fastapi import APIRouter, Depends, HTTPException
import asyncio
import platform
import logging
import subprocess
from dependencies import verify_token, executor
from models import PingRequest, TracerouteRequest, PortScanRequest

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/network", tags=["network"])

@router.post("/ping")
async def ping_host(request: PingRequest, token: str = Depends(verify_token)):
    loop = asyncio.get_event_loop()
    def execute_ping():
        system = platform.system()
        if system == "Windows":
            cmd = ['ping', '-n', str(request.count), '-w', str(request.timeout * 1000), request.host]
        else:
            cmd = ['ping', '-c', str(request.count), '-W', str(request.timeout), request.host]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
            return {"success": result.returncode == 0, "output": result.stdout, "error": result.stderr}
        except:
            return {"success": False, "error": "Ping timed out"}
            
    return await loop.run_in_executor(executor, execute_ping)

@router.post("/traceroute")
async def traceroute_host(request: TracerouteRequest, token: str = Depends(verify_token)):
    loop = asyncio.get_event_loop()
    def execute_traceroute():
        system = platform.system()
        if system == "Windows":
            cmd = ['tracert', '-h', str(request.max_hops), request.host]
        else:
            cmd = ['traceroute', '-m', str(request.max_hops), request.host]
        
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
            return {"success": result.returncode == 0, "output": result.stdout, "error": result.stderr}
        except:
            return {"success": False, "error": "Traceroute failed"}
            
    return await loop.run_in_executor(executor, execute_traceroute)

@router.post("/port-scan")
async def port_scan(request: PortScanRequest, token: str = Depends(verify_token)):
    """Scan ports on a host"""
    try:
        async def scan_single_port(host, port, timeout):
            try:
                reader, writer = await asyncio.wait_for(
                    asyncio.open_connection(host, port),
                    timeout=timeout
                )
                writer.close()
                await writer.wait_closed()
                return {"port": port, "status": "open", "error": None}
            except:
                return {"port": port, "status": "closed", "error": None}
        
        def parse_ports(ports_str):
            ports = []
            for part in ports_str.split(','):
                part = part.strip()
                if not part: continue
                if '-' in part:
                    start, end = map(int, part.split('-'))
                    ports.extend(range(start, end + 1))
                else:
                    ports.append(int(part))
            return sorted(set(ports))
        
        ports = parse_ports(request.ports)
        if len(ports) > 2000:
            raise HTTPException(status_code=400, detail="Maximum 2000 ports allowed")
        
        results = []
        batch_size = 50
        for i in range(0, len(ports), batch_size):
            batch = ports[i:i+batch_size]
            batch_results = await asyncio.gather(*[scan_single_port(request.host, p, request.timeout) for p in batch])
            results.extend(batch_results)
            
        return {
            "host": request.host,
            "total_ports": len(ports),
            "open_ports": [r["port"] for r in results if r["status"] == "open"],
            "results": results
        }
    except Exception as e:
        logger.error(f"Error scanning ports: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/device/{device_ip}/port-scan")
async def scan_device_ports(device_ip: str, ports: str = "1-1024", timeout: float = 0.5, token: str = Depends(verify_token)):
    """Scan ports on a specific discovered device"""
    # Reuse the same logic
    request = PortScanRequest(host=device_ip, ports=ports, timeout=timeout)
    return await port_scan(request, token)

# Global cache for network devices
device_cache = {"devices": [], "timestamp": 0}
CACHE_TTL = 300 # 5 minutes

@router.get("/devices")
async def get_network_devices(token: str = Depends(verify_token)):
    """Discover devices on the local network"""
    from utils import get_network_range, ping_scan_network
    import socket
    import psutil
    import re
    import time
    
    # Check cache
    if time.time() - device_cache["timestamp"] < CACHE_TTL and device_cache["devices"]:
        return {"devices": device_cache["devices"], "total": len(device_cache["devices"]), "cached": True}

    try:
        loop = asyncio.get_event_loop()
        system = platform.system()
        
        # 1. Get network range and local IPs
        network_info = get_network_range()
        interfaces = psutil.net_if_addrs()
        local_ips = [addr.address for iface in interfaces.values() for addr in iface 
                     if addr.family == socket.AF_INET and not addr.address.startswith('127.')]
        
        # 2. Get baseline from ARP table
        def get_arp_table():
            arp_map = {}
            try:
                # Windows 'arp -a' can be slow, but it's essential
                cmd = ['arp', '-a']
                result = subprocess.run(cmd, capture_output=True, text=True, timeout=5)
                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        line = line.strip()
                        if not line: continue
                        
                        if system == "Windows":
                            parts = line.split()
                            if len(parts) >= 2 and re.match(r'^\d+\.\d+\.\d+\.\d+$', parts[0]):
                                arp_map[parts[0]] = {"mac": parts[1], "hostname": None}
                        else:  # Linux/macOS
                            match = re.search(r'([^\s]+)\s+\(([\d.]+)\)\s+at\s+([a-fA-F0-9:]+)', line)
                            if match:
                                arp_map[match.group(2)] = {
                                    "mac": match.group(3), 
                                    "hostname": match.group(1) if match.group(1) != '?' else None
                                }
            except:
                pass
            return arp_map

        arp_map = await loop.run_in_executor(executor, get_arp_table)
        
        # 3. Perform network scan if range is known
        scanned_ips = []
        if network_info:
            # Gather all pings at once instead of small batches
            scanned_ips = await ping_scan_network(
                network_info["base"], 
                network_info["start_octet"], 
                min(network_info["end_octet"], network_info["start_octet"] + 254)
            )
            
            # Refresh ARP table after ping scan
            refresh_arp = await loop.run_in_executor(executor, get_arp_table)
            arp_map.update(refresh_arp)
            
        # 4. Consolidate results
        device_map = {}
        # Add ARP devices
        for ip, info in arp_map.items():
            if ip not in local_ips:
                device_map[ip] = {
                    "ip": ip,
                    "mac": info["mac"],
                    "hostname": info["hostname"],
                    "status": "active"
                }
        
        # Add scanned IPs not in ARP
        for ip in scanned_ips:
            if ip not in local_ips and ip not in device_map:
                device_map[ip] = {
                    "ip": ip,
                    "mac": "Unknown",
                    "hostname": None,
                    "status": "active"
                }
                
        # 5. Try to resolve hostnames in parallel with STRICT timeout
        async def enrich_device_async(device):
            ip = device["ip"]
            if not device["hostname"]:
                try:
                    # STRICT 1s timeout for DNS
                    hostname_info = await asyncio.wait_for(
                        loop.run_in_executor(executor, lambda: socket.gethostbyaddr(ip)),
                        timeout=1.0
                    )
                    hostname = hostname_info[0]
                    if hostname and not hostname.lower().startswith('unknown_'):
                        device["hostname"] = hostname
                except:
                    pass
            
            if device["hostname"]:
                device["identifier"] = device["hostname"]
            elif device["mac"] != "Unknown":
                device["identifier"] = f"Device ({device['mac']})"
            else:
                device["identifier"] = f"Device ({ip})"
            return device

        devices = await asyncio.gather(*[enrich_device_async(d) for d in device_map.values()], return_exceptions=True)
        # Filter out exceptions
        valid_devices = [d for d in devices if isinstance(d, dict)]
        valid_devices.sort(key=lambda x: socket.inet_aton(x["ip"]))
        
        # Update cache
        device_cache["devices"] = valid_devices
        device_cache["timestamp"] = time.time()
        
        return {"devices": valid_devices, "total": len(valid_devices), "cached": False}
        
    except Exception as e:
        logger.error(f"Error in network discovery: {e}", exc_info=True)
        return {"devices": [], "total": 0, "error": str(e), "cached": False}

@router.get("/device/{device_ip}/connections")
async def get_device_connections(device_ip: str, token: str = Depends(verify_token)):
    """Get active connections linked to a specific device IP"""
    from dependencies import executor
    import psutil
    import socket
    
    def fetch_connections():
        conns = []
        try:
            for conn in psutil.net_connections(kind='inet'):
                # Inbound to device
                if conn.raddr and conn.raddr.ip == device_ip:
                    conns.append({
                        "local_address": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                        "remote_address": f"{conn.raddr.ip}:{conn.raddr.port}",
                        "status": conn.status,
                        "direction": "inbound"
                    })
                # Outbound from device (on local machine perspective, this means local machine to device)
                elif conn.laddr and conn.laddr.ip == device_ip:
                    conns.append({
                        "local_address": f"{conn.laddr.ip}:{conn.laddr.port}",
                        "remote_address": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                        "status": conn.status,
                        "direction": "outbound"
                    })
            return conns
        except:
            return []

    results = await asyncio.get_event_loop().run_in_executor(executor, fetch_connections)
    return {"connections": results, "total": len(results)}

@router.get("/connections")
async def get_all_connections(token: str = Depends(verify_token)):
    """Get all active network connections on the server"""
    import psutil
    try:
        def fetch_all():
            connections = []
            for conn in psutil.net_connections(kind='inet'):
                connections.append({
                    "fd": conn.fd,
                    "family": str(conn.family),
                    "type": str(conn.type),
                    "local_address": f"{conn.laddr.ip}:{conn.laddr.port}" if conn.laddr else None,
                    "remote_address": f"{conn.raddr.ip}:{conn.raddr.port}" if conn.raddr else None,
                    "status": conn.status,
                    "pid": conn.pid
                })
            return connections
        
        results = await asyncio.get_event_loop().run_in_executor(executor, fetch_all)
        return {"connections": results, "total": len(results)}
    except Exception as e:
        return {"connections": [], "total": 0, "error": str(e)}
