# Server Environment Setup

This document provides step-by-step instructions for setting up the production server for GTaskALL deployment.

## Prerequisites

- Server with Docker and Docker Compose installed
- GitHub Actions self-hosted runner configured
- Server accessible from GitHub runner (same network)
- Root or sudo access to the server
- **Docker Hub account and credentials configured** (see [DOCKERHUB_SETUP.md](./DOCKERHUB_SETUP.md))

## Important: Docker Hub Setup First

**Before proceeding with server setup**, you must configure Docker Hub integration:

1. Read the [Docker Hub Setup Guide](./DOCKERHUB_SETUP.md)
2. Create Docker Hub account
3. Generate access token
4. Add GitHub Secrets (`DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN`)

Without Docker Hub setup, the deployment workflow cannot push/pull images.

## Step 1: Run Server Setup Script

The server setup script will install Docker, create necessary users and directories, and configure the environment.

```bash
sudo bash scripts/server-setup.sh
```

This script will:
- Install Docker and Docker Compose (if not already installed)
- Create a `gtaskall` user for deployment
- Create `/opt/gtaskall` directory structure
- Generate `.env.template` file
- Configure firewall rules (ports 80, 443)
- Set up log rotation

## Step 2: Configure Environment Variables

After running the setup script, you need to create and configure the `.env` file with your actual values.

```bash
# Copy template
sudo cp /opt/gtaskall/.env.template /opt/gtaskall/.env

# Edit with actual values
sudo nano /opt/gtaskall/.env
```

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username (same as GitHub Secret) | `johndoe` |
| `GOOGLE_CLIENT_ID` | OAuth 2.0 Client ID from Google Cloud Console | `123456789.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | OAuth 2.0 Client Secret from Google Cloud Console | `GOCSPX-xxxxxxxxxxxxx` |
| `AUTH_SECRET` | Random secret for NextAuth.js (generate with `openssl rand -base64 32`) | `abc123xyz789...` |
| `NEXTAUTH_URL` | Your production URL | `http://tasks.example.com` |
| `NODE_ENV` | Node environment | `production` |

### Generating AUTH_SECRET

Generate a secure random secret:

```bash
openssl rand -base64 32
```

Copy the output to the `AUTH_SECRET` variable in your `.env` file.

## Step 3: Update Google OAuth Configuration

You need to update your Google OAuth credentials to allow redirects from your production domain.

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Select your OAuth 2.0 Client ID
3. Add Authorized Redirect URI:
   ```
   http://your-domain.com/api/auth/callback/google
   ```
   Or with HTTPS (recommended):
   ```
   https://your-domain.com/api/auth/callback/google
   ```
4. Save changes

### Enable Google Tasks API

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/library)
2. Search for "Google Tasks API"
3. Click "Enable"

## Step 4: Verify Firewall Rules

Ensure that your firewall allows traffic on ports 80 (HTTP) and 443 (HTTPS).

```bash
# Check firewall status
sudo ufw status

# Allow HTTP and HTTPS (if not already allowed)
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
```

## Step 5: Configure GitHub Actions Runner

Ensure your GitHub Actions self-hosted runner is configured and has access to the server.

### Verify Runner Access

On the runner machine:

```bash
# Test SSH access (if using SSH)
ssh gtaskall@your-server-ip

# Test Docker access
docker ps
```

### Runner Requirements

- Docker access (user added to docker group)
- Write access to `/opt/gtaskall`
- Network access to the deployment server

## Step 6: Test Deployment

Trigger a deployment from GitHub Actions:

1. Push a commit to the `main` branch, or
2. Manually trigger the workflow from the Actions tab

Monitor the deployment:

```bash
# On the server
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh status
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh logs -f
```

## Step 7: Verify Application

After deployment completes:

1. Check health endpoint:
   ```bash
   curl http://localhost/health
   ```

2. Access the application in your browser:
   ```
   http://your-domain.com
   ```

3. Test Google OAuth login

## Management Commands

Use the management script to control the deployment:

```bash
# View status
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh status

# View logs (follow mode)
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh logs -f

# Restart services
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh restart

# Stop services
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh stop

# Start services
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh start

# Check health
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh health

# Backup current deployment
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh backup

# Rollback to previous version
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh rollback

# Clean up old Docker images
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh clean

# Reload environment variables
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh update-env
```

