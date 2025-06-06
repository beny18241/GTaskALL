# GTaskALL

A modern task management application built with React, TypeScript, and Vite.

## Features

- Google OAuth integration for secure authentication
- Drag and drop task management
- Material UI for a beautiful user interface
- Date picker for task scheduling
- Responsive design for all devices
- Automatic deployment on pull request merge

## Recent Updates

### March 2024
- Added automatic deployment on pull request merge
- Updated Google Tasks API integration for full access
- Added domain support for production deployment
- Improved task synchronization with Google Tasks
- Enhanced deployment process with proper build steps
- Added better error handling and logging

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
1. Triggers automatically when a pull request is merged to main
2. Builds the application
3. Verifies the build output
4. Copies files to production server
5. Restarts the application using PM2

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

## Required Secrets

Set up the following secrets in your GitHub repository (Settings > Secrets and variables > Actions):

- `PRODUCTION_USER`: SSH username for the production server
- `PRODUCTION_HOST`: Production server hostname or IP
- `PRODUCTION_PATH`: Path on the server where the application will be deployed
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID

### Deployment Process

The deployment is now fully automated:
1. Create a pull request with your changes
2. Review and approve the changes
3. Merge the pull request to main
4. The deployment will start automatically
5. The application will be updated on the production server

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
