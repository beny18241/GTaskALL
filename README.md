# GTaskALL

A modern Kanban board application built with React and TypeScript, integrated with Google Tasks.

## Features

- 📋 Kanban board with customizable columns
- 🎯 Task management with priorities and categories
- 📅 Due date tracking
- 🔄 Drag and drop functionality
- 📊 Multiple sorting and grouping options
- 🎨 Custom column colors
- 📱 Responsive design
- 🔐 Google Tasks integration
- 📝 Task status management (To Do, In Progress, Done)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Google Cloud Platform account with Tasks API enabled

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/GTaskALL.git
cd GTaskALL
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Configure Google Tasks API:
   - Create a project in Google Cloud Console
   - Enable the Google Tasks API
   - Create OAuth 2.0 credentials
   - Add your client ID to the application

4. Start the development server:
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Testing the Application

1. **Google Tasks Integration**
   - Click "Sign in with Google" to authenticate
   - Select a task list to manage
   - Tasks will be synchronized with your Google Tasks

2. **Managing Tasks**
   - Drag and drop tasks between columns:
     - To Do: New tasks and tasks that need attention
     - In Progress: Tasks currently being worked on
     - Done: Completed tasks
   - Task status is automatically synced with Google Tasks

3. **Adding Tasks**
   - Click the "Add Task" button
   - Enter task details:
     - Task description
     - Due date
     - Priority (Low/Medium/High)
     - Category (Work/Personal/Shopping/Other)

4. **Managing Columns**
   - Click "Add Column" to create a new column
   - Enter column title and choose a color
   - Remove columns using the × button (except when only one column remains)

5. **Organizing Tasks**
   - Drag and drop tasks between columns
   - Use the "Sort by" dropdown to change task order
   - Use the "Group by" dropdown to organize tasks by priority or category

6. **Task Details**
   - Each task shows:
     - Due date with calendar icon
     - Priority with lightning icon
     - Category with tag icon
   - Click the × button to delete a task

## Technologies Used

- React
- TypeScript
- CSS3
- HTML5 Drag and Drop API
- Google Tasks API
- OAuth 2.0

## License

MIT
# Wed Jun  4 13:37:14 CEST 2025
# Pipeline test - Wed Jun  4 13:39:14 CEST 2025
# Pipeline test 2 - Wed Jun  4 13:42:17 CEST 2025
# Pipeline test 3 - Wed Jun  4 13:44:12 CEST 2025
# Pipeline test 4 - Wed Jun  4 13:45:31 CEST 2025
# Server restart test - Wed Jun  4 13:48:42 CEST 2025
# Server deployment test - Wed Jun  4 13:50:51 CEST 2025
# Server deployment test 2 - Wed Jun  4 13:51:56 CEST 2025
# Server start test - Wed Jun  4 13:54:55 CEST 2025
# Server deployment and start test - Wed Jun  4 13:58:44 CEST 2025
# SSH deployment test - Wed Jun  4 14:02:23 CEST 2025
# Hardcoded IP test - Wed Jun  4 14:03:34 CEST 2025
# Deployment test - Wed Jun  4 14:03:59 CEST 2025
