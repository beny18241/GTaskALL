#!/bin/bash

# GTaskALL Quick Start Script
# This script provides a quick way to deploy GTaskALL on a Linux server

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== GTaskALL Quick Start ===${NC}"
}

# Check if running as root
if [[ $EUID -ne 0 ]]; then
    print_error "This script must be run as root (use sudo)"
    exit 1
fi

print_header
print_status "Starting GTaskALL deployment..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    print_error "Node.js is not installed. Please install Node.js first."
    print_status "You can install it with: curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash - && sudo apt-get install -y nodejs"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    print_error "npm is not installed. Please install npm first."
    exit 1
fi

print_status "Node.js version: $(node --version)"
print_status "npm version: $(npm --version)"

# Check if we're in the right directory
if [[ ! -f "server.js" ]]; then
    print_error "server.js not found. Please run this script from the GTaskALL directory"
    exit 1
fi

# Install dependencies
print_status "Installing Node.js dependencies..."
npm install --production

# Make manage script executable
if [[ -f "scripts/manage.sh" ]]; then
    chmod +x scripts/manage.sh
    print_status "Made manage script executable"
fi

# Run installation
print_status "Running full installation..."
./scripts/manage.sh install

# Start the service
print_status "Starting GTaskALL service..."
./scripts/manage.sh start

# Show status
print_status "Checking service status..."
sleep 2
./scripts/manage.sh status

print_status "GTaskALL deployment completed!"
print_status "The application should now be running on http://localhost:3001"
print_status ""
print_status "Useful commands:"
print_status "  ./scripts/manage.sh status    # Check service status"
print_status "  ./scripts/manage.sh logs      # View live logs"
print_status "  ./scripts/manage.sh restart   # Restart service"
print_status "  ./scripts/manage.sh stop      # Stop service"
print_status ""
print_status "Service will start automatically on boot."
