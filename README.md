# Google Tasks Manager

A modern, Todoist-like web application for managing Google Tasks from multiple accounts.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38bdf8)

## Features

- 📅 **Today View** - See all tasks due today across all accounts
- 📆 **Upcoming View** - View tasks grouped by day for the next 7 days
- 📋 **List View** - Browse and manage individual task lists
- 🎯 **Priorities** - P1-P4 priority levels with color coding
- ☁️ **Real-time Sync** - Full sync with Google Tasks API
- 🎨 **Beautiful UI** - Clean, Todoist-inspired interface
- 📱 **Responsive** - Works on desktop, tablet, and mobile

## Setup

### 1. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Tasks API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Tasks API"
   - Click "Enable"
4. Configure OAuth consent screen:
   - Go to "APIs & Services" > "OAuth consent screen"
   - Select "External" user type
   - Fill in the required fields (app name, user support email, developer email)
   - Add scope: `https://www.googleapis.com/auth/tasks`
   - Add test users (your Google email addresses)
5. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Select "Web application"
   - Add authorized redirect URI: `http://localhost:3003/api/auth/callback/google`
   - Copy the Client ID and Client Secret

### 2. Environment Variables

Create a `.env.local` file in the project root:

```env
# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret

# NextAuth.js Configuration
AUTH_SECRET=generate-a-random-secret-here

# Generate a secret with:
# openssl rand -base64 32
```

### 3. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3003](http://localhost:3003) in your browser.

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **State Management**: Zustand
- **Authentication**: NextAuth.js v5 (Auth.js)
- **Icons**: Lucide React
- **Date Handling**: date-fns

## Project Structure

```
├── app/
│   ├── (dashboard)/          # Protected dashboard routes
│   │   ├── layout.tsx        # Dashboard layout with sidebar
│   │   ├── page.tsx          # Today view
│   │   ├── upcoming/         # Upcoming view
│   │   └── lists/[listId]/   # Individual list view
│   ├── api/
│   │   ├── auth/             # NextAuth handlers
│   │   └── tasks/            # Tasks API proxy
│   └── login/                # Login page
├── components/
│   ├── ui/                   # shadcn/ui components
│   ├── sidebar.tsx           # Navigation sidebar
│   ├── task-list.tsx         # Task list component
│   ├── task-item.tsx         # Individual task row
│   ├── task-detail.tsx       # Task detail panel
│   ├── add-task.tsx          # Quick add task form
│   └── priority-select.tsx   # Priority dropdown
├── lib/
│   ├── auth.ts               # NextAuth configuration
│   ├── google-tasks.ts       # Google Tasks API wrapper
│   └── stores/               # Zustand stores
└── types/
    └── index.ts              # TypeScript interfaces
```

## Priority System

Since Google Tasks doesn't support priorities natively, we store priority metadata in the task's `notes` field using a hidden comment pattern:

```
<!--gtm:{"priority":1}-->
Your actual notes here...
```

This keeps priorities synced across devices while remaining invisible to users.

## License

MIT
