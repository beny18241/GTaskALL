# Docker Hub Setup Guide

This guide explains how to set up Docker Hub integration for automated image builds and deployments.

## Overview

The deployment workflow uses Docker Hub as a container registry to:
- Store built Docker images
- Enable image versioning and tagging
- Pull images from anywhere (not limited to self-hosted runner)
- Provide build caching for faster builds
- Allow manual deployments from any machine

## Prerequisites

- Docker Hub account (free tier works fine)
- GitHub repository access
- Server with Docker installed

## Step 1: Create Docker Hub Account

If you don't have a Docker Hub account:

1. Go to [Docker Hub](https://hub.docker.com/)
2. Click "Sign Up"
3. Create your account (remember your username)

## Step 2: Create Docker Hub Access Token

Access tokens are more secure than using your Docker Hub password.

1. Log in to [Docker Hub](https://hub.docker.com/)
2. Click on your username (top right) → **Account Settings**
3. Go to **Security** tab
4. Click **New Access Token**
5. Configure the token:
   - **Description**: `GitHub Actions - GTaskALL`
   - **Access permissions**: `Read, Write, Delete`
6. Click **Generate**
7. **IMPORTANT**: Copy the token immediately (you won't see it again)

## Step 3: Create Docker Hub Repository (Optional)

By default, GitHub Actions will create a public repository automatically. For a private repository:

1. Go to [Docker Hub Repositories](https://hub.docker.com/repositories)
2. Click **Create Repository**
3. Configure:
   - **Name**: `gtaskall`
   - **Visibility**: Private or Public
   - **Description**: GTaskALL - Google Tasks Manager
4. Click **Create**

## Step 4: Add GitHub Secrets

Add your Docker Hub credentials to GitHub Secrets so the workflow can push images.

### 4.1 Navigate to GitHub Secrets

1. Go to your GitHub repository
2. Click **Settings** tab
3. Click **Secrets and variables** → **Actions** (left sidebar)
4. Click **New repository secret**

### 4.2 Add DOCKERHUB_USERNAME

1. **Name**: `DOCKERHUB_USERNAME`
2. **Secret**: Your Docker Hub username (e.g., `johndoe`)
3. Click **Add secret**

### 4.3 Add DOCKERHUB_TOKEN

1. Click **New repository secret** again
2. **Name**: `DOCKERHUB_TOKEN`
3. **Secret**: The access token you copied in Step 2
4. Click **Add secret**

### Verify Secrets

You should now see two secrets:
- ✓ `DOCKERHUB_USERNAME`
- ✓ `DOCKERHUB_TOKEN`

## Step 5: Update Server Environment

Add your Docker Hub username to the server's `.env` file:

```bash
# On your server
sudo nano /opt/gtaskall/.env
```

Add this line:
```bash
DOCKERHUB_USERNAME=your-dockerhub-username
```

Example:
```bash
DOCKERHUB_USERNAME=johndoe
```

**Why?** Docker Compose needs to know which Docker Hub user's images to pull.

## Step 6: Test the Workflow

Trigger a deployment to test the Docker Hub integration:

### Option 1: Push to Main Branch

```bash
git add .
git commit -m "Test Docker Hub integration"
git push origin main
```

### Option 2: Manual Workflow Trigger

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Build and Deploy to Production** workflow
4. Click **Run workflow** button
5. Click **Run workflow** (green button)

### Monitor the Build

1. Watch the workflow run in GitHub Actions
2. Check the **Build and Push Docker Image** job:
   - Should log in to Docker Hub successfully
   - Should build the image
   - Should push to Docker Hub
3. Check the **Deploy to Server** job:
   - Should pull the image from Docker Hub
   - Should deploy successfully

### Verify on Docker Hub

1. Go to [Docker Hub Repositories](https://hub.docker.com/repositories)
2. You should see your `gtaskall` repository
3. Click on it to see tags (latest, commit SHA, etc.)

## Deployment Flow with Docker Hub

Here's how the complete flow works:

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Developer pushes code to main branch                     │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. GitHub Actions: Build Job                                │
│    - Checkout code                                           │
│    - Login to Docker Hub                                     │
│    - Build Docker image                                      │
│    - Push to Docker Hub (username/gtaskall:latest)          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Docker Hub                                                │
│    - Stores image: username/gtaskall:latest                 │
│    - Also stores: username/gtaskall:sha-abc123              │
│    - Stores build cache                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. GitHub Actions: Deploy Job                               │
│    - Login to Docker Hub                                     │
│    - Pull image from Docker Hub                              │
│    - Deploy with Docker Compose                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Server (/opt/gtaskall)                                   │
│    - Docker Compose pulls username/gtaskall:latest          │
│    - Starts containers                                       │
│    - Application running                                     │
└─────────────────────────────────────────────────────────────┘
```

## Manual Deployment from Any Machine

With Docker Hub, you can deploy manually from any machine with Docker access:

### 1. Install Docker Compose on your machine

### 2. Clone the repository

```bash
git clone https://github.com/yourusername/GTaskALL.git
cd GTaskALL
```

### 3. Create .env file

```bash
cp .env.example .env
nano .env
```

Fill in your environment variables.

### 4. Set Docker Hub username

```bash
export DOCKERHUB_USERNAME=your-dockerhub-username
```

Or add it to your `.env` file.

### 5. Deploy

```bash
docker-compose pull
docker-compose up -d
```

## Image Versioning

The workflow creates multiple image tags:

| Tag | Description | Example |
|-----|-------------|---------|
| `latest` | Most recent build from main | `username/gtaskall:latest` |
| `sha-{commit}` | Specific commit SHA | `username/gtaskall:sha-abc123def` |
| `main` | Latest from main branch | `username/gtaskall:main` |

### Deploy Specific Version

To deploy a specific version:

```bash
# Edit docker-compose.yml temporarily
services:
  nextjs:
    image: username/gtaskall:sha-abc123def
    # ... rest of config

# Deploy
docker-compose up -d
```

## Troubleshooting

### Issue: "unauthorized: authentication required"

**Cause**: Docker Hub credentials not configured or incorrect.

**Solution**:
1. Verify GitHub Secrets are set correctly:
   - `DOCKERHUB_USERNAME` (your Docker Hub username)
   - `DOCKERHUB_TOKEN` (your access token, not password)
2. Regenerate access token if needed
3. Update GitHub Secrets

### Issue: "repository does not exist"

**Cause**: Wrong username or repository doesn't exist.

**Solution**:
1. Verify `DOCKERHUB_USERNAME` in GitHub Secrets matches your Docker Hub username exactly
2. Check case sensitivity (Docker Hub usernames are lowercase)
3. Create repository manually on Docker Hub

### Issue: "denied: requested access to the resource is denied"

**Cause**: Access token doesn't have write permissions.

**Solution**:
1. Create new access token with `Read, Write, Delete` permissions
2. Update `DOCKERHUB_TOKEN` in GitHub Secrets

### Issue: Image not pulling on server

**Cause**: Server doesn't have Docker Hub credentials or wrong username in .env.

**Solution**:
1. For public images, no credentials needed
2. For private images:
   ```bash
   docker login
   # Enter Docker Hub username and token
   ```
3. Verify `DOCKERHUB_USERNAME` in `/opt/gtaskall/.env`

### Issue: Build cache not working

**Cause**: Cache location not accessible or cache permissions issue.

**Solution**:
1. Builds will still work, just slower
2. Check GitHub Actions runner has permissions
3. Cache will rebuild over time

## Best Practices

### Security

1. **Use Access Tokens**: Never use your Docker Hub password in CI/CD
2. **Limit Token Scope**: Use tokens with minimum required permissions
3. **Rotate Tokens**: Regenerate tokens periodically (every 6-12 months)
4. **Private Repositories**: Use private Docker Hub repos for production

### Performance

1. **Build Caching**: The workflow uses Docker Hub for layer caching
2. **Multi-stage Builds**: Dockerfile uses multi-stage builds to minimize image size
3. **Tag Strategy**: Use commit SHAs for specific versions, `latest` for rolling updates

### Cost Management

1. **Free Tier**: Docker Hub free tier includes:
   - Unlimited public repositories
   - 1 private repository
   - 200 container pulls per 6 hours
2. **Paid Plans**: Consider Docker Hub Pro ($5/month) for:
   - Unlimited private repositories
   - Unlimited pulls
   - Parallel builds

## Alternative: GitHub Container Registry

If you prefer to use GitHub Container Registry (ghcr.io) instead of Docker Hub:

1. The process is similar but uses GitHub tokens
2. Benefits: Integrated with GitHub, unlimited private images
3. Documentation: [Working with the Container registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)

To switch to ghcr.io, modify `.github/workflows/deploy.yml`:

```yaml
- name: Log in to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}
```

## Additional Resources

- [Docker Hub Documentation](https://docs.docker.com/docker-hub/)
- [Docker Hub Access Tokens](https://docs.docker.com/docker-hub/access-tokens/)
- [GitHub Actions Docker Login](https://github.com/docker/login-action)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
