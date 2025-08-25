# GTaskALL Linux Service Scripts

This directory contains scripts for managing GTaskALL as a systemd service on Linux systems.

## 📁 Files

- `manage.sh` - Main service management script
- `quick-start.sh` - Quick deployment script
- `monitor.sh` - Health monitoring script
- `gtaskall.service` - systemd service file

## 🚀 Quick Start

### Prerequisites

- Linux system with systemd
- Node.js (v16 or higher)
- npm
- Root/sudo access

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/beny18241/GTaskALL.git
   cd GTaskALL
   ```

2. **Run the quick start script:**
   ```bash
   sudo ./scripts/quick-start.sh
   ```

This will:
- Install Node.js dependencies
- Create system user and directories
- Install and enable the systemd service
- Start the application

## 🔧 Service Management

### Main Management Script

Use `./scripts/manage.sh` for all service operations:

```bash
# Start the service
sudo ./scripts/manage.sh start

# Stop the service
sudo ./scripts/manage.sh stop

# Restart the service
sudo ./scripts/manage.sh restart

# Check service status
./scripts/manage.sh status

# View live logs
./scripts/manage.sh logs

# View recent logs (last 50 lines)
./scripts/manage.sh logs-recent

# View error logs only
./scripts/manage.sh logs-error

# Full installation (first time)
sudo ./scripts/manage.sh install

# Setup service only (user, directories, permissions)
sudo ./scripts/manage.sh setup

# Uninstall completely
sudo ./scripts/manage.sh uninstall
```

### Health Monitoring

Use `./scripts/monitor.sh` to check system health:

```bash
# Full health check
./scripts/monitor.sh

# Check specific components
./scripts/monitor.sh service    # Service status only
./scripts/monitor.sh logs       # Error logs only
./scripts/monitor.sh system     # System resources only
./scripts/monitor.sh files      # Application files only
./scripts/monitor.sh port       # Port status only
./scripts/monitor.sh process    # Node.js processes only
```

## 📋 Service Details

### Service Configuration

- **Service Name**: `gtaskall`
- **User**: `gtaskall` (system user)
- **Working Directory**: `/opt/gtaskall`
- **Port**: `3001`
- **Logs**: `journalctl -u gtaskall`

### File Locations

- **Application**: `/opt/gtaskall/`
- **Service File**: `/etc/systemd/system/gtaskall.service`
- **Logs**: `/opt/gtaskall/logs/` (if any)
- **Database**: `/opt/gtaskall/gtaskall.db`

### Environment Variables

- `NODE_ENV=production`
- `PORT=3001`

## 🔍 Monitoring and Troubleshooting

### Check Service Status

```bash
# Quick status check
systemctl status gtaskall

# Detailed status with logs
./scripts/manage.sh status
```

### View Logs

```bash
# Live logs (follow mode)
./scripts/manage.sh logs

# Recent logs
./scripts/manage.sh logs-recent

# Error logs only
./scripts/manage.sh logs-error

# Using journalctl directly
journalctl -u gtaskall -f
journalctl -u gtaskall --since "1 hour ago"
```

### Health Check

```bash
# Full health check
./scripts/monitor.sh

# Check specific issues
./scripts/monitor.sh service
./scripts/monitor.sh system
```

## 🛠️ Troubleshooting

### Common Issues

1. **Service won't start**
   ```bash
   # Check logs for errors
   ./scripts/manage.sh logs-error
   
   # Check service configuration
   systemctl cat gtaskall
   
   # Check file permissions
   ls -la /opt/gtaskall/
   ```

2. **Port already in use**
   ```bash
   # Check what's using port 3001
   netstat -tlnp | grep :3001
   
   # Kill process if needed
   sudo kill -9 <PID>
   ```

3. **Permission issues**
   ```bash
   # Fix permissions
   sudo chown -R gtaskall:gtaskall /opt/gtaskall
   sudo chmod 755 /opt/gtaskall
   ```

4. **Node.js not found**
   ```bash
   # Install Node.js
   curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

### Manual Service Management

```bash
# Enable service to start on boot
sudo systemctl enable gtaskall

# Disable auto-start
sudo systemctl disable gtaskall

# Reload systemd after changes
sudo systemctl daemon-reload

# Check if service is enabled
systemctl is-enabled gtaskall
```

## 🔒 Security

The service runs with the following security features:

- **System user**: Runs as dedicated `gtaskall` user
- **No shell access**: User has `/bin/false` shell
- **Limited permissions**: Uses systemd security restrictions
- **Private directories**: Isolated from system files
- **Resource limits**: File descriptor and process limits

## 📊 Performance Monitoring

Monitor system resources:

```bash
# Check resource usage
./scripts/monitor.sh system

# Monitor in real-time
watch -n 5 './scripts/monitor.sh system'

# Check specific metrics
free -h                    # Memory usage
df -h /opt/gtaskall       # Disk usage
top -p $(pgrep node)      # Node.js process
```

## 🔄 Updates

To update the application:

```bash
# Stop service
sudo ./scripts/manage.sh stop

# Backup current installation
sudo cp -r /opt/gtaskall /opt/gtaskall.backup.$(date +%Y%m%d)

# Update code
git pull origin main

# Reinstall
sudo ./scripts/manage.sh install

# Start service
sudo ./scripts/manage.sh start

# Verify
./scripts/monitor.sh
```

## 📞 Support

For issues and support:

1. Check the logs: `./scripts/manage.sh logs-error`
2. Run health check: `./scripts/monitor.sh`
3. Check service status: `./scripts/manage.sh status`
4. Review this documentation
5. Create an issue on GitHub

## 📝 Log Files

The application logs are managed by systemd:

- **Service logs**: `journalctl -u gtaskall`
- **System logs**: `journalctl -u gtaskall -f`
- **Error logs**: `journalctl -u gtaskall -p err`
- **Recent logs**: `journalctl -u gtaskall --since "1 hour ago"`

## 🔧 Customization

### Change Port

Edit `/etc/systemd/system/gtaskall.service`:

```ini
Environment=PORT=8080
```

Then reload and restart:

```bash
sudo systemctl daemon-reload
sudo ./scripts/manage.sh restart
```

### Change Working Directory

Edit the service file and update paths in scripts accordingly.

### Add Environment Variables

Add to the service file:

```ini
Environment=MY_VAR=value
Environment=ANOTHER_VAR=value
```

Then reload and restart the service.
