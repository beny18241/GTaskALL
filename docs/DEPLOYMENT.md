# Deployment Guide

This guide explains how to deploy GTaskALL on your production server using Docker Hub images.

## Deployment Architecture

```
GitHub Actions → Docker Hub → Your Server (Manual Deployment)
     ↓               ↓              ↓
  1. Build       2. Store      3. Deploy with:
  2. Push        3. Host          - Portainer
                                  - docker-compose
                                  - docker run
```

## Prerequisites

- Docker installed on your server
- Docker Hub account with the image (see [DOCKERHUB_SETUP.md](./DOCKERHUB_SETUP.md))
- Server with ports 80 and 443 available

## Quick Start

After GitHub Actions builds and pushes your image:

```bash
# Pull the latest image
docker pull your-dockerhub-username/gtaskall:latest

# Choose your deployment method below
```

---

## Method 0: Simple Standalone (No nginx)

**Simplest deployment** - Run the app container directly without nginx reverse proxy.

### Single Command Deployment

```bash
docker run -d \
  --name gtaskall-app \
  --restart always \
  -p 80:3003 \
  -e GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com" \
  -e GOOGLE_CLIENT_SECRET="your-client-secret" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e NEXTAUTH_URL="http://your-domain.com" \
  -e NODE_ENV="production" \
  beny18241/gtaskall:latest
```

**Port Mapping:**
- `-p 80:3003` maps host port 80 → container port 3003
- Access at: `http://your-domain.com` (uses port 80 by default)
- Alternative: `-p 3003:3003` to access at `http://your-domain.com:3003`
- If port 80 is in use: `-p 8080:3003` and access at `http://your-domain.com:8080`

**Important**: Replace:
- `your-client-id.apps.googleusercontent.com` with your Google OAuth Client ID
- `your-client-secret` with your Google OAuth Client Secret
- `your-domain.com` with your actual domain or server IP
- Generate new `AUTH_SECRET` with `openssl rand -base64 32`

### Verify Deployment

```bash
# Check container status
docker ps

# Check logs
docker logs -f gtaskall-app

# Test application
curl http://localhost
```

### Management Commands

```bash
# View logs
docker logs -f gtaskall-app

# Restart container
docker restart gtaskall-app

# Stop container
docker stop gtaskall-app

# Remove container
docker rm gtaskall-app

# Update to latest image
docker pull beny18241/gtaskall:latest
docker stop gtaskall-app && docker rm gtaskall-app
# Then run the docker run command again
```

### When to Use This Method

✅ **Use standalone when:**
- You want the simplest possible deployment
- You don't need SSL/TLS (HTTPS)
- You're testing or developing
- Your server has no other web services

❌ **Don't use standalone when:**
- You need HTTPS (use Method 1 or 2 with nginx)
- You need advanced routing or load balancing
- You need to serve multiple applications

---

## Method 1: Docker Compose (Recommended for Production)

Docker Compose manages both the Next.js app and nginx containers together.

### Step 1: Create Directory Structure

```bash
mkdir -p /opt/gtaskall
cd /opt/gtaskall
mkdir -p nginx/conf.d nginx/ssl nginx/logs
```

### Step 2: Create Environment File

Create `/opt/gtaskall/.env`:

```bash
# Docker Hub Configuration
DOCKERHUB_USERNAME=your-dockerhub-username

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth Configuration
AUTH_SECRET=your-generated-secret-here
NEXTAUTH_URL=http://your-domain.com

# Node Environment
NODE_ENV=production
```

Generate `AUTH_SECRET`:
```bash
openssl rand -base64 32
```

### Step 3: Download Configuration Files

Download from your repository:
- `docker-compose.yml`
- `nginx/nginx.conf`
- `nginx/conf.d/gtaskall.conf`

Or clone the repo:
```bash
git clone https://github.com/yourusername/GTaskALL.git /tmp/gtaskall
cp /tmp/gtaskall/docker-compose.yml /opt/gtaskall/
cp /tmp/gtaskall/nginx/nginx.conf /opt/gtaskall/nginx/
cp /tmp/gtaskall/nginx/conf.d/gtaskall.conf /opt/gtaskall/nginx/conf.d/
```

### Step 4: Deploy

```bash
cd /opt/gtaskall
docker-compose pull
docker-compose up -d
```

### Step 5: Verify

```bash
# Check status
docker-compose ps

# Check logs
docker-compose logs -f

# Test health endpoint
curl http://localhost/health
```

