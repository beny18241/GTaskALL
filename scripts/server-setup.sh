#!/bin/bash
set -e

echo "=== GTaskALL Server Setup Script ==="
echo "This script will prepare the server for Docker deployment"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo "Please run as root or with sudo"
  exit 1
fi

# Variables
DEPLOY_PATH="/opt/gtaskall"
DEPLOY_USER="${DEPLOY_USER:-gtaskall}"

echo "Step 1: Installing Docker and Docker Compose..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    rm get-docker.sh
    systemctl enable docker
    systemctl start docker
    echo "Docker installed successfully"
else
    echo "Docker already installed"
fi

# Install Docker Compose plugin
if ! docker compose version &> /dev/null; then
    mkdir -p /usr/local/lib/docker/cli-plugins
    curl -SL https://github.com/docker/compose/releases/latest/download/docker-compose-linux-x86_64 \
         -o /usr/local/lib/docker/cli-plugins/docker-compose
    chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
    echo "Docker Compose installed successfully"
else
    echo "Docker Compose already installed"
fi

echo ""
echo "Step 2: Creating deployment user and directories..."
if ! id "$DEPLOY_USER" &>/dev/null; then
    useradd -r -s /bin/bash -m -d /home/$DEPLOY_USER $DEPLOY_USER
    usermod -aG docker $DEPLOY_USER
    echo "User $DEPLOY_USER created and added to docker group"
else
    echo "User $DEPLOY_USER already exists"
fi

# Create deployment directory
mkdir -p $DEPLOY_PATH
mkdir -p $DEPLOY_PATH/nginx/{conf.d,ssl,logs}
chown -R $DEPLOY_USER:$DEPLOY_USER $DEPLOY_PATH
chmod 755 $DEPLOY_PATH

echo ""
echo "Step 3: Setting up environment file..."
if [ ! -f "$DEPLOY_PATH/.env" ]; then
    cat > "$DEPLOY_PATH/.env.template" << 'EOF'
# Docker Hub Configuration (Required for deployment)
DOCKERHUB_USERNAME=your-dockerhub-username

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth Configuration
AUTH_SECRET=your-generated-secret-here
# Generate with: openssl rand -base64 32

# Application URL (IMPORTANT: Set to your production domain)
NEXTAUTH_URL=http://your-domain.com
# Or with port: http://your-server-ip:80

# Node Environment
NODE_ENV=production
EOF
    chown $DEPLOY_USER:$DEPLOY_USER "$DEPLOY_PATH/.env.template"
    echo "Created .env.template at $DEPLOY_PATH/.env.template"
    echo "⚠️  IMPORTANT: Copy this to .env and fill in your actual values!"
    echo "   cp $DEPLOY_PATH/.env.template $DEPLOY_PATH/.env"
    echo "   nano $DEPLOY_PATH/.env"
else
    echo ".env file already exists at $DEPLOY_PATH/.env"
fi

echo ""
echo "Step 4: Configuring firewall (if ufw is installed)..."
if command -v ufw &> /dev/null; then
    ufw allow 80/tcp
    ufw allow 443/tcp
    echo "Firewall rules added for ports 80 and 443"
else
    echo "ufw not installed, skipping firewall configuration"
fi

echo ""
echo "Step 5: Setting up log rotation..."
cat > /etc/logrotate.d/gtaskall << 'EOF'
/opt/gtaskall/nginx/logs/*.log {
    daily
    missingok
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 gtaskall gtaskall
    sharedscripts
    postrotate
        docker exec gtaskall-nginx nginx -s reload > /dev/null 2>&1 || true
    endscript
}
EOF

echo ""
echo "=== Setup Complete! ==="
echo ""
echo "Next steps:"
echo "1. Configure your environment variables:"
echo "   sudo nano $DEPLOY_PATH/.env"
echo ""
echo "2. Update Google OAuth redirect URI to include:"
echo "   http://your-domain.com/api/auth/callback/google"
echo ""
echo "3. Ensure GitHub Actions runner can access this server"
echo ""
echo "4. The deployment path is: $DEPLOY_PATH"
echo "5. Run deployment from GitHub Actions"
echo ""
