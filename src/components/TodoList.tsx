import { Todo } from '../types'
import { useState } from 'react'

interface TodoListProps {
  todos: Todo[]
  onMove: (id: string, newStatus: string) => void
  onDelete: (id: string) => void
  currentStatus: string
  groupBy: 'none' | 'priority' | 'group'
}

const TodoList: React.FC<TodoListProps> = ({ todos, onMove, onDelete, currentStatus, groupBy }) => {
  const [isDraggingOver, setIsDraggingOver] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)

  const handleDragStart = (e: React.DragEvent, todo: Todo) => {
    e.dataTransfer.setData('text/plain', todo.id)
    e.dataTransfer.effectAllowed = 'move'
    setDraggingId(todo.id)
  }

  const handleDragEnd = () => {
    setDraggingId(null)
    setIsDraggingOver(false)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setIsDraggingOver(true)
  }

  const handleDragLeave = () => {
    setIsDraggingOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const todoId = e.dataTransfer.getData('text/plain')
    onMove(todoId, currentStatus)
    setIsDraggingOver(false)
  }

  const getGroupedTodos = () => {
    if (groupBy === 'none') {
      return { 'All Tasks': todos }
    }

    const groups: Record<string, Todo[]> = {}
    todos.forEach(todo => {
      const groupKey = groupBy === 'priority' ? todo.priority : todo.group
      if (!groups[groupKey]) {
        groups[groupKey] = []
      }
      groups[groupKey].push(todo)
    })
    return groups
  }

  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString()
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444'
      case 'medium':
        return '#f59e0b'
      case 'low':
        return '#10b981'
      default:
        return '#6b7280'
    }
  }

  const renderTodo = (todo: Todo) => (
    <div
      key={todo.id}
      className={`todo-item ${draggingId === todo.id ? 'dragging' : ''}`}
      draggable
      onDragStart={(e) => handleDragStart(e, todo)}
      onDragEnd={handleDragEnd}
    >
      <div className="todo-content">
        <div className="todo-main">
          <span className="todo-text">{todo.text}</span>
          <div className="todo-meta">
            {todo.dueDate && (
              <span className="todo-date" title="Due Date">
                📅 {formatDate(todo.dueDate)}
              </span>
            )}
            <span 
              className="todo-priority" 
              style={{ color: getPriorityColor(todo.priority) }}
              title="Priority"
            >
              ⚡ {todo.priority}
            </span>
            <span className="todo-group" title="Category">
              🏷️ {todo.group}
            </span>
          </div>
        </div>
        <div className="todo-actions">
          <button
            className="delete-btn"
            onClick={() => onDelete(todo.id)}
            aria-label="Delete task"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  )

  const groupedTodos = getGroupedTodos()

  return (
    <div 
      className={`todo-list ${isDraggingOver ? 'drag-over' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {Object.entries(groupedTodos).map(([groupName, groupTodos]) => (
        <div key={groupName} className="todo-group">
          {groupBy !== 'none' && (
            <h3 className="group-header">{groupName}</h3>
          )}
          {groupTodos.length === 0 ? (
            <p className="empty-state">No tasks in this group</p>
          ) : (
            groupTodos.map(renderTodo)
          )}
        </div>
      ))}
    </div>
  )
}

export default TodoList 