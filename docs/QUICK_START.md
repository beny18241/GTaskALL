# Quick Start Guide

Fast deployment guide for GTaskALL. For detailed instructions, see [DEPLOYMENT.md](./DEPLOYMENT.md).

## Prerequisites

- ✅ Docker Hub account configured ([DOCKERHUB_SETUP.md](./DOCKERHUB_SETUP.md))
- ✅ GitHub Secrets added (`DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`)
- ✅ Google OAuth credentials ready
- ✅ Docker installed on deployment server

## Step 1: Build and Push (Automatic)

Push to main branch:
```bash
git push origin main
```

GitHub Actions automatically builds and pushes to Docker Hub.

## Step 2: Deploy on Your Server

### Option A: Docker Compose (Easiest)

```bash
# 1. Create directory
mkdir -p /opt/gtaskall/nginx/{conf.d,ssl,logs}
cd /opt/gtaskall

# 2. Download files from repo
wget https://raw.githubusercontent.com/yourusername/GTaskALL/main/docker-compose.yml
wget -O nginx/nginx.conf https://raw.githubusercontent.com/yourusername/GTaskALL/main/nginx/nginx.conf
wget -O nginx/conf.d/gtaskall.conf https://raw.githubusercontent.com/yourusername/GTaskALL/main/nginx/conf.d/gtaskall.conf

# 3. Create .env file
cat > .env << EOF
DOCKERHUB_USERNAME=your-dockerhub-username
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
AUTH_SECRET=$(openssl rand -base64 32)
NEXTAUTH_URL=http://your-domain.com
NODE_ENV=production
EOF

# 4. Deploy
docker-compose up -d

# 5. Check status
docker-compose ps
curl http://localhost/health
```

### Option B: Docker Run (Single Command)

```bash
# Create network
docker network create gtaskall-network

# Run application
docker run -d \
  --name gtaskall-app \
  --network gtaskall-network \
  --restart always \
  -e GOOGLE_CLIENT_ID="your-client-id.apps.googleusercontent.com" \
  -e GOOGLE_CLIENT_SECRET="your-client-secret" \
  -e AUTH_SECRET="$(openssl rand -base64 32)" \
  -e NEXTAUTH_URL="http://your-domain.com" \
  -e NODE_ENV="production" \
  --health-cmd="node -e \"require('http').get('http://localhost:3001/', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})\"" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  --health-start-period=40s \
  your-dockerhub-username/gtaskall:latest

# Setup nginx (create config files first - see DEPLOYMENT.md)
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
  nginx:alpine
```

### Option C: Portainer (GUI)

1. **Create Stack** in Portainer
2. **Paste** docker-compose.yml content
3. **Add Environment Variables**:
   - `DOCKERHUB_USERNAME`
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `AUTH_SECRET`
   - `NEXTAUTH_URL`
4. **Deploy Stack**

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed Portainer instructions.

## Step 3: Configure Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Add Authorized Redirect URI:
   ```
   http://your-domain.com/api/auth/callback/google
   ```
3. Enable Google Tasks API

## Step 4: Access Application

Navigate to: `http://your-server-ip` or `http://your-domain.com`

## Management Commands

### Docker Compose

```bash
# View logs
docker-compose logs -f

# Restart
docker-compose restart

# Stop
docker-compose down

# Update to latest
docker-compose pull && docker-compose up -d
```

### Docker Run

```bash
# View logs
docker logs -f gtaskall-app

# Restart
docker restart gtaskall-app gtaskall-nginx

# Update
docker pull your-dockerhub-username/gtaskall:latest
docker stop gtaskall-app && docker rm gtaskall-app
# Then run the docker run command again
```

### Portainer

- **Update**: Stacks → Select stack → "Pull and redeploy"
- **Logs**: Containers → Select container → "Logs"
- **Restart**: Containers → Select container → "Restart"

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Cannot access app | Check `docker ps` and `docker logs gtaskall-nginx` |
| OAuth fails | Verify `NEXTAUTH_URL` matches domain and Google redirect URI |
| Container exits | Check `docker logs gtaskall-app` for errors |
| Health check fails | Verify environment variables are correct |

## Environment Variables

| Variable | Where to Get It |
|----------|----------------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username |
| `GOOGLE_CLIENT_ID` | Google Cloud Console → APIs & Services → Credentials |
| `GOOGLE_CLIENT_SECRET` | Google Cloud Console → APIs & Services → Credentials |
| `AUTH_SECRET` | Generate: `openssl rand -base64 32` |
| `NEXTAUTH_URL` | Your server URL (e.g., `http://192.168.1.100` or `http://tasks.example.com`) |

## Update Workflow

1. Make code changes
2. Commit and push to main:
   ```bash
   git add .
   git commit -m "Update feature"
   git push origin main
   ```
3. GitHub Actions builds and pushes new image
4. Update on server:
   ```bash
   docker-compose pull && docker-compose up -d
   # or
   docker pull your-username/gtaskall:latest && docker restart gtaskall-app
   ```

## Complete Documentation

- **Detailed Deployment**: [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Docker Hub Setup**: [DOCKERHUB_SETUP.md](./DOCKERHUB_SETUP.md)
- **Server Configuration**: [SERVER_SETUP.md](./SERVER_SETUP.md)

## Getting Help

- Check logs: `docker logs gtaskall-app`
- Verify health: `curl http://localhost/health`
- Test connectivity: `docker exec gtaskall-nginx wget -O- http://gtaskall-app:3001`

## Architecture

```
┌─────────────────────────────────────────────┐
│  GitHub Actions (Build & Push)              │
│  • Builds Docker image                      │
│  • Pushes to Docker Hub                     │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Docker Hub (Container Registry)            │
│  • Stores: username/gtaskall:latest         │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────┐
│  Your Server (Manual Deployment)            │
│  ┌─────────────────┐  ┌─────────────────┐  │
│  │ gtaskall-app    │  │ gtaskall-nginx  │  │
│  │ (Next.js:3001)  │◄─┤ (ports 80/443)  │  │
│  └─────────────────┘  └─────────────────┘  │
└─────────────────────────────────────────────┘
```

## Next Steps

1. ✅ Configure SSL/TLS for HTTPS (see [DEPLOYMENT.md](./DEPLOYMENT.md))
2. ✅ Set up monitoring with health checks
3. ✅ Configure automated backups
4. ✅ Set up custom domain with proper DNS

For production deployments, we strongly recommend:
- Using HTTPS with Let's Encrypt
- Setting up proper monitoring
- Regular backups of environment configuration
- Using a private Docker Hub repository
