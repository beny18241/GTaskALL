#!/bin/bash

# GTaskALL Service Management Script
# Usage: ./manage.sh [start|stop|restart|status|logs|install|uninstall|setup]

SERVICE_NAME="gtaskall"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
APP_DIR="/opt/gtaskall"
LOG_DIR="/opt/gtaskall/logs"
USER_NAME="gtaskall"
GROUP_NAME="gtaskall"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
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
    echo -e "${BLUE}=== GTaskALL Service Management ===${NC}"
}

# Check if running as root
check_root() {
    if [[ $EUID -ne 0 ]]; then
        print_error "This script must be run as root (use sudo)"
        exit 1
    fi
}

# Check if systemd is available
check_systemd() {
    if ! command -v systemctl &> /dev/null; then
        print_error "systemd is not available on this system"
        exit 1
    fi
}

# Setup function - creates user, directories, and installs service
setup() {
    print_header
    print_status "Setting up GTaskALL service..."
    
    # Create user and group
    if ! id "$USER_NAME" &>/dev/null; then
        print_status "Creating user: $USER_NAME"
        useradd -r -s /bin/false -d "$APP_DIR" "$USER_NAME"
    else
        print_warning "User $USER_NAME already exists"
    fi
    
    # Create application directory
    if [[ ! -d "$APP_DIR" ]]; then
        print_status "Creating application directory: $APP_DIR"
        mkdir -p "$APP_DIR"
    fi
    
    # Create log directory
    if [[ ! -d "$LOG_DIR" ]]; then
        print_status "Creating log directory: $LOG_DIR"
        mkdir -p "$LOG_DIR"
    fi
    
    # Set permissions
    print_status "Setting permissions..."
    chown -R "$USER_NAME:$GROUP_NAME" "$APP_DIR"
    chmod 755 "$APP_DIR"
    chmod 755 "$LOG_DIR"
    
    # Copy service file
    if [[ -f "gtaskall.service" ]]; then
        print_status "Installing service file..."
        cp gtaskall.service "$SERVICE_FILE"
        chmod 644 "$SERVICE_FILE"
    else
        print_error "Service file not found: gtaskall.service"
        exit 1
    fi
    
    # Reload systemd
    print_status "Reloading systemd..."
    systemctl daemon-reload
    
    # Enable service
    print_status "Enabling service..."
    systemctl enable "$SERVICE_NAME"
    
    print_status "Setup completed successfully!"
    print_status "You can now use: ./manage.sh start"
}

# Install function - copies files and sets up service
install() {
    print_header
    print_status "Installing GTaskALL..."
    
    # Check if we're in the right directory
    if [[ ! -f "server.js" ]]; then
        print_error "server.js not found. Please run this script from the GTaskALL directory"
        exit 1
    fi
    
    # Copy application files
    print_status "Copying application files to $APP_DIR..."
    cp -r . "$APP_DIR/"
    
    # Install dependencies
    print_status "Installing Node.js dependencies..."
    cd "$APP_DIR"
    npm install --production
    
    # Set permissions
    print_status "Setting permissions..."
    chown -R "$USER_NAME:$GROUP_NAME" "$APP_DIR"
    
    # Run setup
    setup
    
    print_status "Installation completed!"
    print_status "Service is ready to start with: ./manage.sh start"
}

# Uninstall function
uninstall() {
    print_header
    print_status "Uninstalling GTaskALL..."
    
    # Stop service if running
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_status "Stopping service..."
        systemctl stop "$SERVICE_NAME"
    fi
    
    # Disable service
    print_status "Disabling service..."
    systemctl disable "$SERVICE_NAME"
    
    # Remove service file
    if [[ -f "$SERVICE_FILE" ]]; then
        print_status "Removing service file..."
        rm "$SERVICE_FILE"
    fi
    
    # Remove application files
    if [[ -d "$APP_DIR" ]]; then
        print_status "Removing application files..."
        rm -rf "$APP_DIR"
    fi
    
    # Reload systemd
    systemctl daemon-reload
    
    print_status "Uninstallation completed!"
}

# Start service
start() {
    print_header
    print_status "Starting GTaskALL service..."
    
    if systemctl start "$SERVICE_NAME"; then
        print_status "Service started successfully!"
        print_status "Check status with: ./manage.sh status"
    else
        print_error "Failed to start service"
        exit 1
    fi
}

# Stop service
stop() {
    print_header
    print_status "Stopping GTaskALL service..."
    
    if systemctl stop "$SERVICE_NAME"; then
        print_status "Service stopped successfully!"
    else
        print_error "Failed to stop service"
        exit 1
    fi
}

# Restart service
restart() {
    print_header
    print_status "Restarting GTaskALL service..."
    
    if systemctl restart "$SERVICE_NAME"; then
        print_status "Service restarted successfully!"
        print_status "Check status with: ./manage.sh status"
    else
        print_error "Failed to restart service"
        exit 1
    fi
}

# Show service status
status() {
    print_header
    print_status "GTaskALL service status:"
    echo
    systemctl status "$SERVICE_NAME" --no-pager -l
    echo
    print_status "Recent logs:"
    journalctl -u "$SERVICE_NAME" --no-pager -l -n 20
}

# Show logs
logs() {
    print_header
    print_status "Showing GTaskALL service logs..."
    echo
    journalctl -u "$SERVICE_NAME" --no-pager -l -f
}

# Show recent logs (last 50 lines)
logs_recent() {
    print_header
    print_status "Recent GTaskALL service logs (last 50 lines):"
    echo
    journalctl -u "$SERVICE_NAME" --no-pager -l -n 50
}

# Show error logs
logs_error() {
    print_header
    print_status "GTaskALL service error logs:"
    echo
    journalctl -u "$SERVICE_NAME" --no-pager -l -p err
}

# Main script logic
main() {
    case "${1:-}" in
        "start")
            check_root
            check_systemd
            start
            ;;
        "stop")
            check_root
            check_systemd
            stop
            ;;
        "restart")
            check_root
            check_systemd
            restart
            ;;
        "status")
            check_systemd
            status
            ;;
        "logs")
            check_systemd
            logs
            ;;
        "logs-recent")
            check_systemd
            logs_recent
            ;;
        "logs-error")
            check_systemd
            logs_error
            ;;
        "install")
            check_root
            check_systemd
            install
            ;;
        "setup")
            check_root
            check_systemd
            setup
            ;;
        "uninstall")
            check_root
            check_systemd
            uninstall
            ;;
        *)
            print_header
            echo "Usage: $0 {start|stop|restart|status|logs|logs-recent|logs-error|install|setup|uninstall}"
            echo
            echo "Commands:"
            echo "  start       - Start the GTaskALL service"
            echo "  stop        - Stop the GTaskALL service"
            echo "  restart     - Restart the GTaskALL service"
            echo "  status      - Show service status and recent logs"
            echo "  logs        - Show live logs (follow mode)"
            echo "  logs-recent - Show recent logs (last 50 lines)"
            echo "  logs-error  - Show error logs only"
            echo "  install     - Install GTaskALL and setup service"
            echo "  setup       - Setup service (user, directories, permissions)"
            echo "  uninstall   - Remove GTaskALL and service"
            echo
            echo "Examples:"
            echo "  sudo $0 install    # First time installation"
            echo "  sudo $0 start      # Start the service"
            echo "  $0 status          # Check status (no sudo needed)"
            echo "  $0 logs            # View live logs (no sudo needed)"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