### Management Commands

```bash
# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Update to latest image
docker-compose pull && docker-compose up -d
```

---

## Method 2: Docker Run with nginx (Advanced)

Deploy containers individually using `docker run` with nginx reverse proxy.

### Step 1: Create Docker Network

```bash
docker network create gtaskall-network
```

### Step 2: Deploy Next.js Container

```bash
docker run -d \
  --name gtaskall-app \
  --network gtaskall-network \
  --restart always \
  -e GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com" \
  -e GOOGLE_CLIENT_SECRET="your-client-secret" \
  -e AUTH_SECRET="your-generated-secret-here" \
  -e NEXTAUTH_URL="http://your-domain.com" \
  -e NODE_ENV="production" \
  --health-cmd="node -e \"require('http').get('http://localhost:3003/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=40s \
  your-dockerhub-username/gtaskall:latest
```

**Important**: Replace all `your-*` placeholders with your actual values.

### Step 3: Create nginx Configuration

Create `/opt/gtaskall/nginx/nginx.conf`:
```nginx
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log warn;
pid /var/run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    include /etc/nginx/mime.types;
    default_type application/octet-stream;

    log_format main '$remote_addr - $remote_user [$time_local] "$request" '
                    '$status $body_bytes_sent "$http_referer" '
                    '"$http_user_agent" "$http_x_forwarded_for"';

    access_log /var/log/nginx/access.log main;

    sendfile on;
    tcp_nopush on;
    tcp_nodelay on;
    keepalive_timeout 65;
    types_hash_max_size 2048;
    client_max_body_size 20M;

    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml text/javascript
               application/json application/javascript application/xml+rss
               application/rss+xml font/truetype font/opentype
               application/vnd.ms-fontobject image/svg+xml;

    include /etc/nginx/conf.d/*.conf;
}
```

Create `/opt/gtaskall/nginx/conf.d/gtaskall.conf`:
```nginx
upstream nextjs_upstream {
    server gtaskall-app:3003;
    keepalive 32;
}

server {
    listen 80;
    server_name _;

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }

    location / {
        proxy_pass http://nextjs_upstream;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

### Step 4: Deploy nginx Container

```bash
docker run -d \
  --name gtaskall-nginx \
  --network gtaskall-network \
  --restart always \
  -p 80:80 \
  -p 443:443 \
  -v /opt/gtaskall/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v /opt/gtaskall/nginx/conf.d:/etc/nginx/conf.d:ro \
  -v /opt/gtaskall/nginx/ssl:/etc/nginx/ssl:ro \
  -v /opt/gtaskall/nginx/logs:/var/log/nginx \
  --health-cmd="wget --quiet --tries=1 --spider http://localhost/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=10s \
  nginx:alpine
```

### Step 5: Verify Deployment

```bash
# Check container status
docker ps

# Check logs
docker logs gtaskall-app
docker logs gtaskall-nginx

# Test application
curl http://localhost/health
curl http://your-server-ip
```

### Management Commands

```bash
# View logs
docker logs -f gtaskall-app
docker logs -f gtaskall-nginx

# Restart containers
docker restart gtaskall-app
docker restart gtaskall-nginx

# Stop containers
docker stop gtaskall-app gtaskall-nginx

# Remove containers
docker rm gtaskall-app gtaskall-nginx

# Update to latest image
docker pull your-dockerhub-username/gtaskall:latest
docker stop gtaskall-app
docker rm gtaskall-app
# Run the docker run command again from Step 2
```

---

## Method 3: Portainer Deployment

Deploy using Portainer's web interface.

### Option A: Deploy as Stack (Recommended)

#### Step 1: Log in to Portainer

Navigate to your Portainer instance: `http://your-portainer-server:9000`

#### Step 2: Create Stack

1. Go to **Stacks** in the left sidebar
2. Click **+ Add stack**
3. Name: `gtaskall`
4. Build method: **Web editor**

#### Step 3: Paste docker-compose.yml

Copy and paste this configuration:

