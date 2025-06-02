# GTaskALL

A modern Kanban board application built with React and TypeScript.

## Features

- 📋 Kanban board with customizable columns
- 🎯 Task management with priorities and categories
- 📅 Due date tracking
- 🔄 Drag and drop functionality
- 📊 Multiple sorting and grouping options
- 🎨 Custom column colors
- 📱 Responsive design

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

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

3. Start the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:5173](http://localhost:5173) in your browser.

## Testing the Application

1. **Adding Tasks**
   - Click the "Add Task" button
   - Enter task details:
     - Task description
     - Due date
     - Priority (Low/Medium/High)
     - Category (Work/Personal/Shopping/Other)

2. **Managing Columns**
   - Click "Add Column" to create a new column
   - Enter column title and choose a color
   - Remove columns using the × button (except when only one column remains)

3. **Organizing Tasks**
   - Drag and drop tasks between columns
   - Use the "Sort by" dropdown to change task order
   - Use the "Group by" dropdown to organize tasks by priority or category

4. **Task Details**
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

## License

MIT
