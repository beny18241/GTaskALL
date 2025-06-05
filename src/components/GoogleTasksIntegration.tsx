import React, { useState, useEffect } from 'react';
import { googleTasksService, GoogleTask, GoogleTaskList } from '../services/googleTasks';
import './GoogleTasksIntegration.css';
// If you want to display formatted dates, uncomment the next line and install @types/date-fns
// import { format } from 'date-fns';

// Dummy data for UAT environment
const dummyTaskLists: GoogleTaskList[] = [
  { id: '1', title: 'Work Tasks' },
  { id: '2', title: 'Personal Tasks' },
  { id: '3', title: 'Shopping List' }
];

const dummyTasks: Record<string, GoogleTask[]> = {
  '1': [
    {
      id: '101',
      title: 'Complete project documentation',
      notes: 'Include API documentation and user guides',
      status: 'needsAction',
      due: '2024-03-25T15:00:00'
    },
    {
      id: '102',
      title: 'Review pull requests',
      notes: 'Check team members\' PRs and provide feedback',
      status: 'completed',
      due: '2024-03-24T12:00:00'
    },
    {
      id: '103',
      title: 'Team meeting',
      notes: 'Weekly sync with the development team',
      status: 'needsAction',
      due: '2024-03-26T10:00:00'
    }
  ],
  '2': [
    {
      id: '201',
      title: 'Gym workout',
      notes: 'Upper body training',
      status: 'needsAction',
      due: '2024-03-24T18:00:00'
    },
    {
      id: '202',
      title: 'Read book',
      notes: 'Continue reading "Clean Code"',
      status: 'needsAction'
    }
  ],
  '3': [
    {
      id: '301',
      title: 'Buy groceries',
      notes: 'Milk, eggs, bread, vegetables',
      status: 'needsAction',
      due: '2024-03-25T17:00:00'
    },
    {
      id: '302',
      title: 'Order new headphones',
      notes: 'Check reviews for wireless options',
      status: 'completed'
    }
  ]
};

const GoogleTasksIntegration: React.FC = () => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedList, setSelectedList] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [newTaskDue, setNewTaskDue] = useState('');
  const [isUAT] = useState(window.location.hostname.includes('uat') || window.location.hostname.includes('localhost'));

  useEffect(() => {
    if (isUAT) {
      setTaskLists(dummyTaskLists);
      if (dummyTaskLists.length > 0) {
        setSelectedList(dummyTaskLists[0].id);
      }
    } else {
      const init = async () => {
        try {
          await googleTasksService.initialize();
          setIsSignedIn(googleTasksService.isUserSignedIn());
          if (googleTasksService.isUserSignedIn()) {
            await loadTaskLists();
          }
        } catch (error) {
          setError('Failed to initialize Google Tasks');
        }
      };
      init();
    }
  }, [isUAT]);

  useEffect(() => {
    if (selectedList) {
      if (isUAT) {
        setTasks(dummyTasks[selectedList] || []);
      } else {
        loadTasks(selectedList);
      }
    }
  }, [selectedList, isUAT]);

  const loadTaskLists = async () => {
    try {
      setLoading(true);
      const lists = await googleTasksService.getTaskLists();
      setTaskLists(lists);
      if (lists.length > 0) {
        setSelectedList(lists[0].id);
      }
    } catch (error) {
      setError('Failed to load task lists');
    } finally {
      setLoading(false);
    }
  };

  const loadTasks = async (listId: string) => {
    try {
      setLoading(true);
      const tasks = await googleTasksService.getTasks(listId);
      setTasks(tasks);
    } catch (error) {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    try {
      setLoading(true);
      await googleTasksService.signIn();
      setIsSignedIn(true);
      await loadTaskLists();
    } catch (error) {
      setError('Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      await googleTasksService.signOut();
      setIsSignedIn(false);
      setTaskLists([]);
      setTasks([]);
      setSelectedList('');
    } catch (error) {
      setError('Failed to sign out');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    try {
      setLoading(true);
      const newTask: GoogleTask = {
        title: newTaskTitle,
        notes: newTaskNotes,
        status: 'needsAction',
        due: newTaskDue || undefined
      };
      
      if (isUAT) {
        // Simulate task creation in UAT
        const taskId = Date.now().toString();
        const task = { ...newTask, id: taskId };
        setTasks([...tasks, task]);
      } else {
        await googleTasksService.createTask(selectedList, newTask);
        await loadTasks(selectedList);
      }
      
      setNewTaskTitle('');
      setNewTaskNotes('');
      setNewTaskDue('');
    } catch (error) {
      setError('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateTask = async (taskId: string, updates: Partial<GoogleTask>) => {
    try {
      setLoading(true);
      if (isUAT) {
        // Simulate task update in UAT
        setTasks(tasks.map(task => 
          task.id === taskId ? { ...task, ...updates } : task
        ));
      } else {
        await googleTasksService.updateTask(selectedList, taskId, updates);
        await loadTasks(selectedList);
      }
    } catch (error) {
      setError('Failed to update task');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      setLoading(true);
      if (isUAT) {
        // Simulate task deletion in UAT
        setTasks(tasks.filter(task => task.id !== taskId));
      } else {
        await googleTasksService.deleteTask(selectedList, taskId);
        await loadTasks(selectedList);
      }
    } catch (error) {
      setError('Failed to delete task');
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return <div className="error-message">{error}</div>;
  }

  if (!isUAT && !googleTasksService.isUserSignedIn()) {
    return (
      <div className="sign-in-container">
        <button onClick={handleSignIn} disabled={loading}>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    );
  }

  return (
    <div className="google-tasks-container">
      <div className="task-lists">
        <h2>Task Lists</h2>
        <select
          value={selectedList}
          onChange={(e) => setSelectedList(e.target.value)}
          disabled={loading}
        >
          {taskLists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.title}
            </option>
          ))}
        </select>
      </div>

      <div className="tasks-section">
        <h2>Tasks</h2>
        <form onSubmit={handleCreateTask} className="task-form">
          <input
            type="text"
            value={newTaskTitle}
            onChange={(e) => setNewTaskTitle(e.target.value)}
            placeholder="New task title"
            disabled={loading}
          />
          <textarea
            value={newTaskNotes}
            onChange={(e) => setNewTaskNotes(e.target.value)}
            placeholder="Task notes (optional)"
            disabled={loading}
          />
          <input
            type="datetime-local"
            value={newTaskDue}
            onChange={(e) => setNewTaskDue(e.target.value)}
            disabled={loading}
          />
          <button type="submit" disabled={loading || !newTaskTitle.trim()}>
            Add Task
          </button>
        </form>

        <div className="tasks-list">
          {tasks.map((task) => (
            <div key={task.id} className="task-item">
              <div className="task-header">
                <input
                  type="checkbox"
                  checked={task.status === 'completed'}
                  onChange={(e) =>
                    handleUpdateTask(task.id!, {
                      status: e.target.checked ? 'completed' : 'needsAction'
                    })
                  }
                  disabled={loading}
                />
                <h3>{task.title}</h3>
                <button
                  onClick={() => handleDeleteTask(task.id!)}
                  disabled={loading}
                  className="delete-button"
                >
                  Delete
                </button>
              </div>
              {task.notes && <p className="task-notes">{task.notes}</p>}
              {task.due && (
                <p className="task-due">
                  Due: {new Date(task.due).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {!isUAT && (
        <button onClick={handleSignOut} disabled={loading} className="sign-out-button">
          Sign Out
        </button>
      )}
    </div>
  );
};

export default GoogleTasksIntegration; 