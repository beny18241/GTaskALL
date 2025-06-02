import { useState } from 'react'
import TodoList from './components/TodoList'
import TodoForm from './components/TodoForm'
import ColumnManager from './components/ColumnManager'
import './styles/index.css'

export type Priority = 'low' | 'medium' | 'high'
export type Group = 'work' | 'personal' | 'shopping' | 'other'

export interface Todo {
  id: number
  text: string
  status: string
  dueDate: string
  priority: Priority
  group: Group
  createdAt: string
}

export interface Column {
  id: string
  title: string
  color: string
}

function App() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [columns, setColumns] = useState<Column[]>([
    { id: 'todo', title: 'To Do', color: '#646cff' },
    { id: 'in-progress', title: 'In Progress', color: '#f59e0b' },
    { id: 'done', title: 'Done', color: '#10b981' }
  ])
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('dueDate')
  const [groupBy, setGroupBy] = useState<'none' | 'priority' | 'group'>('none')

  const addTodo = (text: string, dueDate: string, priority: Priority, group: Group) => {
    const newTodo: Todo = {
      id: Date.now(),
      text,
      status: 'todo',
      dueDate,
      priority,
      group,
      createdAt: new Date().toISOString()
    }
    setTodos([...todos, newTodo])
  }

  const moveTodo = (id: number, newStatus: string) => {
    setTodos(
      todos.map(todo =>
        todo.id === id ? { ...todo, status: newStatus } : todo
      )
    )
  }

  const deleteTodo = (id: number) => {
    setTodos(todos.filter(todo => todo.id !== id))
  }

  const addColumn = (title: string, color: string) => {
    const newColumn: Column = {
      id: title.toLowerCase().replace(/\s+/g, '-'),
      title,
      color
    }
    setColumns([...columns, newColumn])
  }

  const removeColumn = (columnId: string) => {
    // Move todos from the deleted column to the first available column
    const firstColumn = columns.find(col => col.id !== columnId)
    if (firstColumn) {
      setTodos(todos.map(todo => 
        todo.status === columnId ? { ...todo, status: firstColumn.id } : todo
      ))
    }
    setColumns(columns.filter(col => col.id !== columnId))
  }

  const getSortedAndGroupedTodos = (status: string) => {
    let filteredTodos = todos.filter(todo => todo.status === status)
    
    // Sort todos
    filteredTodos.sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        case 'priority':
          const priorityOrder = { high: 0, medium: 1, low: 2 }
          return priorityOrder[a.priority] - priorityOrder[b.priority]
        case 'createdAt':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        default:
          return 0
      }
    })

    return filteredTodos
  }

  return (
    <div className="app">
      <header>
        <h1>GTaskALL</h1>
        <p>Your modern Kanban board</p>
      </header>
      <main>
        <div className="controls">
          <TodoForm onSubmit={addTodo} />
          <div className="view-controls">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value as 'dueDate' | 'priority' | 'createdAt')}
              className="control-select"
            >
              <option value="dueDate">Sort by Due Date</option>
              <option value="priority">Sort by Priority</option>
              <option value="createdAt">Sort by Created Date</option>
            </select>
            <select 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value as 'none' | 'priority' | 'group')}
              className="control-select"
            >
              <option value="none">No Grouping</option>
              <option value="priority">Group by Priority</option>
              <option value="group">Group by Category</option>
            </select>
          </div>
        </div>
        <div className="board-container">
          <div className="kanban-board">
            {columns.map(column => (
              <div key={column.id} className="kanban-column" style={{ borderTopColor: column.color }}>
                <h2 style={{ color: column.color }}>{column.title}</h2>
                <TodoList
                  todos={getSortedAndGroupedTodos(column.id)}
                  onMove={moveTodo}
                  onDelete={deleteTodo}
                  currentStatus={column.id}
                  groupBy={groupBy}
                />
              </div>
            ))}
          </div>
          <ColumnManager 
            columns={columns} 
            onAddColumn={addColumn} 
            onRemoveColumn={removeColumn} 
          />
        </div>
      </main>
    </div>
  )
}

export default App 