## Monitoring

### Health Monitoring

Set up automated health monitoring with cron:

```bash
# Edit crontab for gtaskall user
sudo crontab -u gtaskall -e

# Add health check (every 5 minutes)
*/5 * * * * /opt/gtaskall/scripts/health-monitor.sh >> /var/log/gtaskall-health.log 2>&1
```

### View Logs

```bash
# Application logs
cd /opt/gtaskall
docker compose logs nextjs

# Nginx logs
docker compose logs nginx

# All logs
docker compose logs

# Follow logs
docker compose logs -f
```

## Troubleshooting

### Issue: Docker build fails

**Solution:**
- Check Node version compatibility
- Verify all files are present
- Clear Docker build cache:
  ```bash
  docker builder prune
  ```

### Issue: Health checks failing

**Solution:**
1. Check container logs:
   ```bash
   cd /opt/gtaskall
   docker compose logs nextjs
   docker compose logs nginx
   ```

2. Verify `.env` file has correct values:
   ```bash
   sudo cat /opt/gtaskall/.env
   ```

3. Check `NEXTAUTH_URL` matches actual domain

4. Ensure Google OAuth redirect URI is correct

### Issue: OAuth not working

**Solution:**
- Verify `NEXTAUTH_URL` in `.env` matches your domain
- Check Google Console redirect URIs match exactly
- Ensure nginx proxy headers are set correctly
- Check for HTTPS vs HTTP mismatch

### Issue: Application not accessible

**Solution:**
1. Check nginx container:
   ```bash
   docker compose logs nginx
   ```

2. Verify firewall rules:
   ```bash
   sudo ufw status
   ```

3. Test health endpoint:
   ```bash
   curl http://localhost/health
   ```

4. Check nginx configuration syntax:
   ```bash
   docker compose exec nginx nginx -t
   ```

### Issue: Deployment fails

**Solution:**
- Check GitHub Actions logs
- Verify runner has Docker access
- Check disk space on server:
  ```bash
  df -h
  ```
- Verify `.env` file exists at `/opt/gtaskall/.env`

## SSL/TLS Configuration (Production)

For production deployments with custom domain:

### 1. Install Certbot

```bash
sudo apt-get update
sudo apt-get install certbot
```

### 2. Get SSL Certificate

```bash
sudo certbot certonly --standalone -d your-domain.com
```

### 3. Copy Certificates

```bash
sudo cp /etc/letsencrypt/live/your-domain.com/fullchain.pem /opt/gtaskall/nginx/ssl/cert.pem
sudo cp /etc/letsencrypt/live/your-domain.com/privkey.pem /opt/gtaskall/nginx/ssl/key.pem
sudo chown gtaskall:gtaskall /opt/gtaskall/nginx/ssl/*
```

### 4. Enable HTTPS in nginx

Edit `/opt/gtaskall/nginx/conf.d/gtaskall.conf`:

1. Uncomment the HTTPS server block
2. Update `server_name` to your domain
3. Uncomment the HTTP to HTTPS redirect

### 5. Update Environment Variables

Update `NEXTAUTH_URL` in `/opt/gtaskall/.env`:

```bash
NEXTAUTH_URL=https://your-domain.com
```

### 6. Update Google OAuth Redirect URI

Update the redirect URI in Google Cloud Console to use `https://`.

### 7. Restart Services

```bash
cd /opt/gtaskall
docker compose down
docker compose up -d
```

### 8. Set Up Auto-Renewal

```bash
# Test renewal
sudo certbot renew --dry-run

# Add cron job for auto-renewal
sudo crontab -e

# Add line (renew weekly):
0 3 * * 1 certbot renew --quiet && docker exec gtaskall-nginx nginx -s reload
```

## Backup Strategy

### Automated Backups

Set up automated backups with cron:

```bash
sudo crontab -u gtaskall -e

# Add weekly backup (every Sunday at 2 AM)
0 2 * * 0 /opt/gtaskall/scripts/manage-deployment.sh backup
```

### Manual Backup

```bash
sudo -u gtaskall /opt/gtaskall/scripts/manage-deployment.sh backup
```

Backups are stored in `/opt/gtaskall/backups/`.

## Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Docker Documentation](https://docs.docker.com/)
- [nginx Documentation](https://nginx.org/en/docs/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
