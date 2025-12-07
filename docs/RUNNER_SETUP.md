# GitHub Actions Runner Setup with Docker

This guide explains how to set up your self-hosted GitHub Actions runner with Docker.

## Issue

If you see this error:
```
Cannot connect to the Docker daemon at unix:///var/run/docker.sock. Is the docker daemon running?
```

Your runner needs Docker installed and the runner user needs permission to access it.

## Prerequisites

- Self-hosted GitHub Actions runner installed
- Root or sudo access to the runner machine

## Step 1: Install Docker on Runner Machine

### Option A: Ubuntu/Debian

```bash
# SSH into your runner machine
ssh your-runner-machine

# Update package index
sudo apt-get update

# Install prerequisites
sudo apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Add Docker's official GPG key
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Set up repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### Option B: CentOS/RHEL

```bash
# Install Docker
sudo yum install -y yum-utils
sudo yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo yum install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

### Option C: Using Docker's convenience script

```bash
# Quick install (works on most Linux distributions)
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# Start Docker
sudo systemctl start docker
sudo systemctl enable docker
```

## Step 2: Find Your Runner User

First, identify which user runs the GitHub Actions runner:

```bash
# Check runner service
ps aux | grep actions.runner

# Or check the service file
sudo systemctl status actions.runner.*

# Common runner users:
# - If using systemd service: usually a dedicated user like "runner" or "github-runner"
# - If running manually: the user who started it (check with 'whoami')
```

## Step 3: Add Runner User to Docker Group

Replace `RUNNER_USER` with your actual runner username:

```bash
# Find runner user
RUNNER_USER=$(ps aux | grep "Runner.Listener" | grep -v grep | awk '{print $1}' | head -1)
echo "Runner user: $RUNNER_USER"

# Add user to docker group
sudo usermod -aG docker $RUNNER_USER

# Verify
groups $RUNNER_USER
# Should show: ... docker ...
```

## Step 4: Restart Runner Service

The user needs to log out and back in (or restart the service) for group membership to take effect.

### If runner is a systemd service:

```bash
# Find the service name
sudo systemctl list-units | grep actions.runner

# Example: actions.runner.username-reponame.hostname.service
# Restart it
sudo systemctl restart actions.runner.*

# Check status
sudo systemctl status actions.runner.*
```

### If runner is running manually:

```bash
# Stop the runner (Ctrl+C if in foreground, or)
pkill -f "Runner.Listener"

# Start it again
cd /path/to/actions-runner
./run.sh
```

### Alternative: Reboot the machine (simplest)

```bash
sudo reboot
```

## Step 5: Verify Docker Access

Test that the runner user can access Docker:

```bash
# Switch to runner user
sudo su - $RUNNER_USER

# Test Docker
docker ps
docker info
docker version

# If these work, you're good!
```

## Step 6: Test GitHub Actions Workflow

### Option A: Trigger via push

Make a small change and push:

```bash
# In your local repo
echo "# Test" >> README.md
git add README.md
git commit -m "Test runner Docker access"
git push origin main
```

### Option B: Trigger manually

1. Go to your GitHub repo
2. Click **Actions** tab
3. Select **Build and Push to Docker Hub**
4. Click **Run workflow**
5. Click **Run workflow** (green button)

## Troubleshooting

### Issue: "permission denied while trying to connect to the Docker daemon socket"

**Solution:**
```bash
# Add user to docker group (if not done)
sudo usermod -aG docker $RUNNER_USER

# Set proper socket permissions
sudo chmod 666 /var/run/docker.sock

# Or better, restart Docker
sudo systemctl restart docker

# Restart runner
sudo systemctl restart actions.runner.*
```

### Issue: "docker: command not found"

**Solution:**
```bash
# Docker not installed or not in PATH
which docker

# If missing, install Docker (see Step 1)
```

### Issue: Runner still can't access Docker after adding to group

**Solution:**
```bash
# The service needs to be restarted for group changes
sudo systemctl restart actions.runner.*

# Or reboot the machine
sudo reboot

# Verify group membership
id $RUNNER_USER
# Should show gid for docker group
```

### Issue: Docker buildx not available

**Solution:**
```bash
# Install buildx plugin
docker buildx version

# If missing:
DOCKER_BUILDKIT=1 docker build --platform linux/amd64 -t test .

# Or install manually
mkdir -p ~/.docker/cli-plugins
curl -L https://github.com/docker/buildx/releases/latest/download/buildx-linux-amd64 -o ~/.docker/cli-plugins/docker-buildx
chmod +x ~/.docker/cli-plugins/docker-buildx
```

### Issue: "Cannot connect to the Docker daemon" (still happening)

