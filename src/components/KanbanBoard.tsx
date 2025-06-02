import React, { useState } from 'react';

export interface GoogleTask {
  id: string;
  title: string;
  status: string;
  notes?: string;
  due?: string;
}

interface KanbanBoardProps {
  tasks: GoogleTask[];
  onTaskUpdate: (taskId: string, updates: Partial<GoogleTask>) => Promise<void>;
}

interface Column {
  id: string;
  title: string;
  color: string;
}

const DEFAULT_COLUMNS: Column[] = [
  { id: 'todo', title: 'To Do', color: '#e3e3e3' },
  { id: 'inProgress', title: 'In Progress', color: '#fff3cd' },
  { id: 'done', title: 'Done', color: '#d4edda' }
];

const KanbanBoard: React.FC<KanbanBoardProps> = ({ tasks, onTaskUpdate }) => {
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [newColumnColor, setNewColumnColor] = useState('#e3e3e3');
  const [draggedTask, setDraggedTask] = useState<GoogleTask | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

  const handleDragStart = (task: GoogleTask) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, columnId: string) => {
    e.preventDefault();
    setDragOverColumn(columnId);
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (columnId: string) => {
    if (draggedTask && draggedTask.id) {
      try {
        let newStatus: string;
        switch (columnId) {
          case 'todo':
            newStatus = 'needsAction';
            const notes = draggedTask.notes?.replace('\n[In Progress]', '') || '';
            await onTaskUpdate(draggedTask.id, { 
              status: newStatus,
              notes: notes
            });
            break;
          case 'inProgress':
            newStatus = 'needsAction';
            await onTaskUpdate(draggedTask.id, { 
              status: newStatus,
              notes: (draggedTask.notes || '') + '\n[In Progress]'
            });
            break;
          case 'done':
            newStatus = 'completed';
            const completedNotes = draggedTask.notes?.replace('\n[In Progress]', '') || '';
            await onTaskUpdate(draggedTask.id, { 
              status: newStatus,
              notes: completedNotes
            });
            break;
          default:
            newStatus = 'needsAction';
            await onTaskUpdate(draggedTask.id, { status: newStatus });
        }
        handleDragEnd();
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    }
  };

  const addColumn = () => {
    if (newColumnTitle.trim()) {
      const newColumn: Column = {
        id: newColumnTitle.toLowerCase().replace(/\s+/g, '-'),
        title: newColumnTitle,
        color: newColumnColor
      };
      setColumns([...columns, newColumn]);
      setNewColumnTitle('');
    }
  };

  const removeColumn = (columnId: string) => {
    if (columns.length > 1) {
      setColumns(columns.filter(col => col.id !== columnId));
    }
  };

  const getTasksForColumn = (columnId: string) => {
    return tasks.filter(task => {
      switch (columnId) {
        case 'todo':
          return task.status === 'needsAction' && !task.notes?.includes('[In Progress]');
        case 'inProgress':
          return task.status === 'needsAction' && task.notes?.includes('[In Progress]');
        case 'done':
          return task.status === 'completed';
        default:
          return false;
      }
    });
  };

  return (
    <div className="kanban-board">
      <div className="add-column-form">
        <input
          type="text"
          value={newColumnTitle}
          onChange={(e) => setNewColumnTitle(e.target.value)}
          placeholder="New column title"
          className="column-input"
        />
        <input
          type="color"
          value={newColumnColor}
          onChange={(e) => setNewColumnColor(e.target.value)}
          className="color-input"
        />
        <button onClick={addColumn} className="add-column-btn">
          Add Column
        </button>
      </div>

      <div className="kanban-columns">
        {columns.map((column) => (
          <div
            key={column.id}
            className={`kanban-column ${dragOverColumn === column.id ? 'drag-over' : ''}`}
            style={{ backgroundColor: column.color }}
            onDragOver={(e) => handleDragOver(e, column.id)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(column.id)}
          >
            <div className="column-header">
              <h3>{column.title}</h3>
              {columns.length > 1 && (
                <button
                  onClick={() => removeColumn(column.id)}
                  className="remove-column-btn"
                >
                  ×
                </button>
              )}
            </div>
            <div className="column-content">
              {getTasksForColumn(column.id).map((task) => (
                <div
                  key={task.id}
                  data-task-id={task.id}
                  className="task-card"
                  draggable
                  onDragStart={() => handleDragStart(task)}
                  onDragEnd={handleDragEnd}
                >
                  <h4>{task.title}</h4>
                  {task.notes && <p>{task.notes}</p>}
                  {task.due && (
                    <p className="due-date">
                      Due: {new Date(task.due).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default KanbanBoard; 