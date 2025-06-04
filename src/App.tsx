import React, { useState } from 'react';
import { GoogleOAuthProvider } from '@react-oauth/google';
import TodoList from './components/TodoList';
import TodoForm from './components/TodoForm';
import ColumnManager from './components/ColumnManager';
import GoogleTasksIntegration from './components/GoogleTasksIntegration';
import { Todo, Column, Priority, Group } from './types';
import './styles/index.css';

const CLIENT_ID = '251184335563-bdf3sv4vc1sr4v2itciiepd7fllvshec.apps.googleusercontent.com';

const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [columns, setColumns] = useState<Column[]>([
    { id: 'todo', title: 'To Do', color: '#646cff' },
    { id: 'in-progress', title: 'In Progress', color: '#f59e0b' },
    { id: 'done', title: 'Done', color: '#10b981' }
  ]);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('dueDate');
  const [groupBy, setGroupBy] = useState<'none' | 'priority' | 'group'>('none');

  const addTodo = (text: string, dueDate: string, priority: Priority, group: Group) => {
    const newTodo: Todo = {
      id: Date.now().toString(),
      text,
      completed: false,
      priority,
      group,
      dueDate
    };
    setTodos([...todos, newTodo]);
  };

  const moveTodo = (id: string, newStatus: string) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, completed: newStatus === 'done' } : todo
      )
    );
  };

  const deleteTodo = (id: string) => {
    setTodos(todos.filter(todo => todo.id !== id));
  };

  const addColumn = (title: string, color: string) => {
    const newColumn: Column = {
      id: title.toLowerCase().replace(/\s+/g, '-'),
      title,
      color
    };
    setColumns([...columns, newColumn]);
  };

  const removeColumn = (columnId: string) => {
    // Move todos from the deleted column to the first available column
    const firstColumn = columns.find(col => col.id !== columnId);
    if (firstColumn) {
      setTodos(todos.map(todo => 
        todo.completed === (columnId === 'done') ? { ...todo, completed: firstColumn.id === 'done' } : todo
      ));
    }
    setColumns(columns.filter(col => col.id !== columnId));
  };

  const getSortedAndGroupedTodos = (status: string) => {
    let filteredTodos = todos.filter(todo => todo.completed === (status === 'done'));
    
    // Sort todos
    filteredTodos.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 };
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        case 'createdAt':
          return new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime();
        default:
          return 0;
      }
    });

    return filteredTodos;
  };

  return (
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <div className="app">
        <header>
          <h1>GTaskALL</h1>
          <div className="controls">
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'createdAt')}>
              <option value="none">Sort by: None</option>
              <option value="dueDate">Sort by: Due Date</option>
              <option value="priority">Sort by: Priority</option>
            </select>
            <select value={groupBy} onChange={(e) => setGroupBy(e.target.value as 'none' | 'priority' | 'group')}>
              <option value="none">Group by: None</option>
              <option value="priority">Group by: Priority</option>
              <option value="group">Group by: Category</option>
            </select>
          </div>
        </header>

        <GoogleTasksIntegration sortBy={sortBy} />

        <div className="kanban-board">
          {columns.map((column) => (
            <TodoList
              key={column.id}
              todos={getSortedAndGroupedTodos(column.id)}
              onMove={moveTodo}
              onDelete={deleteTodo}
              currentStatus={column.id}
              groupBy={groupBy}
            />
          ))}
          <ColumnManager
            columns={columns}
            onAddColumn={addColumn}
            onRemoveColumn={removeColumn}
          />
        </div>

        <TodoForm onSubmit={addTodo} />
      </div>
    </GoogleOAuthProvider>
  );
};

export default App; 