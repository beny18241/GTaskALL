# GTaskALL

A modern task management application built with React, TypeScript, and Vite.

## Features

- Google OAuth integration for secure authentication
- Drag and drop task management
- Material UI for a beautiful user interface
- Date picker for task scheduling
- Responsive design for all devices

## Recent Updates

### March 2024
- Simplified deployment process to run on pull requests
- Removed production environment setup from deployment workflow
- Fixed deployment issues with Vite installation
- Improved build process and PM2 configuration
- Added automatic build verification
- Fixed multiple PM2 instance creation issue
- Added better error handling and logging

### Revert Information
The application was reverted to a stable version after deployment issues. The following changes were made:
1. Re-cloned the repository to fix git corruption issues
2. Updated deployment workflow to ensure proper Vite installation
3. Modified PM2 configuration to prevent multiple instances
4. Added build verification to ensure dist directory exists
5. Improved error handling in start script
6. Simplified deployment process to run directly on pull requests

## Development

To run the development server:

```bash
npm install --legacy-peer-deps
npm run dev
```

The application will be available at:
- Local: http://localhost:3000
- Network: http://[your-ip]:3000

## Production

The application is deployed using GitHub Actions. The deployment process:
1. Triggers on pull requests to main branch
2. Builds the application
3. Verifies the build output
4. Copies files to production server

## Environment Variables

Required environment variables:
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID

## Dependencies

- React 18
- TypeScript
- Vite
- Material-UI
- React Beautiful DnD
- Axios
- Date-fns

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```

## Deployment

### Prerequisites

1. A self-hosted GitHub Actions runner set up on your production server
2. PM2 installed on the production server for process management
3. SSH access to the production server

### Required Secrets

Set up the following secrets in your GitHub repository (Settings > Secrets and variables > Actions):

- `PRODUCTION_USER`: SSH username for the production server
- `PRODUCTION_HOST`: Production server hostname or IP
- `PRODUCTION_PATH`: Path on the server where the application will be deployed
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `SSH_PRIVATE_KEY`: Private SSH key for deployment (the corresponding public key should be added to the server's authorized_keys)

### Setting up SSH Access

1. Generate an SSH key pair if you don't have one:
   ```bash
   ssh-keygen -t ed25519 -C "github-actions-deploy"
   ```

2. Add the public key to your server's authorized_keys:
   ```bash
   cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
   ```

3. Add the private key to GitHub repository secrets as `SSH_PRIVATE_KEY`

### Deployment Process

1. Go to the "Actions" tab in your GitHub repository
2. Select the "Deploy to Production" workflow
3. Click "Run workflow"
4. Choose the environment (production or staging)
5. Click "Run workflow" to start the deployment

The workflow will:
1. Build the application
2. Copy the built files to the production server
3. Restart the application using PM2

### Manual Deployment

If you need to deploy manually:

```bash
# Build the application
npm run build

# Copy to server
scp -r dist/* user@your-server:/path/to/deployment

# SSH into server and restart
ssh user@your-server
cd /path/to/deployment
pm2 restart gtaskall || pm2 start npm --name gtaskall -- start
```
