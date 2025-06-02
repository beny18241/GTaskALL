import { useState } from 'react'
import { Column } from '../App'

interface ColumnManagerProps {
  columns: Column[]
  onAddColumn: (title: string, color: string) => void
  onRemoveColumn: (columnId: string) => void
}

const ColumnManager: React.FC<ColumnManagerProps> = ({ columns, onAddColumn, onRemoveColumn }) => {
  const [isAdding, setIsAdding] = useState(false)
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [newColumnColor, setNewColumnColor] = useState('#646cff')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (newColumnTitle.trim()) {
      onAddColumn(newColumnTitle.trim(), newColumnColor)
      setNewColumnTitle('')
      setIsAdding(false)
    }
  }

  return (
    <div className="column-manager">
      {isAdding ? (
        <form onSubmit={handleSubmit} className="add-column-form">
          <input
            type="text"
            value={newColumnTitle}
            onChange={(e) => setNewColumnTitle(e.target.value)}
            placeholder="Column title"
            className="column-input"
            autoFocus
          />
          <input
            type="color"
            value={newColumnColor}
            onChange={(e) => setNewColumnColor(e.target.value)}
            className="color-input"
          />
          <div className="column-actions">
            <button type="submit" className="add-btn">Add</button>
            <button 
              type="button" 
              className="cancel-btn"
              onClick={() => setIsAdding(false)}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button 
          className="add-column-btn"
          onClick={() => setIsAdding(true)}
        >
          + Add Column
        </button>
      )}
      <div className="column-list">
        {columns.map(column => (
          <div key={column.id} className="column-item">
            <span style={{ color: column.color }}>{column.title}</span>
            {columns.length > 1 && (
              <button
                className="remove-column-btn"
                onClick={() => onRemoveColumn(column.id)}
                aria-label={`Remove ${column.title} column`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default ColumnManager 