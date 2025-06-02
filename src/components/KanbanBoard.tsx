import React, { useState } from 'react';
import { GoogleTask } from '../services/googleTasks';

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
    // Add dragging class to the dragged element
    const element = document.querySelector(`[data-task-id="${task.id}"]`);
    if (element) {
      element.classList.add('dragging');
    }
  };

  const handleDragEnd = () => {
    // Remove dragging class from all elements
    document.querySelectorAll('.task-card').forEach(el => {
      el.classList.remove('dragging');
    });
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
        // Map column IDs to Google Tasks status values
        let newStatus: string;
        switch (columnId) {
          case 'todo':
            newStatus = 'needsAction';
            // Remove [In Progress] note if it exists
            const notes = draggedTask.notes?.replace('\n[In Progress]', '') || '';
            await onTaskUpdate(draggedTask.id, { 
              status: newStatus,
              notes: notes
            });
            break;
          case 'inProgress':
            // For in-progress tasks, we'll use 'needsAction' status but add a note
            newStatus = 'needsAction';
            await onTaskUpdate(draggedTask.id, { 
              status: newStatus,
              notes: (draggedTask.notes || '') + '\n[In Progress]'
            });
            break;
          case 'done':
            newStatus = 'completed';
            // Remove [In Progress] note when completing a task
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
        
        console.log('Updating task status to:', newStatus);
        
        // Clear drag state
        handleDragEnd();
      } catch (error) {
        console.error('Failed to update task status:', error);
        // You might want to show an error message to the user here
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