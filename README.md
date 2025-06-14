# GTaskALL

Version 1.1.0

Author: Maciej Pindela

A modern task management application built with React, TypeScript, and Vite.

## Features

- Google OAuth integration for secure authentication
- Drag and drop task management
- Material UI for a beautiful user interface
- Date picker for task scheduling
- Responsive design for all devices
- Automatic deployment on pull request merge
- Enhanced task display with:
  - Recurring task indicators
  - Task notes/details
  - Color-coded cards
  - Status badges (Active, Recurring)

## Recent Updates

### May 2024
- Updated to React 18.2.0
- Upgraded Material-UI to version 5.15.10
- Enhanced date picker functionality
- Improved task synchronization with Google Tasks
- Added better error handling for API calls
- Updated dependencies to latest stable versions

### April 2024
- Enhanced task display with recurring indicators and status badges
- Added support for task notes and details
- Implemented color-coded task cards
- Improved task card layout and readability
- Updated Google Tasks integration to support new features

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