```yaml
version: '3.8'

services:
  nextjs:
    image: ${DOCKERHUB_USERNAME}/gtaskall:latest
    container_name: gtaskall-app
    restart: unless-stopped
    environment:
      - GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID}
      - GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET}
      - AUTH_SECRET=${AUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL}
      - NODE_ENV=production
    networks:
      - gtaskall-network
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3003/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    labels:
      - "com.gtaskall.service=nextjs"
      - "com.gtaskall.version=1.0"

  nginx:
    image: nginx:alpine
    container_name: gtaskall-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - gtaskall-nginx-conf:/etc/nginx/nginx.conf:ro
      - gtaskall-nginx-confd:/etc/nginx/conf.d:ro
      - gtaskall-nginx-ssl:/etc/nginx/ssl:ro
      - gtaskall-nginx-logs:/var/log/nginx
    depends_on:
      - nextjs
    networks:
      - gtaskall-network
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
    labels:
      - "com.gtaskall.service=nginx"
      - "com.gtaskall.version=1.0"

networks:
  gtaskall-network:
    driver: bridge
    name: gtaskall-network

volumes:
  gtaskall-nginx-conf:
  gtaskall-nginx-confd:
  gtaskall-nginx-ssl:
  gtaskall-nginx-logs:
```

#### Step 4: Add Environment Variables

Click **+ Add an environment variable** for each:

| Name | Value |
|------|-------|
| `DOCKERHUB_USERNAME` | `your-dockerhub-username` |
| `GOOGLE_CLIENT_ID` | `your-client-id.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `your-client-secret` |
| `AUTH_SECRET` | Generate with `openssl rand -base64 32` |
| `NEXTAUTH_URL` | `http://your-domain.com` |

#### Step 5: Deploy Stack

1. Click **Deploy the stack**
2. Wait for deployment to complete
3. Check status in **Stacks** → **gtaskall**

#### Step 6: Configure nginx (First Time)

After first deployment, you need to copy nginx config files into the volumes:

```bash
# Create a temporary container to access volumes
docker run --rm -it \
  -v gtaskall-nginx-conf:/nginx-conf \
  -v gtaskall-nginx-confd:/nginx-confd \
  alpine sh

# Inside the container, create configs:
cat > /nginx-conf/nginx.conf << 'EOF'
# Paste nginx.conf content here (from Method 2, Step 3)
EOF

cat > /nginx-confd/gtaskall.conf << 'EOF'
# Paste gtaskall.conf content here (from Method 2, Step 3)
EOF

exit
```

Or use docker cp:
```bash
# From your local files
docker cp nginx.conf gtaskall-nginx:/etc/nginx/nginx.conf
docker cp gtaskall.conf gtaskall-nginx:/etc/nginx/conf.d/gtaskall.conf

# Restart nginx
docker restart gtaskall-nginx
```

### Option B: Deploy as Individual Containers

#### Step 1: Create Network

1. Go to **Networks**
2. Click **+ Add network**
3. Name: `gtaskall-network`
4. Driver: `bridge`
5. Click **Create the network**

#### Step 2: Deploy Next.js Container

1. Go to **Containers**
2. Click **+ Add container**
3. Configure:
   - **Name**: `gtaskall-app`
   - **Image**: `your-dockerhub-username/gtaskall:latest`
   - **Network**: Select `gtaskall-network`
   - **Restart policy**: `Unless stopped`

4. **Environment variables** (click + Advanced settings):
   - `GOOGLE_CLIENT_ID` = your client ID
   - `GOOGLE_CLIENT_SECRET` = your secret
   - `AUTH_SECRET` = generated secret
   - `NEXTAUTH_URL` = http://your-domain.com
   - `NODE_ENV` = production

5. Click **Deploy the container**

#### Step 3: Deploy nginx Container

1. Go to **Containers**
2. Click **+ Add container**
3. Configure:
   - **Name**: `gtaskall-nginx`
   - **Image**: `nginx:alpine`
   - **Network**: Select `gtaskall-network`
   - **Restart policy**: `Unless stopped`

4. **Port mapping**:
   - Host: `80`, Container: `80`
   - Host: `443`, Container: `443`

5. **Volumes**:
   - `/opt/gtaskall/nginx/nginx.conf` → `/etc/nginx/nginx.conf` (Read-only)
   - `/opt/gtaskall/nginx/conf.d` → `/etc/nginx/conf.d` (Read-only)
   - `/opt/gtaskall/nginx/logs` → `/var/log/nginx`

6. Click **Deploy the container**

---

## Environment Variables Reference

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `DOCKERHUB_USERNAME` | Yes | Your Docker Hub username | `johndoe` |
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth Client ID | `123.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth Client Secret | `GOCSPX-xxx` |
| `AUTH_SECRET` | Yes | NextAuth secret (32+ chars) | `abc123...` |
| `NEXTAUTH_URL` | Yes | Your production URL | `http://your-domain.com` |
| `NODE_ENV` | Yes | Node environment | `production` |

