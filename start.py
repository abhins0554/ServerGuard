#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ServerGuard - Automated Setup and Startup Script
================================================

This script automatically sets up and starts the ServerGuard application:
1. Creates a Python virtual environment
2. Installs Python dependencies
3. Installs Node.js dependencies
4. Starts the backend server
5. Starts the frontend development server

Usage: python start.py
"""

import os
import sys
import subprocess
import platform
import time
import signal
import threading
from pathlib import Path

# Fix Windows encoding issues
if platform.system() == "Windows":
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Color codes for terminal output
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_status(message, color=Colors.OKBLUE):
    """Print a status message with color"""
    print(f"{color}[INFO]{Colors.ENDC} {message}")

def print_success(message):
    """Print a success message"""
    print(f"{Colors.OKGREEN}[SUCCESS]{Colors.ENDC} {message}")

def print_warning(message):
    """Print a warning message"""
    print(f"{Colors.WARNING}[WARNING]{Colors.ENDC} {message}")

def print_error(message):
    """Print an error message"""
    print(f"{Colors.FAIL}[ERROR]{Colors.ENDC} {message}")

def check_prerequisites():
    """Check if required tools are installed"""
    print_status("Checking prerequisites...")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print_error("Python 3.8+ is required")
        return False
    
    print_success(f"Python {sys.version.split()[0]} detected")
    
    # Check Node.js
    try:
        result = subprocess.run(['node', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print_success(f"Node.js {result.stdout.strip()} detected")
        else:
            print_error("Node.js is not installed")
            return False
    except FileNotFoundError:
        print_error("Node.js is not installed")
        return False
    
    # Check npm
    try:
        result = subprocess.run(['npm', '--version'], capture_output=True, text=True)
        if result.returncode == 0:
            print_success(f"npm {result.stdout.strip()} detected")
        else:
            print_error("npm is not installed")
            return False
    except FileNotFoundError:
        print_error("npm is not installed")
        return False
    
    return True

def create_virtual_environment():
    """Create a Python virtual environment"""
    venv_path = Path("venv")
    
    if venv_path.exists():
        print_status("Virtual environment already exists")
        return True
    
    print_status("Creating Python virtual environment...")
    
    try:
        subprocess.run([sys.executable, '-m', 'venv', 'venv'], check=True)
        print_success("Virtual environment created successfully")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to create virtual environment: {e}")
        return False

def get_venv_python():
    """Get the Python executable path for the virtual environment"""
    if platform.system() == "Windows":
        return Path("venv/Scripts/python.exe")
    else:
        return Path("venv/bin/python")

def get_venv_pip():
    """Get the pip executable path for the virtual environment"""
    if platform.system() == "Windows":
        return Path("venv/Scripts/pip.exe")
    else:
        return Path("venv/bin/pip")

def install_python_dependencies():
    """Install Python dependencies"""
    print_status("Installing Python dependencies...")
    
    pip_path = get_venv_pip()
    requirements_path = Path("backend/requirements.txt")
    
    if not requirements_path.exists():
        print_error("backend/requirements.txt not found")
        return False
    
    try:
        subprocess.run([str(pip_path), 'install', '-r', str(requirements_path)], check=True)
        print_success("Python dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to install Python dependencies: {e}")
        return False

def install_node_dependencies():
    """Install Node.js dependencies"""
    print_status("Installing Node.js dependencies...")
    
    frontend_path = Path("frontend")
    if not frontend_path.exists():
        print_error("Frontend directory not found")
        return False
    
    try:
        # Change to frontend directory and run npm install
        subprocess.run(['npm', 'install'], cwd=frontend_path, check=True)
        print_success("Node.js dependencies installed successfully")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to install Node.js dependencies: {e}")
        return False


def create_env_file():
    """Create a basic .env file if it doesn't exist"""
    env_path = Path(".env")
    example_path = Path(".env.example")
    
    if env_path.exists():
        print_status(".env file already exists")
        return True
    
    if example_path.exists():
        print_status("Creating .env from .env.example...")
        try:
            with open(example_path, 'r') as src, open(env_path, 'w') as dst:
                dst.write(src.read())
            print_success(".env file created from example")
            return True
        except Exception as e:
            print_error(f"Failed to copy .env.example: {e}")
            return False

    print_status("Creating default .env file...")
    env_content = """# ServerGuard Configuration
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
SECRET_KEY=your-secret-key-change-this-in-production
HOST=0.0.0.0
PORT=8000
LOG_LEVEL=info
DEBUG=false
"""
    try:
        with open(env_path, 'w') as f:
            f.write(env_content)
        print_success(".env file created successfully")
        return True
    except Exception as e:
        print_error(f"Failed to create .env file: {e}")
        return False

