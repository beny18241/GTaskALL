import { useState, useEffect } from 'react';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Paper, Stack, Avatar, Divider, Select, MenuItem, Chip, Grid, Checkbox } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, isToday, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import LogoutIcon from '@mui/icons-material/Logout';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import ListIcon from '@mui/icons-material/List';
import EditIcon from '@mui/icons-material/Edit';
import RefreshIcon from '@mui/icons-material/Refresh';
import { CircularProgress } from '@mui/material';

const drawerWidth = 240;
const collapsedDrawerWidth = 65;

interface Task {
  id: string;
  content: string;
  dueDate?: Date | null;
  isRecurring?: boolean;
  notes?: string;
  color?: string;
  status: 'todo' | 'in-progress' | 'completed';
  isDragging?: boolean;
  completedAt?: Date | null;
  tempDate?: Date | null;
  listId?: string;
  accountEmail?: string;
  accountName?: string;
  accountPicture?: string;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
  isDragOver?: boolean;
  limit?: number;
}

interface User {
  name: string;
  email: string;
  picture: string;
}

interface GoogleAccount {
  user: User;
  token: string;
  taskLists: any[];
  tasks: { [listId: string]: any[] };
}

const STORAGE_KEY = 'kanban-board-data';
const USER_STORAGE_KEY = 'user-data';
const GOOGLE_ACCOUNTS_KEY = 'google-accounts';
const GOOGLE_CLIENT_ID = "251184335563-bdf3sv4vc1sr4v2itciiepd7fllvshec.apps.googleusercontent.com";

// Add new view mode type
type ViewMode = 'kanban' | 'list' | 'calendar' | 'today' | 'ultimate';

// Add this type at the top with other interfaces
type Timeout = ReturnType<typeof setTimeout>;