---

## Post-Deployment

### Verify Deployment

```bash
# Check containers are running
docker ps

# Test health endpoint
curl http://your-server-ip/health

# Test application
curl http://your-server-ip

# Check logs
docker logs gtaskall-app
docker logs gtaskall-nginx
```

### Access Application

Navigate to: `http://your-server-ip` or `http://your-domain.com`

### Update to Latest Version

When a new image is pushed to Docker Hub:

**Docker Compose:**
```bash
cd /opt/gtaskall
docker-compose pull
docker-compose up -d
```

**Docker Run:**
```bash
docker pull your-dockerhub-username/gtaskall:latest
docker stop gtaskall-app
docker rm gtaskall-app
# Run the docker run command again
```

**Portainer:**
1. Go to **Stacks** → **gtaskall**
2. Click **Pull and redeploy** button
Or:
1. Go to **Containers**
2. Select container
3. Click **Recreate**
4. Enable **Pull latest image**

---

## Troubleshooting

### Container Fails to Start

**Check logs:**
```bash
docker logs gtaskall-app
```

**Common issues:**
- Missing environment variables
- Invalid Google OAuth credentials
- Wrong `NEXTAUTH_URL`

### Cannot Access Application

**Check nginx logs:**
```bash
docker logs gtaskall-nginx
```

**Verify:**
- nginx container is running
- Port 80 is not blocked by firewall
- nginx config is correct

### OAuth Login Fails

**Verify:**
1. `NEXTAUTH_URL` matches your actual domain
2. Google OAuth redirect URI includes: `http://your-domain.com/api/auth/callback/google`
3. Google Tasks API is enabled

### Health Check Failing

**Check:**
```bash
# Test directly
docker exec gtaskall-app node -e "require('http').get('http://localhost:3003/', (r) => {console.log(r.statusCode)})"

# Should return 200
```

---

## SSL/TLS Setup (Optional)

For production with HTTPS:

1. Get SSL certificate (Let's Encrypt):
   ```bash
   sudo certbot certonly --standalone -d your-domain.com
   ```

2. Copy certificates:
   ```bash
   sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/gtaskall/nginx/ssl/cert.pem
   sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/gtaskall/nginx/ssl/key.pem
   ```

3. Update nginx config to enable HTTPS server block

4. Update `NEXTAUTH_URL` to use `https://`

5. Restart nginx:
   ```bash
   docker restart gtaskall-nginx
   ```

---

## Complete Example with All Commands

Here's a complete deployment script:

```bash
#!/bin/bash

# Configuration
DOCKERHUB_USER="your-dockerhub-username"
GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="your-secret"
AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL="http://your-domain.com"

# Create network
docker network create gtaskall-network

# Deploy Next.js
docker run -d \
  --name gtaskall-app \
  --network gtaskall-network \
  --restart always \
  -e GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" \
  -e GOOGLE_CLIENT_SECRET="$GOOGLE_CLIENT_SECRET" \
  -e AUTH_SECRET="$AUTH_SECRET" \
  -e NEXTAUTH_URL="$NEXTAUTH_URL" \
  -e NODE_ENV="production" \
  --health-cmd="node -e \"require('http').get('http://localhost:3003/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=40s \
  $DOCKERHUB_USER/gtaskall:latest

# Deploy nginx (after creating config files)
docker run -d \
  --name gtaskall-nginx \
  --network gtaskall-network \
  --restart always \
  -p 80:80 \
  -p 443:443 \
  -v /opt/gtaskall/nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  -v /opt/gtaskall/nginx/conf.d:/etc/nginx/conf.d:ro \
  -v /opt/gtaskall/nginx/ssl:/etc/nginx/ssl:ro \
  -v /opt/gtaskall/nginx/logs:/var/log/nginx \
  --health-cmd="wget --quiet --tries=1 --spider http://localhost/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=10s \
  nginx:alpine

echo "Deployment complete!"
echo "Access your application at: $NEXTAUTH_URL"
```

Save as `deploy.sh`, make executable with `chmod +x deploy.sh`, and run with `./deploy.sh`.

---

## Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Portainer Documentation](https://docs.portainer.io/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [nginx Documentation](https://nginx.org/en/docs/)
