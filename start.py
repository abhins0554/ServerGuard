#!/usr/bin/env python3
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
    
    if env_path.exists():
        print_status(".env file already exists")
        return True
    
    print_status("Creating .env file...")
    
    env_content = """# ServerGuard Configuration
# Authentication
SECRET_KEY=your-secret-key-change-this-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Frontend Configuration
REACT_APP_API_URL=http://localhost:8000

# Development Settings
DEBUG=true
LOG_LEVEL=info
"""
    
    try:
        with open(env_path, 'w') as f:
            f.write(env_content)
        print_success(".env file created successfully")
        return True
    except Exception as e:
        print_error(f"Failed to create .env file: {e}")
        return False

def start_backend_server():
    """Start the FastAPI backend server"""
    print_status("Starting backend server...")
    
    python_path = get_venv_python()
    backend_path = Path("backend")
    
    if not backend_path.exists():
        print_error("Backend directory not found")
        return None
    
    try:
        # Start the backend server
        process = subprocess.Popen([
            str(python_path), 'main.py'
        ], cwd=backend_path)
        
        print_success("Backend server started successfully")
        return process
    except Exception as e:
        print_error(f"Failed to start backend server: {e}")
        return None

def start_frontend_server():
    """Start the React frontend development server"""
    print_status("Starting frontend development server...")
    
    frontend_path = Path("frontend")
    
    if not frontend_path.exists():
        print_error("Frontend directory not found")
        return None
    
    try:
        # Start the frontend development server
        process = subprocess.Popen([
            'npm', 'start'
        ], cwd=frontend_path)
        
        print_success("Frontend development server started successfully")
        return process
    except Exception as e:
        print_error(f"Failed to start frontend server: {e}")
        return None

def wait_for_services():
    """Wait for services to be ready"""
    print_status("Waiting for services to start...")
    time.sleep(5)  # Give services time to start

def print_startup_info():
    """Print startup information"""
    print(f"\n{Colors.HEADER}{Colors.BOLD}🚀 ServerGuard is starting up!{Colors.ENDC}")
    print(f"{Colors.OKCYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}")
    print(f"{Colors.OKGREEN}✅ Backend API:{Colors.ENDC} http://localhost:8000")
    print(f"{Colors.OKGREEN}✅ API Documentation:{Colors.ENDC} http://localhost:8000/docs")
    print(f"{Colors.OKGREEN}✅ Frontend Dashboard:{Colors.ENDC} http://localhost:3000")
    print(f"{Colors.OKGREEN}✅ Default Login:{Colors.ENDC} admin / admin123")
    print(f"{Colors.OKCYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}")
    print(f"{Colors.WARNING}💡 Press Ctrl+C to stop all services{Colors.ENDC}\n")

def signal_handler(signum, frame):
    """Handle Ctrl+C to gracefully stop services"""
    print(f"\n{Colors.WARNING}🛑 Stopping ServerGuard services...{Colors.ENDC}")
    sys.exit(0)

def main():
    """Main function to set up and start ServerGuard"""
    print(f"{Colors.HEADER}{Colors.BOLD}🛡️ ServerGuard Setup & Startup Script{Colors.ENDC}")
    print(f"{Colors.OKCYAN}═══════════════════════════════════════════════════════════════{Colors.ENDC}\n")
    
    # Set up signal handler for graceful shutdown
    signal.signal(signal.SIGINT, signal_handler)
    
    # Check prerequisites
    if not check_prerequisites():
        print_error("Prerequisites check failed. Please install required tools.")
        sys.exit(1)
    
    # Create virtual environment
    if not create_virtual_environment():
        print_error("Failed to create virtual environment")
        sys.exit(1)
    
    # Install Python dependencies
    if not install_python_dependencies():
        print_error("Failed to install Python dependencies")
        sys.exit(1)
    
    # Install Node.js dependencies
    if not install_node_dependencies():
        print_error("Failed to install Node.js dependencies")
        sys.exit(1)
    
    # Create .env file
    if not create_env_file():
        print_error("Failed to create .env file")
        sys.exit(1)
    
    # Start backend server
    backend_process = start_backend_server()
    if not backend_process:
        print_error("Failed to start backend server")
        sys.exit(1)
    
    # Start frontend server
    frontend_process = start_frontend_server()
    if not frontend_process:
        print_error("Failed to start frontend server")
        backend_process.terminate()
        sys.exit(1)
    
    # Wait for services to start
    wait_for_services()
    
    # Print startup information
    print_startup_info()
    
    try:
        # Keep the script running and monitor processes
        while True:
            # Check if processes are still running
            if backend_process.poll() is not None:
                print_error("Backend server stopped unexpectedly")
                break
            
            if frontend_process.poll() is not None:
                print_error("Frontend server stopped unexpectedly")
                break
            
            time.sleep(1)
    
    except KeyboardInterrupt:
        print(f"\n{Colors.WARNING}🛑 Stopping ServerGuard services...{Colors.ENDC}")
    
    finally:
        # Clean up processes
        if backend_process:
            backend_process.terminate()
            print_status("Backend server stopped")
        
        if frontend_process:
            frontend_process.terminate()
            print_status("Frontend server stopped")
        
        print_success("All services stopped successfully")

if __name__ == "__main__":
    main() 