interface EditTaskForm {
  content: string;
  notes: string;
  color: string;
  dueDate: Date | null;
  isRecurring: boolean;
}

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(true);
  const [doneTasksLimit, setDoneTasksLimit] = useState(3);
  const [columns, setColumns] = useState<Column[]>(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      const parsedData = JSON.parse(savedData);
      // Ensure the Done column has a limit
      return parsedData.map((col: Column) => 
        col.id === 'done' ? { ...col, limit: col.limit || 3 } : col
      );
    }
    return [
      {
        id: 'todo',
        title: 'To Do',
        tasks: [],
      },
      {
        id: 'inProgress',
        title: 'In Progress',
        tasks: [],
      },
      {
        id: 'done',
        title: 'Done',
        tasks: [],
        limit: 3,
      },
    ];
  });
  const [openNewColumnDialog, setOpenNewColumnDialog] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<{ task: Task; sourceColumnId: string } | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
  const [dragOverTaskIndex, setDragOverTaskIndex] = useState<number | null>(null);
  const [selectedTask, setSelectedTask] = useState<{ task: Task; columnId: string } | null>(null);
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem(USER_STORAGE_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [googleAccounts, setGoogleAccounts] = useState<GoogleAccount[]>(() => {
    const savedAccounts = localStorage.getItem(GOOGLE_ACCOUNTS_KEY);
    return savedAccounts ? JSON.parse(savedAccounts) : [];
  });
  const [activeAccountIndex, setActiveAccountIndex] = useState<number>(0);
  const [googleTasksLoading, setGoogleTasksLoading] = useState(false);
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [selectedAccountForRemoval, setSelectedAccountForRemoval] = useState<number | null>(null);
  const [googleTasksButtonHover, setGoogleTasksButtonHover] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<{ task: Task; columnId: string } | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<EditTaskForm>({
    content: '',
    notes: '',
    color: '#1976d2',
    dueDate: null,
    isRecurring: false
  });
  const [newTask, setNewTask] = useState<Partial<Task>>({
    content: '',
    dueDate: null,
    isRecurring: false,
    notes: '',
    color: '#1976d2',
    status: 'todo'
  });
  const [sidebarWidth, setSidebarWidth] = useState(400);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  const [refreshInterval, setRefreshInterval] = useState<Timeout | null>(null);

  // Add effect to restore user session on mount
  useEffect(() => {
    const savedCredential = localStorage.getItem('google-credential');
    if (savedCredential) {
      try {
        const decoded = JSON.parse(atob(savedCredential.split('.')[1]));
        const userData = {
          name: decoded.name,
          email: decoded.email,
          picture: decoded.picture,
        };
        setUser(userData);
      } catch (error) {
        console.error('Error restoring user session:', error);
        localStorage.removeItem('google-credential');
      }
    }
  }, []);

  // Save user data to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  // Update the effect for fetching Google Tasks to work with multiple accounts
  useEffect(() => {
    if (googleAccounts.length === 0) {
      setIsInitialLoad(false);
      return;
    }

    const fetchTasksForAllAccounts = async () => {
      try {
        setGoogleTasksLoading(true);

        // Fetch tasks for all accounts
        const allTasksPromises = googleAccounts.map(async (account, index) => {
          // Fetch task lists
          const listsResponse = await axios.get('https://www.googleapis.com/tasks/v1/users/@me/lists', {
            headers: { Authorization: `Bearer ${account.token}` }
          });
          
          const taskLists = listsResponse.data.items || [];
          
          // Update the account with new task lists
          setGoogleAccounts(prevAccounts => {
            const newAccounts = [...prevAccounts];
            newAccounts[index] = {
              ...newAccounts[index],
              taskLists
            };
            return newAccounts;
          });

          // Fetch tasks for each list with proper pagination
          const tasksPromises = taskLists.map(async (list: any) => {
            let allTasks: any[] = [];
            let pageToken: string | undefined;
            
            do {
              const response = await axios.get(`https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks`, {
                headers: { Authorization: `Bearer ${account.token}` },
                params: {
                  showCompleted: true,
                  showHidden: true,
                  maxResults: 100,
                  pageToken: pageToken
                }
              });
              
              const tasks = response.data.items || [];
              // Add account info to each task
              const tasksWithAccount = tasks.map((task: any) => ({
                ...task,
                accountEmail: account.user.email,
                accountName: account.user.name,
                accountPicture: account.user.picture
              }));
              allTasks = [...allTasks, ...tasksWithAccount];
              pageToken = response.data.nextPageToken;
            } while (pageToken);

            return { listId: list.id, tasks: allTasks };
          });

          const results = await Promise.all(tasksPromises);
          const tasksByList: { [listId: string]: any[] } = {};
          results.forEach(({ listId, tasks }) => {
            tasksByList[listId] = tasks;
          });

          return { accountIndex: index, tasksByList };
        });

        const allResults = await Promise.all(allTasksPromises);
        
        // Update all accounts with their tasks
        setGoogleAccounts(prevAccounts => {
          const newAccounts = [...prevAccounts];
          allResults.forEach(({ accountIndex, tasksByList }) => {
            newAccounts[accountIndex] = {
              ...newAccounts[accountIndex],
              tasks: tasksByList
            };
          });
          return newAccounts;
        });

        // Combine tasks from all accounts
        const combinedTasksByList: { [listId: string]: any[] } = {};
        allResults.forEach(({ tasksByList }) => {
          Object.entries(tasksByList).forEach(([listId, tasks]) => {
            if (!combinedTasksByList[listId]) {
              combinedTasksByList[listId] = [];
            }
            combinedTasksByList[listId] = [...combinedTasksByList[listId], ...tasks];
          });
        });

        // Update columns with the combined tasks
        updateColumnsWithTasks(combinedTasksByList);
      } catch (error) {
        console.error('Error fetching tasks:', error);
      } finally {
        setGoogleTasksLoading(false);
        setIsInitialLoad(false);
      }
    };

    fetchTasksForAllAccounts();
  }, [googleAccounts.length]); // Only depend on the number of accounts

  // Save accounts to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(GOOGLE_ACCOUNTS_KEY, JSON.stringify(googleAccounts));
  }, [googleAccounts]);

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const userData = {
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
      };
      setUser(userData);
      localStorage.setItem('google-credential', credentialResponse.credential);
      
      // Automatically trigger Google Tasks connection after successful login
      setGoogleTasksLoading(true);
      await loginGoogleTasks();
    } catch (error) {
      console.error('Error during login:', error);
      setGoogleTasksLoading(false);
    }
  };

  const loginGoogleTasks = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/tasks',
    onSuccess: async (tokenResponse) => {
      try {
        if (!user) {
          throw new Error('User not logged in');
        }

        const newAccount: GoogleAccount = {
          user,
          token: tokenResponse.access_token,
          taskLists: [],
          tasks: {}
        };

        setGoogleAccounts(prevAccounts => [...prevAccounts, newAccount]);
        setActiveAccountIndex(googleAccounts.length);
        setGoogleTasksLoading(false);
      } catch (error) {
        console.error('Error fetching tasks:', error);
        setGoogleTasksLoading(false);
      }
    },
    onError: () => {
      setGoogleTasksLoading(false);
      alert('Google Tasks connection failed.');
    },
    flow: 'implicit',
  });

  const handleRemoveAccount = (index: number) => {
    setGoogleAccounts(prevAccounts => prevAccounts.filter((_, i) => i !== index));
    if (activeAccountIndex >= index) {
      setActiveAccountIndex(Math.max(0, activeAccountIndex - 1));
    }
    setSelectedAccountForRemoval(null);
  };

  // Add this new component for the account switcher
  const AccountSwitcher = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {googleAccounts.map((account, index) => (
        <Chip
          key={account.user.email}
          avatar={<Avatar src={account.user.picture} alt={account.user.name} />}
          label={account.user.name}
          onClick={() => setActiveAccountIndex(index)}
          onDelete={() => setSelectedAccountForRemoval(index)}
          color={index === activeAccountIndex ? 'primary' : 'default'}
          sx={{
            '&:hover': {
              opacity: 0.8
            }
          }}
        />
      ))}
      <IconButton
        color="primary"
        onClick={() => setOpenAccountDialog(true)}
        sx={{
          border: '1px dashed',
          borderColor: 'primary.main',
          '&:hover': {
            backgroundColor: 'primary.light',
            color: 'white'
          }
        }}
      >
        <AddIcon />
      </IconButton>
    </Box>
  );

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDrawerExpandToggle = () => {
    setIsDrawerExpanded(!isDrawerExpanded);
  };

  const handleDragStart = (task: Task, columnId: string) => {
    setDraggedTask({ task, sourceColumnId: columnId });
    // Add dragging state to the task
    setColumns(columns.map(column => {
      if (column.id === columnId) {
        return {
          ...column,
          tasks: column.tasks.map(t => 
            t.id === task.id ? { ...t, isDragging: true } : t
          )
        };
      }
      return column;
    }));
  };

  const handleDragOver = (e: React.DragEvent, columnId: string, taskIndex?: number) => {
    e.preventDefault();
    setDragOverColumn(columnId);
    if (taskIndex !== undefined) {
      setDragOverTaskIndex(taskIndex);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
    setDragOverTaskIndex(null);
  };

  const handleDrop = async (targetColumnId: string) => {
    if (!draggedTask) return;

    const { task, sourceColumnId } = draggedTask;
    
    if (sourceColumnId === targetColumnId) {
      setDraggedTask(null);
      setDragOverColumn(null);
      setDragOverTaskIndex(null);
      // Remove dragging state
      setColumns(columns.map(column => {
        if (column.id === sourceColumnId) {
          return {
            ...column,
            tasks: column.tasks.map(t => ({ ...t, isDragging: false }))
          };
        }
        return column;
      }));
      return;
    }

    // Sync with Google Tasks if connected
    if (googleAccounts.length > 0) {
      try {
        // Find the task in Google Tasks
        let taskListId = '';
        let taskId = '';
        
        // Search through all task lists to find the task
        for (const [listId, tasks] of Object.entries(googleAccounts[activeAccountIndex].tasks)) {
          const foundTask = tasks.find(t => t.title === task.content);
          if (foundTask) {
            taskListId = listId;
            taskId = foundTask.id;
            break;
          }
        }

        if (taskListId && taskId) {
          // Prepare the update based on the target column
          const update: any = {};
          
          if (targetColumnId === 'done') {
            // Mark as completed
            update.completed = new Date().toISOString(); // Add completion date
            update.status = 'completed';
            update.notes = ''; // Clear any notes
          } else if (targetColumnId === 'inProgress') {
            // Add "Active" note with icon if not already present
            const currentNotes = task.notes || '';
            if (!currentNotes.includes('⚡ Active')) {
              update.notes = currentNotes ? `${currentNotes}\n⚡ Active` : '⚡ Active';
            }
            update.completed = null; // Clear completion date
            update.status = 'needsAction';
          } else {
            // Reset status and remove only the Active badge from notes
            const currentNotes = task.notes || '';
            update.notes = currentNotes.replace('⚡ Active', '').trim();
            update.completed = null; // Clear completion date
            update.status = 'needsAction';
            // Preserve the due date when moving back to ToDo
            if (task.dueDate) {
              update.due = task.dueDate.toISOString();
            }
          }

          // Update the task in Google Tasks
          const response = await axios.patch(
            `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
            update,
            {
              headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` }
            }
          );

          // Update the local Google Tasks state with the response data
          setGoogleAccounts(prevAccounts => {
            const newAccounts = [...prevAccounts];
            if (newAccounts[activeAccountIndex].tasks[taskListId]) {
              newAccounts[activeAccountIndex].tasks[taskListId] = newAccounts[activeAccountIndex].tasks[taskListId].map(t => 
                t.id === taskId 
                  ? { ...t, ...response.data }
                  : t
              );
            }
            return newAccounts;
          });

          // Refresh the tasks data to ensure everything is in sync
          const taskListsResponse = await axios.get('https://www.googleapis.com/tasks/v1/users/@me/lists', {
            headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` }
          });

          const taskLists = taskListsResponse.data.items || [];
          const tasksPromises = taskLists.map(async (list: any) => {
            let allTasks: any[] = [];
            let pageToken: string | undefined;
            
            do {
              const response = await axios.get(`https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks`, {
                headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` },
                params: {
                  showCompleted: true,
                  showHidden: true,
                  maxResults: 100,
                  pageToken: pageToken
                }
              });
              
              const tasks = response.data.items || [];
              allTasks = [...allTasks, ...tasks];
              pageToken = response.data.nextPageToken;
            } while (pageToken);

            return { listId: list.id, tasks: allTasks };
          });

          const results = await Promise.all(tasksPromises);
          const tasksByList: { [listId: string]: any[] } = {};
          results.forEach(({ listId, tasks }) => {
            tasksByList[listId] = tasks;
          });

          // Update Google Tasks state
          setGoogleAccounts(prevAccounts => {
            const newAccounts = [...prevAccounts];
            newAccounts[activeAccountIndex].tasks = tasksByList;
            return newAccounts;
          });

          // Update columns with fresh data
          setColumns(prevColumns => {
            return prevColumns.map(column => {
              let columnTasks: Task[] = [];
              
              if (column.id === 'todo') {
                // Get all uncompleted tasks from all lists
                Object.values(tasksByList).forEach(tasks => {
                  const todoTasks = tasks
                    .filter(task => !task.completed && (!task.notes || !task.notes.includes('⚡ Active')))
                    .map(task => ({
                      id: task.id,
                      content: task.title,
                      dueDate: task.due ? new Date(task.due) : null,
                      isRecurring: task.recurrence ? true : false,
                      notes: task.notes || '',
                      color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#42A5F5',
                      status: 'todo' as const,
                      accountEmail: task.accountEmail,
                      accountName: task.accountName,
                      accountPicture: task.accountPicture
                    }));
                  columnTasks = [...columnTasks, ...todoTasks];
                });

                // Sort by due date (if available) and then by title
                columnTasks.sort((a, b) => {
                  if (a.dueDate && b.dueDate) {
                    return a.dueDate.getTime() - b.dueDate.getTime();
                  }
                  if (a.dueDate) return -1;
                  if (b.dueDate) return 1;
                  return a.content.localeCompare(b.content);
                });

                // Show all tasks in ToDo column
                if (columnTasks.length === 0) {
                  columnTasks = [{
                    id: 'no-tasks',
                    content: 'No tasks to do',
                    status: 'todo' as const,
                    color: '#42A5F5',
                    accountEmail: '',
                    accountName: '',
                    accountPicture: ''
                  }];
                }
              } else if (column.id === 'inProgress') {
                // Get tasks with "Active" note from all lists
                Object.values(tasksByList).forEach(tasks => {
                  const inProgressTasks = tasks
                    .filter(task => !task.completed && task.notes && task.notes.includes('⚡ Active'))
                    .map(task => ({
                      id: task.id,
                      content: task.title,
                      dueDate: task.due ? new Date(task.due) : null,
                      isRecurring: task.recurrence ? true : false,
                      notes: task.notes?.replace('⚡ Active', '').trim() || '',
                      color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#FFA726',
                      status: 'in-progress' as const,
                      accountEmail: task.accountEmail,
                      accountName: task.accountName,
                      accountPicture: task.accountPicture
                    }));
                  columnTasks = [...columnTasks, ...inProgressTasks];
                });
              } else if (column.id === 'done') {
                // Get completed tasks from all lists
                const allCompletedTasks: Task[] = [];
                Object.values(tasksByList).forEach(tasks => {
                  const completedTasks = tasks
                    .filter(task => task.completed)
                    .map(task => ({
                      id: task.id,
                      content: task.title,
                      dueDate: task.due ? new Date(task.due) : null,
                      isRecurring: task.recurrence ? true : false,
                      notes: task.notes || '',
                      color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#66BB6A',
                      status: 'completed' as const,
                      completedAt: task.completed ? new Date(task.completed) : null,
                      accountEmail: task.accountEmail,
                      accountName: task.accountName,
                      accountPicture: task.accountPicture
                    }));
                  allCompletedTasks.push(...completedTasks);
                });
                
                // Sort by completion date (most recent first)
                columnTasks = allCompletedTasks
                  .sort((a, b) => {
                    if (!a.completedAt || !b.completedAt) return 0;
                    return b.completedAt.getTime() - a.completedAt.getTime();
                  });

                // Apply limit if specified
                if (column.limit && column.limit > 0) {
                  columnTasks = columnTasks.slice(0, column.limit);
                } else if (column.limit === -1) {
                  // Show all tasks if limit is -1
                  columnTasks = columnTasks;
                }

                if (columnTasks.length === 0) {
                  columnTasks = [{
                    id: 'no-tasks',
                    content: 'No completed tasks yet',
                    status: 'completed' as const,
                    color: '#66BB6A',
                    accountEmail: '',
                    accountName: '',
                    accountPicture: ''
                  }];
                }
              }

              return {
                ...column,
                tasks: columnTasks
              };
            });
          });
        }
      } catch (error) {
        console.error('Error syncing with Google Tasks:', error);
        // Revert the local state if the Google Tasks update fails
        setColumns(prevColumns => {
          return prevColumns.map(column => {
            if (column.id === sourceColumnId) {
              return {
                ...column,
                tasks: [...column.tasks, { ...task, isDragging: false }]
              };
            }
            if (column.id === targetColumnId) {
              return {
                ...column,
                tasks: column.tasks.filter(t => t.id !== task.id)
              };
            }
            return column;
          });
        });
      }
    } else {
      // If not connected to Google Tasks, just update local state
      setColumns(prevColumns => {
        return prevColumns.map(column => {
          if (column.id === sourceColumnId) {
            return {
              ...column,
              tasks: column.tasks.filter(t => t.id !== task.id)
            };
          }
          if (column.id === targetColumnId) {
            const newTask = { 
              ...task, 
              isDragging: false,
              status: targetColumnId === 'inProgress' ? 'in-progress' as const : 
                     targetColumnId === 'done' ? 'completed' as const : 'todo' as const,
              completedAt: targetColumnId === 'done' ? new Date() : null,
              accountEmail: task.accountEmail,
              accountName: task.accountName,
              accountPicture: task.accountPicture
            };
            if (dragOverTaskIndex !== null) {
              const newTasks = [...column.tasks];
              newTasks.splice(dragOverTaskIndex, 0, newTask);
              return {
                ...column,
                tasks: newTasks
              };
            }
            return {
              ...column,
              tasks: [...column.tasks, newTask]
            };
          }
          return column;
        });
      });
    }

    setDraggedTask(null);
    setDragOverColumn(null);
    setDragOverTaskIndex(null);
  };

  const handleAddColumn = () => {
    const newColumn: Column = {
      id: `column-${Date.now()}`,
      title: 'New Column',
      tasks: [],
    };
    setColumns(prevColumns => [...prevColumns, newColumn]);
  };

  const handleDeleteColumn = (columnId: string) => {
    setColumns(prevColumns => prevColumns.filter(col => col.id !== columnId));
  };

  const handleQuickDateChange = (task: Task, columnId: string, date: Date | null) => {
    // Update local state first
    setColumns(columns.map(column => {
      if (column.id === columnId) {
        return {
          ...column,
          tasks: column.tasks.map(t => 
            t.id === task.id 
              ? { ...t, dueDate: date }
              : t
          )
        };
      }
      return column;
    }));

    // Sync with Google Tasks if connected
    if (googleAccounts.length > 0 && task.listId) {
      try {
        axios.patch(
          `https://www.googleapis.com/tasks/v1/lists/${task.listId}/tasks/${task.id}`,
          {
            due: date ? date.toISOString() : null
          },
          {
            headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` }
          }
        ).catch(error => {
          console.error('Error updating due date in Google Tasks:', error);
          // Revert the local state if the Google Tasks update fails
          setColumns(columns.map(column => {
            if (column.id === columnId) {
              return {
                ...column,
                tasks: column.tasks.map(t => 
                  t.id === task.id 
                    ? { ...t, dueDate: task.dueDate }
                    : t
                )
              };
            }
            return column;
          }));
        });
      } catch (error) {
        console.error('Error updating due date in Google Tasks:', error);
      }
    }

    setSelectedTask(null);
  };

  const handleGoogleError = () => {
    console.log('Login Failed');
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setGoogleAccounts([]);
    setActiveAccountIndex(0);
    // Clear all stored data
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(GOOGLE_ACCOUNTS_KEY);
    localStorage.removeItem('google-credential');
  };

  const getDateColor = (date: string) => {
    if (date === 'no-date') return 'grey.600';
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    
    if (date === today) return 'error.main';
    if (date === tomorrow) return 'warning.main';
    return 'primary.main';
  };

  // Filter tasks based on search query
  const filterTasks = (tasks: Task[]) => {
    if (!searchQuery.trim()) return tasks;
    
    const query = searchQuery.toLowerCase();
    return tasks.filter(task => 
      task.content.toLowerCase().includes(query) ||
      (task.notes && task.notes.toLowerCase().includes(query))
    );
  };

  const handleEditTask = async (task: Task, columnId: string) => {
    if (!task || task.id === 'no-tasks') return;
    
    // Initialize the edit form with the current task data
    setEditTaskForm({
      content: task.content || '',
      notes: task.notes || '',
      color: task.color || '#1976d2',
      dueDate: task.dueDate || null,
      isRecurring: task.isRecurring || false
    });
    
    // Set the editing task after form is initialized
    setEditingTask({ task, columnId });
  };

  const handleSaveTaskEdit = async () => {
    if (!editingTask) return;

    const { task, columnId } = editingTask;

    // Update local state first
    setColumns(prevColumns => {
      return prevColumns.map(column => {
        if (column.id === columnId) {
          return {
            ...column,
            tasks: column.tasks.map(t => 
              t.id === task.id 
                ? { 
                    ...t, 
                    content: editTaskForm.content || t.content,
                    notes: editTaskForm.notes,
                    color: editTaskForm.color,
                    dueDate: editTaskForm.dueDate,
                    isRecurring: editTaskForm.isRecurring
                  }
                : t
            )
          };
        }
        return column;
      });
    });

    // Sync with Google Tasks if connected
    if (googleAccounts.length > 0) {
      try {
        // Find the task in Google Tasks
        let taskListId = '';
        let taskId = '';
        
        // Search through all task lists to find the task
        for (const [listId, tasks] of Object.entries(googleAccounts[activeAccountIndex].tasks)) {
          const foundTask = tasks.find(t => t.title === task.content);
          if (foundTask) {
            taskListId = listId;
            taskId = foundTask.id;
            break;
          }
        }

        if (taskListId && taskId) {
          // Prepare the update
          const update: any = {
            title: editTaskForm.content,
            notes: editTaskForm.notes || '',
            due: editTaskForm.dueDate ? editTaskForm.dueDate.toISOString() : null
          };

          // Add color to notes if specified
          if (editTaskForm.color) {
            const colorHex = editTaskForm.color.replace('#', '');
            // Remove any existing color from notes
            const notesWithoutColor = update.notes.replace(/#[A-Fa-f0-9]{6}/g, '').trim();
            update.notes = `${notesWithoutColor}\n#${colorHex}`;
          }

          // Add recurring status to notes
          if (editTaskForm.isRecurring) {
            if (!update.notes.includes('🔄 Recurring')) {
              update.notes = `${update.notes}\n🔄 Recurring`;
            }
          } else {
            update.notes = update.notes.replace('🔄 Recurring', '').trim();
          }

          // Update the task in Google Tasks
          const response = await axios.patch(
            `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
            update,
            {
              headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` }
            }
          );

          // Update the local Google Tasks state with the response data
          setGoogleAccounts(prevAccounts => {
            const newAccounts = [...prevAccounts];
            if (newAccounts[activeAccountIndex].tasks[taskListId]) {
              newAccounts[activeAccountIndex].tasks[taskListId] = newAccounts[activeAccountIndex].tasks[taskListId].map(t => 
                t.id === taskId 
                  ? { ...t, ...response.data }
                  : t
              );
            }
            return newAccounts;
          });

          // Refresh the tasks data to ensure everything is in sync
          const taskListsResponse = await axios.get('https://www.googleapis.com/tasks/v1/users/@me/lists', {
            headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` }
          });

          const taskLists = taskListsResponse.data.items || [];
          const tasksPromises = taskLists.map(async (list: any) => {
            let allTasks: any[] = [];
            let pageToken: string | undefined;
            
            do {
              const response = await axios.get(`https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks`, {
                headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` },
                params: {
                  showCompleted: true,
                  showHidden: true,
                  maxResults: 100,
                  pageToken: pageToken
                }
              });
              
              const tasks = response.data.items || [];
              allTasks = [...allTasks, ...tasks];
              pageToken = response.data.nextPageToken;
            } while (pageToken);

            return { listId: list.id, tasks: allTasks };
          });

          const results = await Promise.all(tasksPromises);
          const tasksByList: { [listId: string]: any[] } = {};
          results.forEach(({ listId, tasks }) => {
            tasksByList[listId] = tasks;
          });

          // Update Google Tasks state
          setGoogleAccounts(prevAccounts => {
            const newAccounts = [...prevAccounts];
            newAccounts[activeAccountIndex].tasks = tasksByList;
            return newAccounts;
          });

          // Update columns with fresh data
          updateColumnsWithTasks(tasksByList);
        }
      } catch (error) {
        console.error('Error updating task in Google Tasks:', error);
        // Revert local state if Google Tasks update fails
        setColumns(prevColumns => {
          return prevColumns.map(column => {
            if (column.id === columnId) {
              return {
                ...column,
                tasks: column.tasks.map(t => 
                  t.id === task.id ? task : t
                )
              };
            }
            return column;
          });
        });
      }
    }

    setEditingTask(null);
    setEditTaskForm({
      content: '',
      notes: '',
      color: '#1976d2',
      dueDate: null,
      isRecurring: false
    });
  };

  const renderTask = (task: Task, columnId: string) => {
    const isNoTask = task.id === 'no-tasks';
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const isDoneColumn = columnId === 'done';
    
    return (
      <Paper 
        key={task.id}
        sx={{ 
          p: 1.5,
          cursor: 'grab',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: task.isDragging ? 'scale(1.02) rotate(1deg)' : 'scale(1) rotate(0deg)',
          opacity: task.isDragging ? 0.5 : 1,
          boxShadow: task.isDragging ? 3 : 1,
          position: 'relative',
          '&:hover': {
            boxShadow: 2,
            transform: 'translateY(-2px)',
          },
          borderLeft: task.color ? `4px solid ${task.color}` : 'none',
          bgcolor: task.color ? `${task.color}10` : 'background.paper',
          maxWidth: '100%',
          overflow: 'hidden',
          mb: 1,
          display: 'flex',
          flexDirection: 'column'
        }}
        draggable
        onDragStart={() => handleDragStart(task, columnId)}
      >
        {task.accountPicture && !isNoTask && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
            }}
          >
            <Avatar
              src={task.accountPicture}
              alt={task.accountName}
              sx={{
                width: 24,
                height: 24,
                border: '2px solid white',
                boxShadow: 1,
              }}
            />
          </Box>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, width: '100%' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="subtitle1" 
              sx={{ 
                wordBreak: 'break-word',
                fontWeight: 600,
                fontSize: '0.9rem',
                lineHeight: 1.3,
                mb: 0.5,
                pr: task.accountPicture ? 4 : 0
              }}
            >
              {task.content}
            </Typography>
            
            {!isNoTask && task.notes && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  mb: 1,
                  fontSize: '0.75rem',
                  lineHeight: 1.5,
                  wordBreak: 'break-word',
                  whiteSpace: 'pre-wrap',
                  overflow: 'visible',
                  maxHeight: 'none'
                }}
              >
                {task.notes}
              </Typography>
            )}

            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5, alignItems: 'center' }}>
              {!isNoTask && task.isRecurring && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  bgcolor: 'primary.main',
                  color: 'white',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: '0.65rem',
                  flexShrink: 0
                }}>
                  🔄 Recurring
                </Box>
              )}
              {!isNoTask && task.status === 'in-progress' && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  bgcolor: 'warning.main',
                  color: 'white',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: '0.65rem',
                  flexShrink: 0
                }}>
                  ⚡ Active
                </Box>
              )}
              {!isNoTask && task.status === 'completed' && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  bgcolor: 'success.main',
                  color: 'white',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: '0.65rem',
                  flexShrink: 0
                }}>
                  ✓ Done
                </Box>
              )}
              {!isNoTask && task.accountName && (
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  bgcolor: 'grey.700',
                  color: 'white',
                  px: 1,
                  py: 0.25,
                  borderRadius: 1,
                  fontSize: '0.65rem',
                  flexShrink: 0
                }}>
                  {task.accountName}
                </Box>
              )}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                {!isNoTask && task.dueDate ? (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      bgcolor: isOverdue ? 'error.main' : 'info.main',
                      color: 'white',
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      fontSize: '0.65rem',
                      flexShrink: 0,
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.9
                      }
                    }}
                    onClick={() => setSelectedTask({ task, columnId })}
                  >
                    <EventIcon sx={{ fontSize: '0.7rem', mr: 0.5 }} />
                    {format(new Date(task.dueDate), 'MMM d')}
                  </Box>
                ) : !isNoTask && (
                  <Box 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      bgcolor: 'grey.500',
                      color: 'white',
                      px: 1,
                      py: 0.25,
                      borderRadius: 1,
                      fontSize: '0.65rem',
                      flexShrink: 0,
                      cursor: 'pointer',
                      '&:hover': {
                        opacity: 0.9
                      }
                    }}
                    onClick={() => setSelectedTask({ task, columnId })}
                  >
                    <EventIcon sx={{ fontSize: '0.7rem', mr: 0.5 }} />
                    Add Date
                  </Box>
                )}
              </Box>
            </Stack>
          </Box>
        </Box>
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleEditTask(task, columnId);
          }}
          sx={{
            position: 'absolute',
            top: 8,
            right: task.accountPicture ? 40 : 8,
            opacity: 1,
            transition: 'all 0.3s ease',
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
              transform: 'scale(1.1) rotate(5deg)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            },
            '& .MuiSvgIcon-root': {
              fontSize: '1rem',
            },
            zIndex: 2,
            width: '28px',
            height: '28px',
            border: '1px solid',
            borderColor: 'divider',
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Paper>
    );
  };

  const renderListView = () => {
    const allTasks = columns.reduce((acc: Task[], column) => {
      if (column.id !== 'done') {
        return [...acc, ...column.tasks];
      }
      return acc;
    }, []);

    const filteredTasks = filterTasks(allTasks);

    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          All Tasks
        </Typography>
        <Stack spacing={2}>
          {filteredTasks.map((task) => (
            <Paper
              key={task.id}
              sx={{
                p: 2,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                '&:hover': {
                  boxShadow: 2,
                },
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle1">{task.content}</Typography>
                {task.notes && (
                  <Typography variant="body2" color="text.secondary">
                    {task.notes}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {task.dueDate && (
                  <Chip
                    icon={<EventIcon />}
                    label={format(new Date(task.dueDate), 'MMM d, yyyy')}
                    color={new Date(task.dueDate) < new Date() ? 'error' : 'primary'}
                    size="small"
                  />
                )}
                <Chip
                  label={task.status === 'in-progress' ? 'In Progress' : 'To Do'}
                  color={task.status === 'in-progress' ? 'warning' : 'info'}
                  size="small"
                />
              </Box>
            </Paper>
          ))}
        </Stack>
      </Box>
    );
  };

  // Add new render functions for different views
  const renderCalendarView = () => {
    const allTasks = columns.reduce((acc: Task[], column) => {
      return [...acc, ...column.tasks];
    }, []);

    const filteredTasks = filterTasks(allTasks);
    const tasksByDate = filteredTasks.reduce((acc: { [key: string]: Task[] }, task) => {
      if (task.dueDate) {
        const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
        if (!acc[dateKey]) {
          acc[dateKey] = [];
        }
        acc[dateKey].push(task);
      }
      return acc;
    }, {});

    return (
      <Box sx={{ p: 2 }}>
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h5">Calendar View</Typography>
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              value={selectedDate}
              onChange={(newDate) => newDate && setSelectedDate(newDate)}
              slotProps={{
                textField: {
                  variant: 'outlined',
                  size: 'small',
                },
              }}
            />
          </LocalizationProvider>
        </Box>
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            {format(selectedDate, 'MMMM d, yyyy')}
          </Typography>
          <Stack spacing={2}>
            {tasksByDate[format(selectedDate, 'yyyy-MM-dd')]?.map((task) => (
              <Paper
                key={task.id}
                sx={{
                  p: 2,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 2,
                  borderLeft: `4px solid ${task.color || '#42A5F5'}`,
                  '&:hover': {
                    boxShadow: 2,
                  },
                  minHeight: '100px',
                  height: 'auto'
                }}
              >
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" sx={{ wordBreak: 'break-word' }}>{task.content}</Typography>
                  {task.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: 'break-word', whiteSpace: 'pre-wrap' }}>
                      {task.notes}
                    </Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip
                    label={task.status === 'in-progress' ? 'In Progress' : task.status === 'completed' ? 'Done' : 'To Do'}
                    color={task.status === 'in-progress' ? 'warning' : task.status === 'completed' ? 'success' : 'info'}
                    size="small"
                  />
                </Box>
              </Paper>
            )) || (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No tasks scheduled for this date
              </Typography>
            )}
          </Stack>
        </Paper>
      </Box>
    );
  };

  const renderTodayView = () => {
    const allTasks = columns.reduce((acc: Task[], column) => {
      return [...acc, ...column.tasks];
    }, []);

    const todayTasks = allTasks.filter(task => 
      task.dueDate && isToday(new Date(task.dueDate))
    );

    const filteredTasks = filterTasks(todayTasks);

    return (
      <Box sx={{ p: 2 }}>
        <Typography variant="h5" gutterBottom>
          Today's Tasks
        </Typography>
        <Stack spacing={1}>
          {filteredTasks.map((task) => (
            <Box
              key={task.id}
              sx={{
                p: 1.5,
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                borderLeft: `3px solid ${task.color || '#42A5F5'}`,
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.04)',
                  transition: 'all 0.2s ease'
                },
                bgcolor: 'white',
                borderBottom: '1px solid',
                borderColor: 'divider',
                cursor: 'pointer'
              }}
            >
              <Box sx={{ 
                flex: 1, 
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                gap: 1
              }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    wordBreak: 'break-word',
                    fontWeight: 500,
                    color: 'text.primary',
                    flex: 1
                  }}
                >
                  {task.content}
                </Typography>
                <Chip
                  label={task.status === 'in-progress' ? 'In Progress' : task.status === 'completed' ? 'Done' : 'To Do'}
                  color={task.status === 'in-progress' ? 'warning' : task.status === 'completed' ? 'success' : 'info'}
                  size="small"
                  sx={{ 
                    fontWeight: 500,
                    height: '24px',
                    '& .MuiChip-label': {
                      px: 1,
                      fontSize: '0.75rem'
                    }
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>
    );
  };

  const handleLimitChange = (columnId: string, newLimit: number) => {
    setColumns(prevColumns => {
      const newColumns = prevColumns.map(col => {
        if (col.id === columnId) {
          // Get the original tasks from all Google Tasks accounts
          let originalTasks: Task[] = [];
          if (googleAccounts.length > 0) {
            // Get tasks from all accounts
            googleAccounts.forEach(account => {
              Object.values(account.tasks).forEach(tasks => {
                const completedTasks = tasks
                  .filter(task => task.completed)
                  .map(task => ({
                    id: task.id,
                    content: task.title,
                    dueDate: task.due ? new Date(task.due) : null,
                    isRecurring: task.recurrence ? true : false,
                    notes: task.notes || '',
                    color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#66BB6A',
                    status: 'completed' as const,
                    completedAt: task.completed ? new Date(task.completed) : null,
                    accountEmail: account.user.email,
                    accountName: account.user.name,
                    accountPicture: account.user.picture
                  }));
                originalTasks = [...originalTasks, ...completedTasks];
              });
            });
            
            // Sort by completion date (most recent first)
            originalTasks.sort((a, b) => {
              if (!a.completedAt || !b.completedAt) return 0;
              return b.completedAt.getTime() - a.completedAt.getTime();
            });
          } else {
            // If no Google Tasks, use the current tasks
            originalTasks = [...col.tasks];
          }

          // Apply the new limit
          let updatedTasks = originalTasks;
          if (newLimit > 0) {
            updatedTasks = originalTasks.slice(0, newLimit);
          } else if (newLimit === -1) {
            // Show all tasks
            updatedTasks = originalTasks;
          } else {
            // Default to 3
            updatedTasks = originalTasks.slice(0, 3);
          }

          return { ...col, limit: newLimit, tasks: updatedTasks };
        }
        return col;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newColumns));
      return newColumns;
    });
  };

  const renderColumnHeader = (column: Column) => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between', 
      mb: 2,
      p: 1.5,
      borderRadius: 1,
      bgcolor: 'action.hover',
      position: 'sticky',
      top: 0,
      zIndex: 1,
      borderBottom: '1px solid',
      borderColor: 'divider',
    }}>
      <Typography variant="h6" sx={{ 
        fontWeight: 'bold',
        color: 'primary.main',
        display: 'flex',
        alignItems: 'center',
        gap: 1
      }}>
        {column.title}
        <Typography variant="caption" sx={{ 
          bgcolor: 'primary.main',
          color: 'white',
          px: 1,
          py: 0.5,
          borderRadius: 1,
          fontSize: '0.75rem'
        }}>
          {column.tasks.length}
        </Typography>
      </Typography>
      {column.id === 'done' && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            Show:
          </Typography>
          <Select
            size="small"
            value={column.limit || 3}
            onChange={(e) => handleLimitChange(column.id, Number(e.target.value))}
            sx={{ 
              fontSize: '0.75rem',
              height: '28px',
              '& .MuiSelect-select': {
                py: 0.5
              }
            }}
          >
            <MenuItem value={3}>3</MenuItem>
            <MenuItem value={5}>5</MenuItem>
            <MenuItem value={10}>10</MenuItem>
            <MenuItem value={20}>20</MenuItem>
            <MenuItem value={50}>50</MenuItem>
            <MenuItem value={100}>100</MenuItem>
            <MenuItem value={-1}>All</MenuItem>
          </Select>
        </Box>
      )}
    </Box>
  );

  const renderColumn = (column: Column) => {
    // Apply limit for done column
    const displayTasks = column.id === 'done' ? 
      (column.limit && column.limit > 0 ? column.tasks.slice(0, column.limit) : 
       column.limit === -1 ? column.tasks : column.tasks.slice(0, 3)) : 
      column.tasks;

    return (
      <Paper
        key={column.id}
        sx={{
          p: 2,
          minWidth: 300,
          maxWidth: 'none',
          flex: 1,
          bgcolor: 'background.paper',
          borderRadius: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          height: 'fit-content',
          minHeight: 'calc(100vh - 100px)',
          overflow: 'auto',
          position: 'relative',
          transition: 'all 0.2s ease',
          transform: column.id === dragOverColumn ? 'scale(1.02)' : 'scale(1)',
          boxShadow: column.id === dragOverColumn ? 3 : 1,
          opacity: draggedTask && draggedTask.sourceColumnId === column.id ? 0.5 : 1,
          border: '1px solid',
          borderColor: 'divider',
          '&:hover': {
            boxShadow: 4,
            borderColor: 'primary.light',
          },
        }}
        onDragOver={(e) => handleDragOver(e, column.id)}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop(column.id)}
      >
        {renderColumnHeader(column)}
        <Stack spacing={2}>
          {filterTasks(displayTasks).map((task, taskIndex) => (
            renderTask(task, column.id)
          ))}
        </Stack>
      </Paper>
    );
  };

  const renderKanbanView = () => (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
      {columns.map(column => renderColumn(column))}
    </Box>
  );

  const renderUltimateView = () => {
    return (
      <Box sx={{ display: 'flex', width: '100%' }}>
        <Box sx={{ flex: 1, minWidth: 0, mr: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
            {columns.map(column => renderColumn(column))}
          </Box>
        </Box>
        <Paper 
          sx={{ 
            p: 2, 
            height: 'calc(100vh - 100px)', 
            overflow: 'auto',
            width: sidebarWidth,
            position: 'relative',
            transition: 'width 0.3s ease',
            flexShrink: 0,
            bgcolor: '#f5f5f5',
            borderLeft: '2px solid',
            borderColor: 'primary.main',
            boxShadow: '-8px 0 16px rgba(0, 0, 0, 0.15)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '4px',
              background: 'linear-gradient(90deg, #1976d2, #42a5f5)'
            }
          }}
        >
          <Box sx={{ 
            position: 'absolute', 
            left: 0,
            top: 0, 
            bottom: 0, 
            width: '4px', 
            cursor: 'ew-resize',
            '&:hover': {
              bgcolor: 'primary.main',
            }
          }}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startWidth = sidebarWidth;
            
            const handleMouseMove = (e: MouseEvent) => {
              const deltaX = e.clientX - startX;
              const newWidth = Math.max(200, Math.min(800, startWidth - deltaX));
              setSidebarWidth(newWidth);
            };
            
            const handleMouseUp = () => {
              document.removeEventListener('mousemove', handleMouseMove);
              document.removeEventListener('mouseup', handleMouseUp);
            };
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
          }}
          />
          <Typography 
            variant="h6" 
            gutterBottom
            sx={{
              color: 'primary.main',
              fontWeight: 'bold',
              pb: 2,
              borderBottom: '2px solid',
              borderColor: 'primary.main',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontSize: '1.1rem'
            }}
          >
            Today's Tasks
          </Typography>
          <Stack spacing={1}>
            {columns.reduce((acc: Task[], column) => {
              const todayTasks = column.tasks.filter(task => 
                task.dueDate && isToday(new Date(task.dueDate))
              );
              return [...acc, ...todayTasks];
            }, []).map((task) => (
              <Box
                key={task.id}
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  borderLeft: `3px solid ${task.color || '#42A5F5'}`,
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.04)',
                    transition: 'all 0.2s ease'
                  },
                  bgcolor: 'white',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer'
                }}
              >
                <Box sx={{ 
                  flex: 1, 
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
                }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      wordBreak: 'break-word',
                      fontWeight: 500,
                      color: 'text.primary',
                      flex: 1
                    }}
                  >
                    {task.content}
                  </Typography>
                  <Chip
                    label={task.status === 'in-progress' ? 'In Progress' : task.status === 'completed' ? 'Done' : 'To Do'}
                    color={task.status === 'in-progress' ? 'warning' : task.status === 'completed' ? 'success' : 'info'}
                    size="small"
                    sx={{ 
                      fontWeight: 500,
                      height: '24px',
                      '& .MuiChip-label': {
                        px: 1,
                        fontSize: '0.75rem'
                      }
                    }}
                  />
                </Box>
              </Box>
            ))}
          </Stack>
        </Paper>
      </Box>
    );
  };

  const updateColumnsWithTasks = (tasksByList: { [listId: string]: any[] }) => {
    setColumns(prevColumns => {
      return prevColumns.map(column => {
        let columnTasks: Task[] = [];
        
        if (column.id === 'todo') {
          // Get all uncompleted tasks from all lists
          Object.values(tasksByList).forEach(tasks => {
            const todoTasks = tasks
              .filter(task => !task.completed && (!task.notes || !task.notes.includes('⚡ Active')))
              .map(task => ({
                id: task.id,
                content: task.title,
                dueDate: task.due ? new Date(task.due) : null,
                isRecurring: task.recurrence ? true : false,
                notes: task.notes || '',
                color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#42A5F5',
                status: 'todo' as const,
                accountEmail: task.accountEmail,
                accountName: task.accountName,
                accountPicture: task.accountPicture
              }));
            columnTasks = [...columnTasks, ...todoTasks];
          });

          // Sort by due date (if available) and then by title
          columnTasks.sort((a, b) => {
            if (a.dueDate && b.dueDate) {
              return a.dueDate.getTime() - b.dueDate.getTime();
            }
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return a.content.localeCompare(b.content);
          });

          // Show all tasks in ToDo column
          if (columnTasks.length === 0) {
            columnTasks = [{
              id: 'no-tasks',
              content: 'No tasks to do',
              status: 'todo' as const,
              color: '#42A5F5',
              accountEmail: '',
              accountName: '',
              accountPicture: ''
            }];
          }
        } else if (column.id === 'inProgress') {
          // Get tasks with "Active" note from all lists
          Object.values(tasksByList).forEach(tasks => {
            const inProgressTasks = tasks
              .filter(task => !task.completed && task.notes && task.notes.includes('⚡ Active'))
              .map(task => ({
                id: task.id,
                content: task.title,
                dueDate: task.due ? new Date(task.due) : null,
                isRecurring: task.recurrence ? true : false,
                notes: task.notes?.replace('⚡ Active', '').trim() || '',
                color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#FFA726',
                status: 'in-progress' as const,
                accountEmail: task.accountEmail,
                accountName: task.accountName,
                accountPicture: task.accountPicture
              }));
            columnTasks = [...columnTasks, ...inProgressTasks];
          });
        } else if (column.id === 'done') {
          // Get completed tasks from all lists
          const allCompletedTasks: Task[] = [];
          Object.values(tasksByList).forEach(tasks => {
            const completedTasks = tasks
              .filter(task => task.completed)
              .map(task => ({
                id: task.id,
                content: task.title,
                dueDate: task.due ? new Date(task.due) : null,
                isRecurring: task.recurrence ? true : false,
                notes: task.notes || '',
                color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#66BB6A',
                status: 'completed' as const,
                completedAt: task.completed ? new Date(task.completed) : null,
                accountEmail: task.accountEmail,
                accountName: task.accountName,
                accountPicture: task.accountPicture
              }));
            allCompletedTasks.push(...completedTasks);
          });
          
          // Sort by completion date (most recent first)
          columnTasks = allCompletedTasks
            .sort((a, b) => {
              if (!a.completedAt || !b.completedAt) return 0;
              return b.completedAt.getTime() - a.completedAt.getTime();
            });

          // Apply limit if specified
          if (column.limit && column.limit > 0) {
            columnTasks = columnTasks.slice(0, column.limit);
          } else if (column.limit === -1) {
            // Show all tasks if limit is -1
            columnTasks = columnTasks;
          }

          if (columnTasks.length === 0) {
            columnTasks = [{
              id: 'no-tasks',
              content: 'No completed tasks yet',
              status: 'completed' as const,
              color: '#66BB6A',
              accountEmail: '',
              accountName: '',
              accountPicture: ''
            }];
          }
        }

        return {
          ...column,
          tasks: columnTasks
        };
      });
    });
  };

  const refreshTasks = async () => {
    if (googleAccounts.length === 0 || isRefreshing) return;

    try {
      setIsRefreshing(true);
      const taskListsResponse = await axios.get('https://www.googleapis.com/tasks/v1/users/@me/lists', {
        headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` }
      });

      const taskLists = taskListsResponse.data.items || [];
      const tasksPromises = taskLists.map(async (list: any) => {
        let allTasks: any[] = [];
        let pageToken: string | undefined;
        
        do {
          const response = await axios.get(`https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks`, {
            headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` },
            params: {
              showCompleted: true,
              showHidden: true,
              maxResults: 100,
              pageToken: pageToken
            }
          });
          
          const tasks = response.data.items || [];
          // Add account info to each task
          const tasksWithAccount = tasks.map((task: any) => ({
            ...task,
            accountEmail: googleAccounts[activeAccountIndex].user.email,
            accountName: googleAccounts[activeAccountIndex].user.name,
            accountPicture: googleAccounts[activeAccountIndex].user.picture
          }));
          allTasks = [...allTasks, ...tasksWithAccount];
          pageToken = response.data.nextPageToken;
        } while (pageToken);

        return { listId: list.id, tasks: allTasks };
      });

      const results = await Promise.all(tasksPromises);
      const tasksByList: { [listId: string]: any[] } = {};
      results.forEach(({ listId, tasks }) => {
        tasksByList[listId] = tasks;
      });

      // Update Google Tasks state
      setGoogleAccounts(prevAccounts => {
        const newAccounts = [...prevAccounts];
        newAccounts[activeAccountIndex].tasks = tasksByList;
        return newAccounts;
      });

      // Update columns with fresh data
      updateColumnsWithTasks(tasksByList);
      setLastRefreshTime(new Date());
    } catch (error) {
      console.error('Error refreshing tasks:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Update the useEffect for auto-refresh with a shorter interval
  useEffect(() => {
    if (googleAccounts.length > 0) {
      // Set up auto-refresh every 15 seconds
      const interval = setInterval(refreshTasks, 15000);
      setRefreshInterval(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [googleAccounts.length, activeAccountIndex]);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar 
          position="fixed" 
          sx={{ 
            zIndex: (theme) => theme.zIndex.drawer + 1,
            background: 'linear-gradient(45deg, #1a237e 30%, #283593 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 150, 243, .3)'
          }}
        >
          <Toolbar>
            <Typography 
              variant="h6" 
              noWrap 
              component="div" 
              sx={{ 
                mr: 4,
                fontWeight: 'bold',
                letterSpacing: '0.5px',
                background: 'linear-gradient(45deg, #fff 30%, #e3f2fd 90%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              Task Manager
            </Typography>
            <Box sx={{ 
              display: 'flex', 
              gap: 1,
              '& .MuiIconButton-root': {
                color: 'rgba(255, 255, 255, 0.8)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  color: '#fff',
                  transform: 'translateY(-2px)',
                  background: 'rgba(255, 255, 255, 0.1)'
                },
                '&.active': {
                  color: '#fff',
                  background: 'rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 0 10px rgba(255, 255, 255, 0.3)'
                }
              }
            }}>
              <IconButton 
                className={viewMode === 'kanban' ? 'active' : ''}
                onClick={() => setViewMode('kanban')}
                title="Kanban View"
              >
                <DashboardIcon />
              </IconButton>
              <IconButton 
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <ListIcon />
              </IconButton>
              <IconButton 
                className={viewMode === 'calendar' ? 'active' : ''}
                onClick={() => setViewMode('calendar')}
                title="Calendar View"
              >
                <CalendarTodayIcon />
              </IconButton>
              <IconButton 
                className={viewMode === 'today' ? 'active' : ''}
                onClick={() => setViewMode('today')}
                title="Today's Tasks"
              >
                <EventIcon />
              </IconButton>
              <IconButton 
                className={viewMode === 'ultimate' ? 'active' : ''}
                onClick={() => setViewMode('ultimate')}
                title="Ultimate Board"
              >
                <StarIcon />
              </IconButton>
            </Box>
            <Box sx={{ flexGrow: 1 }} />
            {user && (
              <>
                <TextField
                  size="small"
                  variant="outlined"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <Box sx={{ display: 'flex', alignItems: 'center', color: 'inherit', pl: 1 }}>
                        <SearchIcon />
                      </Box>
                    ),
                    endAdornment: searchQuery && (
                      <IconButton
                        size="small"
                        onClick={() => setSearchQuery('')}
                        sx={{ color: 'inherit' }}
                      >
                        <ClearIcon />
                      </IconButton>
                    ),
                    sx: { 
                      color: 'inherit',
                      '& .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.3)',
                      },
                      '&:hover .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                      },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                        borderColor: 'primary.main',
                      }
                    }
                  }}
                  sx={{ 
                    mr: 2,
                    width: 200,
                    '& .MuiInputBase-root': {
                      color: 'inherit'
                    }
                  }}
                />
                {googleAccounts.length > 0 && <AccountSwitcher />}
              </>
            )}
            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, ml: 2 }}>
                <Avatar 
                  src={user.picture} 
                  alt={user.name}
                  sx={{
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 0 10px rgba(255, 255, 255, 0.2)'
                  }}
                />
                <Typography 
                  variant="body1"
                  sx={{
                    fontWeight: 500,
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
                  }}
                >
                  {user.name}
                </Typography>
                <IconButton 
                  color="inherit" 
                  onClick={handleLogout}
                  sx={{
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      transform: 'rotate(90deg)',
                      transition: 'all 0.3s ease'
                    }
                  }}
                >
                  <LogoutIcon />
                </IconButton>
              </Box>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
              />
            )}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
              <IconButton
                onClick={refreshTasks}
                disabled={isRefreshing}
                sx={{
                  color: 'inherit',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                  '&:hover': {
                    transform: 'rotate(180deg)',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  },
                  '&.Mui-disabled': {
                    color: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: -2,
                    left: -2,
                    right: -2,
                    bottom: -2,
                    borderRadius: '50%',
                    border: '2px solid',
                    borderColor: 'transparent',
                    transition: 'all 0.3s ease',
                  },
                  '&:hover::after': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  }
                }}
              >
                {isRefreshing ? (
                  <CircularProgress 
                    size={24} 
                    color="inherit"
                    sx={{
                      animation: 'spin 1s linear infinite',
                      '@keyframes spin': {
                        '0%': { transform: 'rotate(0deg)' },
                        '100%': { transform: 'rotate(360deg)' }
                      }
                    }}
                  />
                ) : (
                  <RefreshIcon />
                )}
              </IconButton>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: 'rgba(255, 255, 255, 0.7)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}
              >
                <Box 
                  component="span" 
                  sx={{ 
                    width: 8, 
                    height: 8, 
                    borderRadius: '50%', 
                    bgcolor: isRefreshing ? 'warning.main' : 'success.main',
                    transition: 'all 0.3s ease'
                  }} 
                />
                Last refresh: {format(lastRefreshTime, 'HH:mm:ss')}
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>
        
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: 3,
            width: '100%',
            mt: '64px',
          }}
        >
          {user ? (
            googleAccounts.length > 0 ? (
              isInitialLoad || googleTasksLoading ? (
                <Box sx={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center', 
                  height: 'calc(100vh - 100px)'
                }}>
                  <Typography variant="h6">Loading Google Tasks...</Typography>
                </Box>
              ) : (
                <>
                  {viewMode === 'list' && renderListView()}
                  {viewMode === 'calendar' && renderCalendarView()}
                  {viewMode === 'today' && renderTodayView()}
                  {viewMode === 'ultimate' && renderUltimateView()}
                  {viewMode === 'kanban' && renderKanbanView()}
                </>
              )
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Connect your Google Tasks account
                </Typography>
                <Typography color="text.secondary" paragraph>
                  To start managing your tasks, please connect your Google Tasks account.
                </Typography>
              </Box>
            )
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h5" gutterBottom>
                Welcome to GTaskALL
              </Typography>
              <Typography color="text.secondary" paragraph>
                Sign in to manage your tasks
              </Typography>
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
              />
            </Box>
          )}
        </Box>

        <Dialog open={openNewColumnDialog} onClose={() => setOpenNewColumnDialog(false)}>
          <DialogTitle>Add New Column</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Column Title"
              type="text"
              fullWidth
              variant="outlined"
              value={newColumnTitle}
              onChange={(e) => setNewColumnTitle(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNewColumnDialog(false)}>Cancel</Button>
            <Button onClick={handleAddColumn} variant="contained">
              Add
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={!!deleteColumnId}
          onClose={() => setDeleteColumnId(null)}
        >
          <DialogTitle>Delete Column</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to delete this column? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteColumnId(null)}>Cancel</Button>
            <Button onClick={() => handleDeleteColumn(deleteColumnId as string)} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={!!selectedTask}
          onClose={() => setSelectedTask(null)}
        >
          <DialogTitle>Set Due Date</DialogTitle>
          <DialogContent>
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Quick Select
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => selectedTask && handleQuickDateChange(selectedTask.task, selectedTask.columnId, new Date())}
                  sx={{ minWidth: '100px' }}
                >
                  Today
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => selectedTask && handleQuickDateChange(selectedTask.task, selectedTask.columnId, addDays(new Date(), 1))}
                  sx={{ minWidth: '100px' }}
                >
                  Tomorrow
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => selectedTask && handleQuickDateChange(selectedTask.task, selectedTask.columnId, addDays(new Date(), 7))}
                  sx={{ minWidth: '100px' }}
                >
                  Next Week
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => selectedTask && handleQuickDateChange(selectedTask.task, selectedTask.columnId, addDays(new Date(), 30))}
                  sx={{ minWidth: '100px' }}
                >
                  In a Month
                </Button>
              </Stack>
            </Box>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="Due Date"
                value={selectedTask?.task.dueDate || null}
                onChange={(date) => selectedTask && handleQuickDateChange(selectedTask.task, selectedTask.columnId, date)}
                slotProps={{
                  textField: {
                    fullWidth: true,
                    margin: 'normal',
                  },
                }}
              />
            </LocalizationProvider>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedTask(null)}>Cancel</Button>
            <Button 
              onClick={() => selectedTask && handleQuickDateChange(selectedTask.task, selectedTask.columnId, null)} 
              color="error"
            >
              Remove Date
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={selectedAccountForRemoval !== null}
          onClose={() => setSelectedAccountForRemoval(null)}
        >
          <DialogTitle>Remove Account</DialogTitle>
          <DialogContent>
            <Typography>
              Are you sure you want to remove this Google Tasks account? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedAccountForRemoval(null)}>Cancel</Button>
            <Button 
              onClick={() => selectedAccountForRemoval !== null && handleRemoveAccount(selectedAccountForRemoval)} 
              color="error" 
              variant="contained"
            >
              Remove
            </Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={openAccountDialog}
          onClose={() => setOpenAccountDialog(false)}
        >
          <DialogTitle>Add Google Tasks Account</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Connect another Google account to manage its tasks.
            </Typography>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAccountDialog(false)}>Cancel</Button>
          </DialogActions>
        </Dialog>

        <Dialog
          open={!!editingTask}
          onClose={() => {
            setEditingTask(null);
            setEditTaskForm({
              content: '',
              notes: '',
              color: '#1976d2',
              dueDate: null,
              isRecurring: false
            });
          }}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Task</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Task Title"
                value={editTaskForm.content}
                onChange={(e) => setEditTaskForm(prev => ({ ...prev, content: e.target.value }))}
                fullWidth
                multiline
                rows={2}
                error={!editTaskForm.content.trim()}
                helperText={!editTaskForm.content.trim() ? "Task title is required" : ""}
                autoFocus
              />
              <TextField
                label="Notes"
                value={editTaskForm.notes}
                onChange={(e) => setEditTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                fullWidth
                multiline
                rows={4}
              />
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Due Date"
                  value={editTaskForm.dueDate}
                  onChange={(date) => setEditTaskForm(prev => ({ ...prev, dueDate: date }))}
                  slotProps={{
                    textField: {
                      fullWidth: true,
                    },
                  }}
                />
              </LocalizationProvider>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="body2">Color:</Typography>
                <input
                  type="color"
                  value={editTaskForm.color}
                  onChange={(e) => setEditTaskForm(prev => ({ ...prev, color: e.target.value }))}
                  style={{ width: '50px', height: '30px' }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox
                  checked={editTaskForm.isRecurring}
                  onChange={(e) => setEditTaskForm(prev => ({ ...prev, isRecurring: e.target.checked }))}
                />
                <Typography variant="body2">Recurring Task</Typography>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setEditingTask(null);
                setEditTaskForm({
                  content: '',
                  notes: '',
                  color: '#1976d2',
                  dueDate: null,
                  isRecurring: false
                });
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSaveTaskEdit} 
              variant="contained" 
              color="primary"
              disabled={!editTaskForm.content.trim()}
            >
              Save Changes
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </GoogleOAuthProvider>
  );
}

export default App;
