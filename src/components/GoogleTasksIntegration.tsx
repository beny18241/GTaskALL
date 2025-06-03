import React, { useEffect, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { googleTasksService, GoogleTask, GoogleTaskList } from '../services/googleTasks';
import KanbanBoard from './KanbanBoard';

interface GoogleTasksIntegrationProps {
  sortBy: 'dueDate' | 'priority' | 'createdAt';
}

const GoogleTasksIntegration: React.FC<GoogleTasksIntegrationProps> = ({ sortBy }) => {
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([]);
  const [selectedTaskList, setSelectedTaskList] = useState<string>('');
  const [tasks, setTasks] = useState<GoogleTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [groupBy, setGroupBy] = useState<'status' | 'priority' | 'none'>('status');
  const maxRetries = 3;

  useEffect(() => {
    let mounted = true;

    const initGoogleTasks = async () => {
      try {
        console.log('Initializing Google Tasks...');
        await googleTasksService.initialize();
        
        if (!mounted) return;
        
        // Check for existing session
        const auth2 = gapi.auth2.getAuthInstance();
        const isSignedIn = auth2.isSignedIn.get();
        
        if (isSignedIn) {
          setIsSignedIn(true);
          await fetchTaskLists();
        }
        
        setIsInitialized(true);
        setLoading(false);
        setError(null);
        console.log('Google Tasks initialized successfully');
      } catch (err) {
        console.error('Failed to initialize Google Tasks:', err);
        if (mounted) {
          setError('Failed to initialize Google Tasks. Please try refreshing the page.');
          setLoading(false);
        }
      }
    };

    initGoogleTasks();

    return () => {
      mounted = false;
    };
  }, []);

  const handleLoginSuccess = async (credentialResponse: any) => {
    try {
      setLoading(true);
      setError(null);
      console.log('Login successful, initializing tasks...');
      
      // Sign in to Google Tasks API
      await googleTasksService.signIn();
      
      // Fetch task lists
      const taskLists = await googleTasksService.getTaskLists();
      console.log('Task lists loaded:', taskLists);
      
      if (taskLists.length === 0) {
        setError('No task lists found. Please create a task list in Google Tasks first.');
        setLoading(false);
        return;
      }

      // Fetch tasks from the first task list
      const tasks = await googleTasksService.getTasks(taskLists[0].id);
      console.log('Tasks loaded:', tasks);
      
      const sortedTasks = sortTasks(tasks, sortBy);
      setTasks(sortedTasks);
      setTaskLists(taskLists);
      setSelectedTaskList(taskLists[0].id);
      setIsSignedIn(true);
      setLoading(false);
    } catch (err) {
      console.error('Error during login process:', err);
      setError('Failed to load tasks. Please try again.');
      setLoading(false);
    }
  };

  const handleLoginError = () => {
    setError('Login failed. Please try again.');
  };

  const handleRetry = () => {
    if (retryCount < maxRetries) {
      setRetryCount(prev => prev + 1);
      setLoading(true);
      setError(null);
      googleTasksService.initialize().catch(err => {
        console.error('Retry failed:', err);
        setError('Failed to initialize. Please try refreshing the page.');
        setLoading(false);
      });
    } else {
      setError('Maximum retry attempts reached. Please refresh the page.');
    }
  };

  const handleSignOut = async () => {
    try {
      setLoading(true);
      setError(null);
      await googleTasksService.signOut();
      setIsSignedIn(false);
      setTaskLists([]);
      setTasks([]);
      setSelectedTaskList('');
      setLoading(false);
    } catch (err) {
      console.error('Failed to sign out:', err);
      setError('Failed to sign out. Please try again.');
      setLoading(false);
    }
  };

  const fetchTaskLists = async () => {
    try {
      setLoading(true);
      setError(null);
      const lists = await googleTasksService.getTaskLists();
      console.log('Fetched task lists:', lists);
      setTaskLists(lists);
      if (lists.length > 0) {
        setSelectedTaskList(lists[0].id);
        const tasks = await googleTasksService.getTasks(lists[0].id);
        setTasks(tasks);
      }
    } catch (err) {
      console.error('Failed to fetch task lists:', err);
      setError('Failed to fetch task lists. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<GoogleTask>) => {
    try {
      console.log('Updating task:', taskId, 'with updates:', updates);
      
      // Update the task in Google Tasks
      await googleTasksService.updateTask(selectedTaskList, taskId, updates);
      console.log('Task updated successfully');
      
      // Fetch fresh task list
      const updatedTasks = await googleTasksService.getTasks(selectedTaskList);
      console.log('Fetched updated tasks:', updatedTasks);
      
      // Sort and update the tasks state
      const sortedTasks = sortTasks(updatedTasks, sortBy);
      setTasks(sortedTasks);
      
      console.log('Task list updated successfully');
    } catch (err) {
      console.error('Failed to update task:', err);
      setError('Failed to update task. Please try again.');
      // Refresh the task list even if there was an error
      try {
        const updatedTasks = await googleTasksService.getTasks(selectedTaskList);
        setTasks(sortTasks(updatedTasks, sortBy));
      } catch (refreshErr) {
        console.error('Failed to refresh task list:', refreshErr);
      }
    }
  };

  const sortTasks = (tasksToSort: GoogleTask[], sortBy: 'dueDate' | 'priority' | 'createdAt') => {
    return [...tasksToSort].sort((a, b) => {
      switch (sortBy) {
        case 'dueDate':
          if (!a.due) return 1;
          if (!b.due) return -1;
          return new Date(a.due).getTime() - new Date(b.due).getTime();
        case 'priority':
          if (a.status === 'needsAction' && b.status !== 'needsAction') return -1;
          if (a.status !== 'needsAction' && b.status === 'needsAction') return 1;
          return 0;
        case 'createdAt':
        default:
          if (!a.position) return 1;
          if (!b.position) return -1;
          return a.position.localeCompare(b.position);
      }
    });
  };

  if (loading) {
    return (
      <div className="google-tasks-integration">
        <div className="loading-message">
          {isInitialized ? 'Loading tasks...' : 'Initializing Google Tasks...'}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="google-tasks-integration">
        <div className="error-message">
          {error}
          {retryCount < maxRetries && (
            <button onClick={handleRetry} className="retry-button">
              Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="google-tasks-integration">
      {!isSignedIn ? (
        <div className="login-section">
          <h2>Welcome to GTaskALL</h2>
          <p>Sign in with your Google account to access your tasks</p>
          <div className="google-sign-in-container">
            <GoogleLogin
              onSuccess={handleLoginSuccess}
              onError={handleLoginError}
              useOneTap
              theme="filled_blue"
              text="signin_with"
              shape="rectangular"
              width="250"
              logo_alignment="center"
            />
          </div>
        </div>
      ) : (
        <div className="google-tasks-content">
          <div className="header-actions">
            <div className="task-list-selector">
              <select 
                value={selectedTaskList} 
                onChange={(e) => setSelectedTaskList(e.target.value)}
                disabled={loading}
              >
                {taskLists.map((list) => (
                  <option key={list.id} value={list.id}>
                    {list.title}
                  </option>
                ))}
              </select>
            </div>
            <div className="view-controls">
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value as 'status' | 'priority' | 'none')}
                className="group-by-select"
              >
                <option value="status">Group by Status</option>
                <option value="priority">Group by Priority</option>
                <option value="none">No Grouping</option>
              </select>
            </div>
            <button 
              onClick={handleSignOut}
              disabled={loading}
              className="google-sign-out-btn"
            >
              Sign Out
            </button>
          </div>

          <KanbanBoard
            tasks={sortTasks(tasks, sortBy)}
            onTaskUpdate={handleTaskUpdate}
          />
        </div>
      )}
    </div>
  );
};

export default GoogleTasksIntegration; 