def build_frontend():
    """Build the React frontend"""
    frontend_path = Path("frontend")
    build_path = frontend_path / "build"
    
    if build_path.exists():
        print_status("Frontend build already exists")
        choice = input(f"{Colors.WARNING}Do you want to rebuild the frontend? (y/N): {Colors.ENDC}")
        if choice.lower() != 'y':
            return True
            
    print_status("Building frontend (this may take a minute)...")
    try:
        subprocess.run(['npm', 'install'], cwd=frontend_path, check=True)
        subprocess.run(['npm', 'run', 'build'], cwd=frontend_path, check=True)
        print_success("Frontend built successfully")
        return True
    except subprocess.CalledProcessError as e:
        print_error(f"Failed to build frontend: {e}")
        return False

def start_backend_server():
    """Start the FastAPI backend server"""
    print_status("Starting ServerGuard (Backend + Frontend on port 8000)...")
    
    python_path = get_venv_python()
    backend_path = Path("backend")
    
    if not backend_path.exists():
        print_error("Backend directory not found")
        return None
    
    try:
        # Start the backend server as the primary process
        cmd_python = str(python_path) if python_path.exists() else sys.executable
        
        process = subprocess.Popen([
            cmd_python, 'main.py'
        ], cwd=backend_path)
        
        return process
    except Exception as e:
        print_error(f"Failed to start server: {e}")
        return None

def print_startup_info():
    """Print startup information"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}🛡️ ServerGuard is now active!{Colors.ENDC}")
    print(f"{Colors.OKCYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}")
    print(f"{Colors.OKGREEN}✅ Dashboard:{Colors.ENDC} http://localhost:8000")
    print(f"{Colors.OKGREEN}✅ API Documentation:{Colors.ENDC} http://localhost:8000/docs")
    print(f"{Colors.OKCYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}")
    print(f"{Colors.WARNING}💡 Press Ctrl+C to stop the server{Colors.ENDC}\n")

def signal_handler(signum, frame):
    """Handle Ctrl+C to gracefully stop services"""
    print(f"\n{Colors.WARNING}🛑 Stopping ServerGuard...{Colors.ENDC}")
    sys.exit(0)

def main():
    """Main function to set up and start ServerGuard"""
    print(f"{Colors.HEADER}{Colors.BOLD}🛡️ ServerGuard Production Startup Script{Colors.ENDC}")
    print(f"{Colors.OKCYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}\n")
    
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    
    # 1. Prerequisites
    if not check_prerequisites():
        sys.exit(1)
    
    # 2. Virtual Env
    if not create_virtual_environment():
        sys.exit(1)
    
    # 3. Environment Config
    if not create_env_file():
        sys.exit(1)
        
    # 4. Dependencies
    if not install_python_dependencies():
        sys.exit(1)
        
    # 5. Frontend Build (Required for single-port prod mode)
    if not (Path("frontend/build").exists()):
        print_warning("Frontend build not found. Building now...")
        if not build_frontend():
            sys.exit(1)
    
    # 6. Start Server
    backend_process = start_backend_server()
    if not backend_process:
        sys.exit(1)
    
    print_startup_info()
    
    try:
        while True:
            if backend_process.poll() is not None:
                print_error("Server stopped unexpectedly")
                break
            time.sleep(1)
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}🛑 Stopping ServerGuard...{Colors.ENDC}")
    finally:
        if backend_process:
            backend_process.terminate()
            frontend_process.terminate()
            print_status("Frontend server stopped")
        
        print_success("All services stopped successfully")

if __name__ == "__main__":
    main() 