**Solution:**
```bash
# Check if Docker daemon is running
sudo systemctl status docker

# If not running:
sudo systemctl start docker
sudo systemctl enable docker

# Check socket exists
ls -la /var/run/docker.sock

# Check permissions
sudo chmod 666 /var/run/docker.sock
```

## Complete Setup Script

Save this as `setup-runner-docker.sh` and run on your runner machine:

```bash
#!/bin/bash
set -e

echo "=== GitHub Actions Runner Docker Setup ==="

# Install Docker
echo "Step 1: Installing Docker..."
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
rm get-docker.sh

# Start Docker
echo "Step 2: Starting Docker service..."
sudo systemctl start docker
sudo systemctl enable docker

# Find runner user
echo "Step 3: Finding runner user..."
RUNNER_USER=$(ps aux | grep "Runner.Listener" | grep -v grep | awk '{print $1}' | head -1)

if [ -z "$RUNNER_USER" ]; then
    echo "ERROR: Could not find running GitHub Actions runner"
    echo "Please start the runner first, then run this script"
    exit 1
fi

echo "Found runner user: $RUNNER_USER"

# Add to docker group
echo "Step 4: Adding $RUNNER_USER to docker group..."
sudo usermod -aG docker $RUNNER_USER

# Verify
echo "Step 5: Verifying setup..."
groups $RUNNER_USER

# Set socket permissions (temporary, until restart)
sudo chmod 666 /var/run/docker.sock

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "IMPORTANT: You must restart the runner for changes to take effect:"
echo ""
echo "  sudo systemctl restart actions.runner.*"
echo ""
echo "Or reboot the machine:"
echo "  sudo reboot"
echo ""
echo "After restart, test with:"
echo "  sudo su - $RUNNER_USER"
echo "  docker ps"
```

Make it executable and run:

```bash
chmod +x setup-runner-docker.sh
sudo ./setup-runner-docker.sh
```

## Verification Checklist

After setup, verify everything works:

- [ ] Docker is installed: `docker --version`
- [ ] Docker daemon is running: `sudo systemctl status docker`
- [ ] Runner user is in docker group: `groups $RUNNER_USER`
- [ ] Runner user can run docker: `sudo su - $RUNNER_USER -c "docker ps"`
- [ ] Runner service is restarted: `sudo systemctl restart actions.runner.*`
- [ ] GitHub Actions workflow succeeds

## Quick Fix Commands

If you just want to fix it quickly:

```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh && sudo sh get-docker.sh

# Find and configure runner user
RUNNER_USER=$(ps aux | grep "Runner.Listener" | grep -v grep | awk '{print $1}' | head -1)
sudo usermod -aG docker $RUNNER_USER

# Restart runner
sudo systemctl restart actions.runner.*

# Or if no systemd:
# Stop runner, then start again
```

## Security Notes

### Best Practices

1. **Dedicated Runner User**: Create a dedicated user for the runner
   ```bash
   sudo useradd -m -s /bin/bash github-runner
   ```

2. **Limited Permissions**: Only give Docker access, not sudo
   ```bash
   # Runner user should NOT be in sudoers
   # Only in docker group
   ```

3. **Runner Isolation**: Run the runner in a separate machine/VM if possible

4. **Monitor Docker Activity**: Set up logging
   ```bash
   # Docker logs
   sudo journalctl -u docker.service -f
   ```

### What the Runner Can Do

Once the runner user has Docker access, GitHub Actions workflows can:
- ✅ Build Docker images
- ✅ Push to Docker Hub
- ✅ Pull images
- ✅ Run containers
- ⚠️ Access the host system (via Docker volumes)

**Important**: Only use self-hosted runners for repositories you trust!

## Alternative: Use GitHub-Hosted Runners

If setting up Docker on a self-hosted runner is problematic, consider using GitHub-hosted runners instead:

### Update workflow to use GitHub-hosted runner:

Edit `.github/workflows/deploy.yml`:

```yaml
jobs:
  build:
    name: Build and Push Docker Image
    runs-on: ubuntu-latest  # Change from: self-hosted
    # ... rest of config
```

**Benefits of GitHub-hosted runners:**
- Docker pre-installed
- No maintenance required
- Fresh environment each run

**Drawbacks:**
- Cost (2000 free minutes/month for private repos)
- No access to private network
- Slower for large builds (no caching between workflows)

## Next Steps

After Docker is working on your runner:

1. **Trigger workflow**: Push to main or manually trigger
2. **Monitor build**: Check GitHub Actions tab
3. **Verify Docker Hub**: Image should appear after successful build
4. **Deploy**: Use Portainer/docker-compose on your deployment server

## Additional Resources

- [Docker Installation Guide](https://docs.docker.com/engine/install/)
- [GitHub Actions Self-Hosted Runners](https://docs.github.com/en/actions/hosting-your-own-runners)
- [Docker Post-Installation Steps](https://docs.docker.com/engine/install/linux-postinstall/)
