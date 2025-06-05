# GTaskALL

This is the GTaskALL Project - A modern task management application that integrates with Google Tasks API.

## About

GTaskALL is a web application that allows users to manage their tasks through a clean and intuitive interface, with seamless integration with Google Tasks.

## Features (Coming Soon)

- Google Tasks Integration
- Modern UI/UX
- Task Management
- Real-time Updates
- Cross-platform Support

## Getting Started

Stay tuned for setup instructions and documentation as the project develops.

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
