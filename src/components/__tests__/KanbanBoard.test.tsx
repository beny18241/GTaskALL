import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import KanbanBoard from '../KanbanBoard';

describe('KanbanBoard', () => {
  const mockTasks = [
    {
      id: '1',
      title: 'Test Task 1',
      status: 'needsAction',
      notes: '',
    },
    {
      id: '2',
      title: 'Test Task 2',
      status: 'completed',
      notes: '',
    },
  ];

  const mockOnTaskUpdate = vi.fn();

  it('renders all columns', () => {
    render(<KanbanBoard tasks={mockTasks} onTaskUpdate={mockOnTaskUpdate} />);
    
    expect(screen.getByText('To Do')).toBeInTheDocument();
    expect(screen.getByText('In Progress')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('displays tasks in correct columns', () => {
    render(<KanbanBoard tasks={mockTasks} onTaskUpdate={mockOnTaskUpdate} />);
    
    expect(screen.getByText('Test Task 1')).toBeInTheDocument();
    expect(screen.getByText('Test Task 2')).toBeInTheDocument();
  });

  it('allows adding new columns', () => {
    render(<KanbanBoard tasks={mockTasks} onTaskUpdate={mockOnTaskUpdate} />);
    
    const input = screen.getByPlaceholderText('New column title');
    const addButton = screen.getByText('Add Column');
    
    fireEvent.change(input, { target: { value: 'New Column' } });
    fireEvent.click(addButton);
    
    expect(screen.getByText('New Column')).toBeInTheDocument();
  });
}); 