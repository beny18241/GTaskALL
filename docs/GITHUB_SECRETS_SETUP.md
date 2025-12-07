# GitHub Secrets Setup Guide

Quick guide to add Docker Hub credentials to your GitHub repository.

## Error You're Seeing

```
Error: Username and password required
```

This means the workflow can't find your Docker Hub credentials in GitHub Secrets.

## What You Need

- Docker Hub account
- Docker Hub access token (more secure than password)
- Access to your GitHub repository settings

---

## Step-by-Step Setup

### Part 1: Get Docker Hub Credentials

#### 1.1 Create/Login to Docker Hub

Go to: https://hub.docker.com/

If you don't have an account:
- Click "Sign Up"
- Create your account
- **Remember your username** (you'll need it)

#### 1.2 Create Access Token

1. Log in to Docker Hub
2. Click your **username** (top right) → **Account Settings**
3. Click **Security** tab (left sidebar)
4. Click **New Access Token** button

5. Configure the token:
   - **Description**: `GitHub Actions - GTaskALL`
   - **Access permissions**: Select **Read, Write, Delete**

6. Click **Generate**

7. **IMPORTANT**: Copy the token immediately!
   ```
   dckr_pat_abc123xyz789...
   ```
   You won't be able to see it again!

---

### Part 2: Add Secrets to GitHub

#### 2.1 Navigate to Repository Secrets

1. Go to your repository: https://github.com/beny18241/GTaskALL

2. Click **Settings** tab (top menu)

3. In the left sidebar, click:
   - **Secrets and variables**
   - Then click **Actions**

4. You should see "Actions secrets and variables"

#### 2.2 Add DOCKERHUB_USERNAME Secret

1. Click **New repository secret** (green button)

2. Fill in:
   - **Name**: `DOCKERHUB_USERNAME`
   - **Secret**: Your Docker Hub username (e.g., `johndoe`)

3. Click **Add secret**

#### 2.3 Add DOCKERHUB_TOKEN Secret

1. Click **New repository secret** again

2. Fill in:
   - **Name**: `DOCKERHUB_TOKEN`
   - **Secret**: Paste the token you copied from Docker Hub
     ```
     dckr_pat_abc123xyz789...
     ```

3. Click **Add secret**

#### 2.4 Verify Secrets

You should now see two secrets listed:
- ✅ `DOCKERHUB_USERNAME`
- ✅ `DOCKERHUB_TOKEN`

**Note**: You can't view the secret values after creation (for security), but you'll see the names.

---

## Step 3: Re-run the Workflow

Now that secrets are added, retry the failed workflow:

### Option A: Re-run Failed Job

1. Go to **Actions** tab
2. Click the failed workflow run
3. Click **Re-run failed jobs** button
4. The workflow should now succeed!

### Option B: Trigger New Run

```bash
# Push an empty commit to trigger workflow
git commit --allow-empty -m "Test workflow with Docker Hub credentials"
git push origin main
```

---

## Troubleshooting

### Issue: "New repository secret" button is greyed out

**Cause**: You don't have admin permissions on the repository.

**Solution**:
- You need to be the repository owner or have admin access
- Ask the repository owner to add the secrets

### Issue: I forgot to copy my Docker Hub token

**Solution**:
1. Go back to Docker Hub → Account Settings → Security
2. Delete the old token
3. Create a new token
4. Copy it this time!
5. Update the `DOCKERHUB_TOKEN` secret in GitHub

### Issue: Wrong username or token

**Solution**:
1. Go to repository **Settings** → **Secrets and variables** → **Actions**
2. Click the secret you want to update
3. Click **Update secret**
4. Enter the correct value
5. Click **Update secret**

### Issue: Secrets added but workflow still fails

**Check**:
1. Secret names are EXACTLY:
   - `DOCKERHUB_USERNAME` (all caps, with underscore)
   - `DOCKERHUB_TOKEN` (all caps, with underscore)

2. Username is correct (check on Docker Hub)

3. Token has Write permissions

4. Token hasn't expired

---

## Quick Visual Guide

### Finding GitHub Secrets

```
GitHub Repository
  └─ Settings (top tab)
      └─ Secrets and variables (left sidebar)
          └─ Actions
              └─ New repository secret (button)
```

### Adding a Secret

```
New repository secret
┌─────────────────────────────────────┐
│ Name*                               │
│ ┌─────────────────────────────────┐ │
│ │ DOCKERHUB_USERNAME              │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Secret*                             │
│ ┌─────────────────────────────────┐ │
│ │ johndoe                         │ │
│ └─────────────────────────────────┘ │
│                                     │
│         [Add secret]                │
└─────────────────────────────────────┘
```

---

## Complete Checklist

Before re-running the workflow, verify:

- [ ] Docker Hub account created
- [ ] Docker Hub access token generated (with Read, Write, Delete permissions)
- [ ] Token copied and saved safely
- [ ] GitHub repository Settings accessed
- [ ] `DOCKERHUB_USERNAME` secret added (exactly this name)
- [ ] `DOCKERHUB_TOKEN` secret added (exactly this name)
- [ ] Both secrets visible in the secrets list
- [ ] Ready to re-run workflow

---

## What Happens After Setup

Once secrets are added correctly:

1. **GitHub Actions workflow runs**:
   ```
   ✓ Login to Docker Hub (using secrets)
   ✓ Build Docker image
   ✓ Push to Docker Hub
   ```

2. **Your image appears on Docker Hub**:
   ```
   https://hub.docker.com/r/your-username/gtaskall
   ```

3. **You can deploy on your server**:
   ```bash
   docker pull your-username/gtaskall:latest
   ```

---

## Security Notes

### Best Practices

✅ **DO**:
- Use access tokens (not your Docker Hub password)
- Use tokens with minimum required permissions
- Rotate tokens every 6-12 months
- Delete tokens you're not using

❌ **DON'T**:
- Commit secrets to your repository
- Share your tokens
- Use your Docker Hub password in CI/CD
- Give tokens more permissions than needed

### Token Permissions

For this workflow, you need:
- ✅ **Read**: To pull images (if needed)
- ✅ **Write**: To push images
- ✅ **Delete**: To manage old images (optional)

---

## Alternative: Use GitHub Container Registry

If you prefer to avoid Docker Hub, you can use GitHub Container Registry (ghcr.io) instead:

### Advantages:
- No additional account needed
- Integrated with GitHub
- Unlimited private images
- Uses GitHub token (automatically available)

### To switch to ghcr.io:

Edit `.github/workflows/deploy.yml`:

```yaml
- name: Log in to GitHub Container Registry
  uses: docker/login-action@v3
  with:
    registry: ghcr.io
    username: ${{ github.actor }}
    password: ${{ secrets.GITHUB_TOKEN }}  # Automatically available!

- name: Docker meta
  id: meta
  uses: docker/metadata-action@v5
  with:
    images: ghcr.io/${{ github.repository_owner }}/gtaskall
```

No secrets needed! But for Docker Hub, follow this guide.

---

## Need More Help?

### Check Docker Hub Token

1. Login to Docker Hub
2. Account Settings → Security
3. Verify your token is listed and active

### Check GitHub Secrets

1. Go to repository Settings
2. Secrets and variables → Actions
3. Verify both secrets are listed

### Test Login Manually

On your local machine:

```bash
# Test your Docker Hub credentials
docker login
# Username: your-username
# Password: paste-your-token-here

# If this works, your credentials are correct
```

---

## Quick Commands Reference

```bash
# Create Docker Hub token (do this in browser)
# https://hub.docker.com → Account Settings → Security → New Access Token

# Add to GitHub
# https://github.com/beny18241/GTaskALL/settings/secrets/actions/new

# Test locally
docker login -u YOUR_USERNAME -p YOUR_TOKEN

# Trigger workflow
git push origin main
```

---

## Summary

1. **Docker Hub**: Create account → Generate access token
2. **GitHub**: Repository Settings → Secrets → Add two secrets
   - `DOCKERHUB_USERNAME`
   - `DOCKERHUB_TOKEN`
3. **Re-run**: Actions tab → Re-run failed jobs

That's it! The workflow should now succeed. 🎉
