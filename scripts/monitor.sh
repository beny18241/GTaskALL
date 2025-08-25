#!/bin/bash

# GTaskALL Monitoring Script
# This script monitors the health and status of the GTaskALL service

SERVICE_NAME="gtaskall"
APP_DIR="/opt/gtaskall"
LOG_DIR="/opt/gtaskall/logs"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}[OK]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}=== GTaskALL Health Check ===${NC}"
}

# Check service status
check_service_status() {
    echo "Service Status:"
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        print_status "Service is running"
    else
        print_error "Service is not running"
        return 1
    fi
    
    if systemctl is-enabled --quiet "$SERVICE_NAME"; then
        print_status "Service is enabled (auto-start)"
    else
        print_warning "Service is not enabled for auto-start"
    fi
}

# Check service logs for errors
check_service_logs() {
    echo -e "\nRecent Errors (last 10):"
    local error_count=$(journalctl -u "$SERVICE_NAME" --no-pager -p err -n 10 | wc -l)
    if [[ $error_count -le 1 ]]; then
        print_status "No recent errors found"
    else
        print_warning "Found $((error_count - 1)) recent errors:"
        journalctl -u "$SERVICE_NAME" --no-pager -p err -n 10
    fi
}

# Check disk space
check_disk_space() {
    echo -e "\nDisk Space:"
    local app_dir_space=$(df -h "$APP_DIR" | tail -1 | awk '{print $5}' | sed 's/%//')
    if [[ $app_dir_space -lt 80 ]]; then
        print_status "Disk space OK: ${app_dir_space}% used"
    else
        print_warning "Disk space getting low: ${app_dir_space}% used"
    fi
}

# Check memory usage
check_memory() {
    echo -e "\nMemory Usage:"
    local mem_usage=$(free | grep Mem | awk '{printf "%.1f", $3/$2 * 100.0}')
    if (( $(echo "$mem_usage < 80" | bc -l) )); then
        print_status "Memory usage OK: ${mem_usage}%"
    else
        print_warning "Memory usage high: ${mem_usage}%"
    fi
}

# Check CPU usage
check_cpu() {
    echo -e "\nCPU Usage:"
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//')
    if (( $(echo "$cpu_usage < 80" | bc -l) )); then
        print_status "CPU usage OK: ${cpu_usage}%"
    else
        print_warning "CPU usage high: ${cpu_usage}%"
    fi
}

# Check application files
check_app_files() {
    echo -e "\nApplication Files:"
    if [[ -d "$APP_DIR" ]]; then
        print_status "Application directory exists: $APP_DIR"
        
        if [[ -f "$APP_DIR/server.js" ]]; then
            print_status "Server file exists"
        else
            print_error "Server file missing"
        fi
        
        if [[ -f "$APP_DIR/package.json" ]]; then
            print_status "Package.json exists"
        else
            print_error "Package.json missing"
        fi
    else
        print_error "Application directory missing: $APP_DIR"
    fi
}

# Check port availability
check_port() {
    echo -e "\nPort Status:"
    if netstat -tlnp 2>/dev/null | grep -q ":3001 "; then
        print_status "Port 3001 is listening"
    else
        print_error "Port 3001 is not listening"
    fi
}

# Check Node.js process
check_node_process() {
    echo -e "\nNode.js Process:"
    local node_count=$(pgrep -c node)
    if [[ $node_count -gt 0 ]]; then
        print_status "Node.js processes running: $node_count"
        pgrep -l node
    else
        print_error "No Node.js processes found"
    fi
}

# Check log files
check_logs() {
    echo -e "\nLog Files:"
    if [[ -d "$LOG_DIR" ]]; then
        print_status "Log directory exists: $LOG_DIR"
        local log_files=$(find "$LOG_DIR" -name "*.log" 2>/dev/null | wc -l)
        if [[ $log_files -gt 0 ]]; then
            print_status "Found $log_files log files"
        else
            print_warning "No log files found in $LOG_DIR"
        fi
    else
        print_warning "Log directory missing: $LOG_DIR"
    fi
}

# Check systemd service configuration
check_service_config() {
    echo -e "\nService Configuration:"
    if [[ -f "/etc/systemd/system/$SERVICE_NAME.service" ]]; then
        print_status "Service file exists"
        
        # Check if service file is valid
        if systemctl cat "$SERVICE_NAME" >/dev/null 2>&1; then
            print_status "Service configuration is valid"
        else
            print_error "Service configuration has errors"
        fi
    else
        print_error "Service file missing"
    fi
}

# Main monitoring function
main() {
    print_header
    echo "Timestamp: $(date)"
    echo "Hostname: $(hostname)"
    echo
    
    local exit_code=0
    
    # Run all checks
    check_service_status || exit_code=1
    check_service_config
    check_app_files
    check_port
    check_node_process
    check_logs
    check_disk_space
    check_memory
    check_cpu
    check_service_logs
    
    echo -e "\n${BLUE}=== Summary ===${NC}"
    if [[ $exit_code -eq 0 ]]; then
        print_status "All checks passed - GTaskALL is healthy!"
    else
        print_error "Some checks failed - please review the issues above"
    fi
    
    exit $exit_code
}

# Handle command line arguments
case "${1:-}" in
    "service")
        check_service_status
        ;;
    "logs")
        check_service_logs
        ;;
    "system")
        check_disk_space
        check_memory
        check_cpu
        ;;
    "files")
        check_app_files
        check_logs
        ;;
    "port")
        check_port
        ;;
    "process")
        check_node_process
        ;;
    *)
        main
        ;;
esac
