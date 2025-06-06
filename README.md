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

The application is deployed using GitHub Actions and PM2. The deployment process:
1. Builds the application
2. Verifies the build output
3. Copies files to production server
4. Installs dependencies
5. Starts the application using PM2

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
