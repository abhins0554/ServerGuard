#!/bin/bash

# ServerGuard - Unix/Linux/macOS Startup Script
# ==============================================

echo "🛡️ ServerGuard - Unix Startup Script"
echo "======================================"
echo

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    print_error "Python 3 is not installed or not in PATH"
    echo "Please install Python 3.8+ from https://python.org"
    exit 1
fi

# Check Python version
python_version=$(python3 -c 'import sys; print(".".join(map(str, sys.version_info[:2])))')
required_version="3.8"

if [ "$(printf '%s\n' "$required_version" "$python_version" | sort -V | head -n1)" != "$required_version" ]; then
    print_error "Python 3.8+ is required, found $python_version"
    exit 1
fi

print_success "Python $python_version detected"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed or not in PATH"
    echo "Please install Node.js from https://nodejs.org"
    exit 1
fi

node_version=$(node --version)
print_success "Node.js $node_version detected"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed or not in PATH"
    echo "Please install npm (comes with Node.js)"
    exit 1
fi

npm_version=$(npm --version)
print_success "npm $npm_version detected"

echo
print_status "Prerequisites check passed"
echo

# Make the Python script executable
chmod +x start.py

# Run the Python startup script
python3 start.py 