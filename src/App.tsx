import { useState, useEffect } from 'react';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Paper, Stack, Avatar, Divider, Select, MenuItem, Chip, Grid, Checkbox } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, addDays, isToday, isSameDay, startOfDay, endOfDay, isYesterday, isTomorrow, differenceInDays, startOfWeek, endOfWeek, isThisWeek, addWeeks } from 'date-fns';
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
import { apiService } from './api';
import TaskRow from './TaskRow.tsx';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';

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
type ViewMode = 'kanban' | 'list' | 'calendar' | 'today' | 'ultimate' | 'upcoming';

// Add this type at the top with other interfaces
type Timeout = ReturnType<typeof setTimeout>;

interface EditTaskForm {
  content: string;
  notes: string;
  color: string;
  dueDate: Date | null;
  isRecurring: boolean;
}

interface DateSection {
  id: string;
  title: string;
  tasks: Task[];
  date: Date | null;
  type: 'today' | 'tomorrow' | 'this-week' | 'next-week' | 'overdue' | 'no-date' | 'future';
}

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(true);
  const [doneTasksLimit, setDoneTasksLimit] = useState(3);
  const [dateGroupingEnabled, setDateGroupingEnabled] = useState(true);
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
  const [openNewTaskDialog, setOpenNewTaskDialog] = useState(false);
  const [newTaskForm, setNewTaskForm] = useState<EditTaskForm>({
    content: '',
    notes: '',
    color: '#1976d2',
    dueDate: null,
    isRecurring: false
  });
  const [selectedListForNewTask, setSelectedListForNewTask] = useState<string>('');
  const [tempUserData, setTempUserData] = useState<User | null>(null);
  const [calendarShowAll, setCalendarShowAll] = useState(false);

  // Color coding for different accounts - moved to global scope
  const getAccountColor = (accountEmail: string) => {
    switch (accountEmail) {
      case 'beny18241@gmail.com':
        return '#2196F3'; // Blue
      case 'pindelaMaciej@gmail.com':
        return '#E91E63'; // Pink
      case 'maciejpindela@whitehatgmiang':
        return '#4CAF50'; // Green
      default:
        return '#9C27B0'; // Purple for any other accounts
    }
  };

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
        localStorage.setItem('google-credential', savedCredential);
        
        // Load saved Google Tasks connections from database
        loadSavedConnections(userData.email);
      } catch (error) {
        console.error('Error restoring user session:', error);
        localStorage.removeItem('google-credential');
        setIsInitialLoad(false);
      }
    } else {
      // No saved credential, set initial load to false immediately
      setIsInitialLoad(false);
    }
  }, []);

  // Function to load saved connections from database
  const loadSavedConnections = async (mainUserEmail: string) => {
    try {
      const connections = await apiService.getConnections(mainUserEmail);
      
      if (connections.length > 0) {
        // Convert saved connections to GoogleAccount format
        const savedAccounts: GoogleAccount[] = [];
        
        for (const connection of connections) {
          // Try to get the stored token
          const token = await apiService.getToken(mainUserEmail, connection.gtask_account_email);
          
          if (token) {
            // Test if the token is still valid by making a simple API call
            try {
              const testResponse = await axios.get('https://www.googleapis.com/tasks/v1/users/@me/lists', {
                headers: { Authorization: `Bearer ${token}` }
              });
              
              // If the API call succeeds, the token is valid
              savedAccounts.push({
                user: {
                  name: connection.gtask_account_name,
                  email: connection.gtask_account_email,
                  picture: connection.gtask_account_picture
                },
                token: token,
                taskLists: [],
                tasks: {}
              });
            } catch (error) {
              console.log(`Token for ${connection.gtask_account_email} is expired, will need to reconnect`);
              // Remove expired token from database
              try {
                await apiService.removeConnection(mainUserEmail, connection.gtask_account_email);
              } catch (removeError) {
                console.error('Error removing expired connection:', removeError);
              }
            }
          }
        }
        
        if (savedAccounts.length > 0) {
          setGoogleAccounts(savedAccounts);
          setActiveAccountIndex(0);
        } else {
          // No valid connections found, set initial load to false
          setIsInitialLoad(false);
        }
      } else {
        // No connections found, set initial load to false
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error('Error loading saved connections:', error);
      // Set initial load to false even if there's an error
      setIsInitialLoad(false);
    }
  };

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
      
      // Load saved Google Tasks connections from database
      await loadSavedConnections(userData.email);
    } catch (error) {
      console.error('Error during login:', error);
      setIsInitialLoad(false);
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

        // Save connection to database with access token (we'll handle refresh later)
        try {
          await apiService.addConnection(
            user.email,
            user.email,
            user.name,
            user.picture,
            tokenResponse.access_token
          );
        } catch (error) {
          console.error('Error saving connection to database:', error);
        }

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

  const loginGoogleTasksForNewAccount = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/tasks',
    onSuccess: async (tokenResponse) => {
      try {
        if (!tempUserData) {
          throw new Error('No user data available');
        }

        if (!user) {
          throw new Error('Main user not logged in');
        }

        const newAccount: GoogleAccount = {
          user: tempUserData,
          token: tokenResponse.access_token,
          taskLists: [],
          tasks: {}
        };

        // Save connection to database
        try {
          await apiService.addConnection(
            user.email, // main user email
            tempUserData.email, // Google Tasks account email
            tempUserData.name,
            tempUserData.picture,
            tokenResponse.access_token
          );
        } catch (error) {
          console.error('Error saving connection to database:', error);
        }

        setGoogleAccounts(prevAccounts => [...prevAccounts, newAccount]);
        setActiveAccountIndex(googleAccounts.length);
        setGoogleTasksLoading(false);
        setOpenAccountDialog(false);
        setTempUserData(null); // Clear temporary data
      } catch (error) {
        console.error('Error adding Google Tasks account:', error);
        setGoogleTasksLoading(false);
        setTempUserData(null);
      }
    },
    onError: () => {
      setGoogleTasksLoading(false);
      setTempUserData(null);
      alert('Google Tasks connection failed.');
    },
    flow: 'implicit',
  });

  const handleRemoveAccount = async (index: number) => {
    if (!user) return;

    const accountToRemove = googleAccounts[index];
    
    try {
      // Remove from database
      await apiService.removeConnection(user.email, accountToRemove.user.email);
    } catch (error) {
      console.error('Error removing connection from database:', error);
    }

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
        <Avatar
          key={account.user.email}
          src={account.user.picture}
          alt={account.user.name}
          onClick={() => setActiveAccountIndex(index)}
          sx={{
            width: 28,
            height: 28,
            cursor: 'pointer',
            border: index === activeAccountIndex ? '2px solid #fff' : '2px solid rgba(255, 255, 255, 0.3)',
            '&:hover': {
              opacity: 0.8,
              transform: 'scale(1.1)',
              transition: 'all 0.2s ease'
            }
          }}
          title={`${account.user.name} (${account.user.email})`}
        />
      ))}
      <IconButton
        size="small"
        color="primary"
        onClick={() => setOpenAccountDialog(true)}
        sx={{
          width: 28,
          height: 28,
          border: '1px dashed',
          borderColor: 'rgba(255, 255, 255, 0.5)',
          color: 'rgba(255, 255, 255, 0.8)',
          '&:hover': {
            backgroundColor: 'rgba(255, 255, 255, 0.1)',
            color: 'white',
            borderColor: 'white'
          }
        }}
        title="Add Account"
      >
        <AddIcon fontSize="small" />
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
          updateColumnsWithTasks(tasksByList);
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

  const handleConnectGoogleTasks = () => {
    setGoogleTasksLoading(true);
    loginGoogleTasks();
  };

  const handleAddGoogleTasksAccount = () => {
    setOpenAccountDialog(true);
  };

  const handleAddGoogleTasksAccountSuccess = async (credentialResponse: any) => {
    try {
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const userData = {
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
      };

      // Store the user data temporarily and trigger the Google Tasks login
      setTempUserData(userData);
      setGoogleTasksLoading(true);
      loginGoogleTasksForNewAccount();
    } catch (error) {
      console.error('Error during Google Tasks account addition:', error);
      setGoogleTasksLoading(false);
      setTempUserData(null);
    }
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

  const handleCreateNewTask = async () => {
    if (!newTaskForm.content.trim() || !selectedListForNewTask) return;

    try {
      // Create task in Google Tasks
      if (googleAccounts.length > 0) {
        // Prepare the task data
        const taskData: any = {
          title: newTaskForm.content,
          notes: newTaskForm.notes || '',
          due: newTaskForm.dueDate ? newTaskForm.dueDate.toISOString() : null
        };

        // Add color to notes if specified
        if (newTaskForm.color) {
          const colorHex = newTaskForm.color.replace('#', '');
          taskData.notes = `${taskData.notes}\n#${colorHex}`;
        }

        // Add recurring status to notes
        if (newTaskForm.isRecurring) {
          taskData.notes = `${taskData.notes}\n🔄 Recurring`;
        }

        // Create the task in Google Tasks
        const response = await axios.post(
          `https://www.googleapis.com/tasks/v1/lists/${selectedListForNewTask}/tasks`,
          taskData,
          {
            headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` }
          }
        );

        // Add account info to the new task
        const newTaskWithAccount = {
          ...response.data,
          accountEmail: googleAccounts[activeAccountIndex].user.email,
          accountName: googleAccounts[activeAccountIndex].user.name,
          accountPicture: googleAccounts[activeAccountIndex].user.picture
        };

        // Update the local Google Tasks state
        setGoogleAccounts(prevAccounts => {
          const newAccounts = [...prevAccounts];
          if (newAccounts[activeAccountIndex].tasks[selectedListForNewTask]) {
            newAccounts[activeAccountIndex].tasks[selectedListForNewTask] = [
              ...newAccounts[activeAccountIndex].tasks[selectedListForNewTask],
              newTaskWithAccount
            ];
          } else {
            newAccounts[activeAccountIndex].tasks[selectedListForNewTask] = [newTaskWithAccount];
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
      }

      // Reset form and close dialog
      setNewTaskForm({
        content: '',
        notes: '',
        color: '#1976d2',
        dueDate: null,
        isRecurring: false
      });
      setSelectedListForNewTask('');
      setOpenNewTaskDialog(false);
    } catch (error) {
      console.error('Error creating new task:', error);
      alert('Failed to create new task. Please try again.');
    }
  };

  const renderTask = (task: Task, columnId: string) => {
    const isNoTask = task.id === 'no-tasks';
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    const isDoneColumn = columnId === 'done';
    
    return (
      <Paper 
        key={task.id}
        className="task-card"
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
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant={calendarShowAll ? 'contained' : 'outlined'}
              color="primary"
              size="small"
              onClick={() => setCalendarShowAll(true)}
            >
              All
            </Button>
            <Button
              variant={!calendarShowAll ? 'contained' : 'outlined'}
              color="primary"
              size="small"
              onClick={() => setCalendarShowAll(false)}
            >
              Day
            </Button>
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
                disabled={calendarShowAll}
            />
          </LocalizationProvider>
          </Box>
        </Box>
        <Paper sx={{ p: 2 }}>
          {calendarShowAll ? (
            <>
          <Typography variant="h6" gutterBottom>
                All Tasks
          </Typography>
              <Box sx={{ bgcolor: 'white', borderRadius: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                {filteredTasks.length === 0 ? (
                  <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                    No tasks scheduled
                    </Typography>
                ) : (
                  filteredTasks.map((task, index) => {
                    const accountColor = task.accountEmail ? getAccountColor(task.accountEmail) : '#9C27B0';
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        accountColor={accountColor}
                        showDivider={index < filteredTasks.length - 1}
                        onEdit={() => handleEditTask(task, task.listId || 'todo')}
                      />
                    );
                  })
                  )}
                </Box>
            </>
          ) : (
            <>
              <Typography variant="h6" gutterBottom>
                {format(selectedDate, 'MMMM d, yyyy')}
              </Typography>
              <Box sx={{ bgcolor: 'white', borderRadius: 1.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', overflow: 'hidden' }}>
                {(tasksByDate[format(selectedDate, 'yyyy-MM-dd')] || []).length === 0 ? (
              <Typography color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                No tasks scheduled for this date
              </Typography>
                ) : (
                  (tasksByDate[format(selectedDate, 'yyyy-MM-dd')] || []).map((task, index, arr) => {
                    const accountColor = task.accountEmail ? getAccountColor(task.accountEmail) : '#9C27B0';
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        accountColor={accountColor}
                        showDivider={index < arr.length - 1}
                        onEdit={() => handleEditTask(task, task.listId || 'todo')}
                      />
                    );
                  })
                )}
              </Box>
            </>
          )}
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

    // Get account icon based on email
    const getAccountIcon = (accountEmail: string) => {
      if (accountEmail.includes('beny18241')) return '👨‍💻';
      if (accountEmail.includes('pindelaMaciej')) return '👨‍💼';
      if (accountEmail.includes('whitehatgmiang')) return '🎯';
      return '👤'; // Default icon
    };

    return (
      <Box sx={{ p: 2, maxWidth: '1000px', mx: 'auto' }}>
        <Box sx={{ 
          mb: 2, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 2,
          p: 2,
              color: 'white',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 0.5 }}>
            Today's Tasks
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.9 }}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} for today
        </Typography>
        </Box>

        {filteredTasks.length === 0 ? (
          <Box sx={{ 
            p: 3, 
            textAlign: 'center',
            background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
            borderRadius: 2
          }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              🎉 No tasks for today!
          </Typography>
            <Typography variant="body2" color="text.secondary">
              You're all caught up. Enjoy your day!
            </Typography>
      </Box>
        ) : (
          <Box sx={{ 
            bgcolor: 'white', 
            borderRadius: 1.5,
            boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
            overflow: 'hidden'
          }}>
            {filteredTasks.map((task, index) => {
              const accountColor = task.accountEmail ? getAccountColor(task.accountEmail) : '#9C27B0';
              return (
                <TaskRow
                  key={task.id}
                  task={task}
                  accountColor={accountColor}
                  showDivider={index < filteredTasks.length - 1}
                  onEdit={() => handleEditTask(task, task.listId || 'todo')}
                />
              );
            })}
          </Box>
        )}

        {/* Progress Summary - Compact */}
        {filteredTasks.length > 0 && (
    <Box sx={{ 
            mt: 1.5, 
      p: 1.5,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
            borderRadius: 1.5
        }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                Progress: {filteredTasks.filter(t => t.status === 'completed').length} of {filteredTasks.length} completed
        </Typography>
              <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                {Math.round((filteredTasks.filter(t => t.status === 'completed').length / filteredTasks.length) * 100)}%
      </Typography>
      </Box>
            <Box sx={{ 
              mt: 0.75, 
              height: 3, 
              bgcolor: 'rgba(255,255,255,0.2)', 
              borderRadius: 1.5,
              overflow: 'hidden'
            }}>
              <Box sx={{ 
                height: '100%', 
                bgcolor: 'white',
                width: `${(filteredTasks.filter(t => t.status === 'completed').length / filteredTasks.length) * 100}%`,
                transition: 'width 0.3s ease'
              }} />
    </Box>
              </Box>
        )}
      </Box>
    );
  };

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

  const renderUpcomingView = () => {
    // Get all tasks from all columns
    const allTasks = columns.reduce((acc: Task[], column) => {
      return [...acc, ...column.tasks];
    }, []);

    // Filter tasks that have due dates and are not completed
    const upcomingTasks = allTasks.filter(task => 
      task.dueDate && 
      task.status !== 'completed' &&
      new Date(task.dueDate) >= startOfDay(new Date())
    );

    // Group tasks by due date
    const tasksByDate = upcomingTasks.reduce((acc: { [key: string]: Task[] }, task) => {
      const dateKey = format(new Date(task.dueDate!), 'yyyy-MM-dd');
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(task);
      return acc;
    }, {});

    // Create date columns for the next 7 days
    const dateColumns: { id: string; title: string; date: Date; tasks: Task[] }[] = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(new Date(), i);
      const dateKey = format(date, 'yyyy-MM-dd');
      const tasks = tasksByDate[dateKey] || [];
      
      dateColumns.push({
        id: dateKey,
        title: format(date, 'EEE, MMM d'),
        date,
        tasks: tasks.sort((a, b) => a.content.localeCompare(b.content))
      });
    }

    return (
      <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
        {dateColumns.map((dateColumn) => (
          <Paper
            key={dateColumn.id}
            sx={{
              minWidth: 300,
              maxWidth: 350,
              height: 'calc(100vh - 120px)',
              display: 'flex',
              flexDirection: 'column',
              bgcolor: isToday(dateColumn.date) ? '#fff3e0' : '#fafafa',
              border: isToday(dateColumn.date) ? '2px solid #ff9800' : '1px solid #e0e0e0',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            {/* Column Header */}
            <Box
              sx={{
                p: 2,
                bgcolor: isToday(dateColumn.date) ? '#ff9800' : '#f5f5f5',
                color: isToday(dateColumn.date) ? 'white' : 'text.primary',
                borderBottom: '1px solid',
                borderColor: 'divider',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  fontSize: '1rem',
                  textTransform: 'capitalize'
                }}
              >
                {dateColumn.title}
              </Typography>
              <Chip
                label={dateColumn.tasks.length}
                size="small"
                sx={{
                  bgcolor: isToday(dateColumn.date) ? 'rgba(255,255,255,0.2)' : 'primary.main',
                  color: isToday(dateColumn.date) ? 'white' : 'white',
                  fontWeight: 'bold'
                }}
              />
            </Box>

            {/* Tasks Container */}
            <Box
              sx={{
                flex: 1,
                overflow: 'auto',
                p: 1
              }}
            >
              {dateColumn.tasks.length === 0 ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100px',
                    color: 'text.secondary',
                    fontStyle: 'italic'
                  }}
                >
                  No tasks
                </Box>
              ) : (
                <Stack spacing={1}>
                  {dateColumn.tasks.map((task) => (
                    <Paper
                      key={task.id}
                      sx={{
                        p: 1.5,
                        cursor: 'pointer',
                        borderLeft: `4px solid ${task.color || '#42A5F5'}`,
                        bgcolor: 'white',
                        '&:hover': {
                          boxShadow: 2,
                          transform: 'translateY(-1px)',
                          transition: 'all 0.2s ease'
                        }
                      }}
                      onClick={() => handleEditTask(task, 'upcoming')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                        <Checkbox
                          checked={task.status === 'completed'}
                          onChange={(e) => handleTaskCompletionToggle(task, e.target.checked)}
                          size="small"
                          sx={{ mt: 0.5 }}
                        />
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 500,
                              textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                              color: task.status === 'completed' ? 'text.secondary' : 'text.primary',
                              wordBreak: 'break-word'
                            }}
                          >
                            {task.content}
                          </Typography>
                          {task.notes && (
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'text.secondary',
                                display: 'block',
                                mt: 0.5,
                                wordBreak: 'break-word'
                              }}
                            >
                              {task.notes}
                            </Typography>
                          )}
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                            <Chip
                              label={task.status === 'in-progress' ? 'In Progress' : task.status === 'completed' ? 'Done' : 'To Do'}
                              color={task.status === 'in-progress' ? 'warning' : task.status === 'completed' ? 'success' : 'info'}
                              size="small"
                              sx={{ height: '20px', fontSize: '0.7rem' }}
                            />
                            {task.accountEmail && (
                              <Avatar
                                src={task.accountPicture}
                                alt={task.accountName}
                                sx={{
                                  width: 20,
                                  height: 20,
                                  fontSize: '0.7rem',
                                  bgcolor: getAccountColor(task.accountEmail)
                                }}
                              >
                                {task.accountName?.charAt(0)}
                              </Avatar>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Stack>
              )}
            </Box>
          </Paper>
        ))}
      </Box>
    );
  };

  // Helper function to update columns with tasks from Google Tasks
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

      // Fetch tasks for all accounts (not just the active one)
      const allTasksPromises = googleAccounts.map(async (account, index) => {
        try {
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
        } catch (error: any) {
          // Handle expired token
          if (error.response?.status === 401) {
            console.log(`Token for ${account.user.email} is expired`);
            // Remove the account from the list
            setGoogleAccounts(prevAccounts => prevAccounts.filter((_, i) => i !== index));
            
            // Remove from database
            if (user) {
              try {
                await apiService.removeConnection(user.email, account.user.email);
              } catch (removeError) {
                console.error('Error removing expired connection:', removeError);
              }
            }
            
            return null;
          }
          throw error;
        }
      });

      const allResults = await Promise.all(allTasksPromises);
      const validResults = allResults.filter(result => result !== null);
      
      if (validResults.length === 0) {
        // All tokens are expired
        setGoogleAccounts([]);
        setIsRefreshing(false);
        return;
      }
      
      // Update all accounts with their tasks
      setGoogleAccounts(prevAccounts => {
        const newAccounts = [...prevAccounts];
        validResults.forEach(({ accountIndex, tasksByList }) => {
          if (newAccounts[accountIndex]) {
            newAccounts[accountIndex] = {
              ...newAccounts[accountIndex],
              tasks: tasksByList
            };
          }
        });
        return newAccounts;
      });

      // Combine tasks from all accounts
      const combinedTasksByList: { [listId: string]: any[] } = {};
      validResults.forEach(({ tasksByList }) => {
        Object.entries(tasksByList).forEach(([listId, tasks]) => {
          if (!combinedTasksByList[listId]) {
            combinedTasksByList[listId] = [];
          }
          combinedTasksByList[listId] = [...combinedTasksByList[listId], ...tasks];
        });
      });

      // Update columns with the combined tasks
      updateColumnsWithTasks(combinedTasksByList);
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

  const handleTaskCompletionToggle = async (task: Task, isCompleted: boolean) => {
    // Update local state first
    setColumns(prevColumns => {
      return prevColumns.map(column => {
        return {
          ...column,
          tasks: column.tasks.map(t => 
            t.id === task.id 
              ? { 
                  ...t, 
                  status: isCompleted ? 'completed' as const : 'todo' as const,
                  completedAt: isCompleted ? new Date() : null
                }
              : t
          )
        };
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
          const foundTask = tasks.find(t => t.id === task.id);
          if (foundTask) {
            taskListId = listId;
            taskId = foundTask.id;
            break;
          }
        }

        if (taskListId && taskId) {
          // Prepare the update
          const update: any = {};
          
          if (isCompleted) {
            // Mark as completed
            update.completed = new Date().toISOString();
            update.status = 'completed';
          } else {
            // Mark as not completed
            update.completed = null;
            update.status = 'needsAction';
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
        }
      } catch (error) {
        console.error('Error updating task completion in Google Tasks:', error);
        // Revert local state if Google Tasks update fails
        setColumns(prevColumns => {
          return prevColumns.map(column => {
            return {
              ...column,
              tasks: column.tasks.map(t => 
                t.id === task.id ? task : t
              )
            };
          });
        });
      }
    }
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

  // Helper function to get date section for a task
  const getDateSection = (task: Task): DateSection => {
    if (!task.dueDate) {
      return {
        id: 'no-date',
        title: 'No Due Date',
        tasks: [],
        date: null,
        type: 'no-date'
      };
    }

    const dueDate = new Date(task.dueDate);
    const today = new Date();
    const daysDiff = differenceInDays(dueDate, today);

    if (daysDiff < 0) {
      return {
        id: 'overdue',
        title: 'Overdue',
        tasks: [],
        date: dueDate,
        type: 'overdue'
      };
    } else if (isToday(dueDate)) {
      return {
        id: 'today',
        title: 'Today',
        tasks: [],
        date: dueDate,
        type: 'today'
      };
    } else if (isTomorrow(dueDate)) {
      return {
        id: 'tomorrow',
        title: 'Tomorrow',
        tasks: [],
        date: dueDate,
        type: 'tomorrow'
      };
    } else if (isThisWeek(dueDate)) {
      return {
        id: 'this-week',
        title: 'This Week',
        tasks: [],
        date: dueDate,
        type: 'this-week'
      };
    } else if (daysDiff <= 14) {
      return {
        id: 'next-week',
        title: 'Next Week',
        tasks: [],
        date: dueDate,
        type: 'next-week'
      };
    } else {
      return {
        id: 'future',
        title: 'Future',
        tasks: [],
        date: dueDate,
        type: 'future'
      };
    }
  };

  // Helper function to group tasks by date sections
  const groupTasksByDate = (tasks: Task[]): DateSection[] => {
    const sections: { [key: string]: DateSection } = {};
    
    tasks.forEach(task => {
      const section = getDateSection(task);
      if (!sections[section.id]) {
        sections[section.id] = { ...section, tasks: [] };
      }
      sections[section.id].tasks.push(task);
    });

    // Sort sections in order: overdue, today, tomorrow, this-week, next-week, future, no-date
    const sectionOrder = ['overdue', 'today', 'tomorrow', 'this-week', 'next-week', 'future', 'no-date'];
    
    return sectionOrder
      .map(id => sections[id])
      .filter(section => section && section.tasks.length > 0);
  };

  // Helper function to render date section header
  const renderDateSectionHeader = (section: DateSection) => {
    const getSectionColor = (type: DateSection['type']) => {
      switch (type) {
        case 'overdue': return 'error.main';
        case 'today': return 'success.main';
        case 'tomorrow': return 'warning.main';
        case 'this-week': return 'info.main';
        case 'next-week': return 'primary.main';
        case 'future': return 'grey.600';
        case 'no-date': return 'grey.500';
        default: return 'grey.500';
      }
    };

    return (
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1,
          mb: 1,
          borderRadius: 1,
          bgcolor: `${getSectionColor(section.type)}15`,
          border: `1px solid ${getSectionColor(section.type)}30`,
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}
      >
        <Typography
          variant="subtitle2"
          sx={{
            fontWeight: 600,
            color: getSectionColor(section.type),
            display: 'flex',
            alignItems: 'center',
            gap: 1
          }}
        >
          {section.title}
          <Typography
            variant="caption"
            sx={{
              bgcolor: getSectionColor(section.type),
              color: 'white',
              px: 0.5,
              py: 0.25,
              borderRadius: 0.5,
              fontSize: '0.7rem'
            }}
          >
            {section.tasks.length}
          </Typography>
        </Typography>
        {section.date && (
          <Typography
            variant="caption"
            sx={{
              color: 'text.secondary',
              fontSize: '0.7rem'
            }}
          >
            {format(section.date, 'MMM d')}
          </Typography>
        )}
      </Box>
    );
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {(column.id === 'todo' || column.id === 'inProgress') && (
          <IconButton
            size="small"
            onClick={() => setDateGroupingEnabled(!dateGroupingEnabled)}
            sx={{
              color: dateGroupingEnabled ? 'primary.main' : 'text.secondary',
              '&:hover': {
                backgroundColor: 'primary.light',
                color: 'white',
              },
            }}
            title={dateGroupingEnabled ? 'Disable date grouping' : 'Enable date grouping'}
          >
            <CalendarTodayIcon fontSize="small" />
          </IconButton>
        )}
        {column.id === 'done' && (
          <>
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
          </>
        )}
      </Box>
    </Box>
  );

  const renderColumn = (column: Column) => {
    // Apply limit for done column
    const displayTasks = column.id === 'done' ? 
      (column.limit && column.limit > 0 ? column.tasks.slice(0, column.limit) : 
       column.limit === -1 ? column.tasks : column.tasks.slice(0, 3)) : 
      column.tasks;

    const filteredTasks = filterTasks(displayTasks);

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
        
        {dateGroupingEnabled && column.id !== 'done' ? (
          // Render with date sections
          <Stack spacing={2}>
            {groupTasksByDate(filteredTasks).map((section) => (
              <Box key={section.id}>
                {renderDateSectionHeader(section)}
                <Stack spacing={1} sx={{ pl: 1 }}>
                  {section.tasks.map((task) => renderTask(task, column.id))}
                </Stack>
              </Box>
            ))}
          </Stack>
        ) : (
          // Render without date sections (original behavior)
          <Stack spacing={2}>
            {filteredTasks.map((task, taskIndex) => (
              renderTask(task, column.id)
            ))}
          </Stack>
        )}
      </Paper>
    );
  };

  const renderKanbanView = () => (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
      {columns.map(column => renderColumn(column))}
    </Box>
  );

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
            {/* Logo and Title */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              mr: 3,
              color: '#4CAF50',
              fontSize: '2rem'
            }}>
              ✓
            </Box>
            <Typography 
              variant="h6" 
              sx={{ 
                color: 'white',
                fontWeight: 600,
                letterSpacing: 1,
                textShadow: '0 2px 4px rgba(0,0,0,0.3)',
                mr: 3
              }}
            >
              GTask ALL
            </Typography>

            {/* View Mode Buttons */}
            <Box sx={{ 
              display: 'flex', 
              gap: 0.5,
              '& .MuiIconButton-root': {
                color: 'rgba(255, 255, 255, 0.8)',
                transition: 'all 0.3s ease',
                padding: '8px',
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
                <DashboardIcon fontSize="small" />
              </IconButton>
              <IconButton 
                className={viewMode === 'list' ? 'active' : ''}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                <ListIcon fontSize="small" />
              </IconButton>
              <IconButton 
                className={viewMode === 'calendar' ? 'active' : ''}
                onClick={() => setViewMode('calendar')}
                title="Calendar View"
              >
                <CalendarTodayIcon fontSize="small" />
              </IconButton>
              <IconButton 
                className={viewMode === 'today' ? 'active' : ''}
                onClick={() => setViewMode('today')}
                title="Today's Tasks"
              >
                <EventIcon fontSize="small" />
              </IconButton>
              <IconButton 
                className={viewMode === 'ultimate' ? 'active' : ''}
                onClick={() => setViewMode('ultimate')}
                title="Ultimate Board"
              >
                <StarIcon fontSize="small" />
              </IconButton>
              <IconButton 
                className={viewMode === 'upcoming' ? 'active' : ''}
                onClick={() => setViewMode('upcoming')}
                title="Upcoming Tasks"
              >
                <ScheduleIcon fontSize="small" />
              </IconButton>
            </Box>

            {/* Spacer before search */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Centered Search Field */}
            <TextField
              size="small"
              variant="outlined"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <Box sx={{ display: 'flex', alignItems: 'center', color: 'inherit', pl: 1 }}>
                    <SearchIcon fontSize="small" />
                  </Box>
                ),
                endAdornment: searchQuery && (
                  <IconButton
                    size="small"
                    onClick={() => setSearchQuery('')}
                    sx={{ color: 'inherit' }}
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                ),
                sx: { 
                  color: 'inherit',
                  fontSize: '0.95rem',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.5)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'white',
                  }
                }
              }}
              sx={{ 
                width: 400,
                mx: 3,
                '& .MuiInputBase-root': {
                  color: 'inherit'
                }
              }}
            />

            {/* Spacer after search */}
            <Box sx={{ flexGrow: 1 }} />

            {/* Google Tasks Accounts Section */}
            {googleAccounts.length > 0 && (
              <Box sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: 'rgba(255,255,255,0.08)',
                px: 1.5,
                py: 0.5,
                borderRadius: 2,
                boxShadow: 1,
                ml: 2,
                mr: 2,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.15)'
              }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
                  <AccountCircleIcon sx={{ color: 'primary.light', fontSize: 22, mr: 0.5 }} />
                  <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500, letterSpacing: 0.5 }}>Accounts</span>
                </Box>
                <AccountSwitcher />
              </Box>
            )}

            {/* Divider between accounts and user */}
            <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: 'rgba(255,255,255,0.15)' }} />

            {/* User/Login Section */}
            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 1 }}>
                <IconButton
                  onClick={refreshTasks}
                  disabled={isRefreshing}
                  size="small"
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    bgcolor: isRefreshing ? 'warning.main' : 'success.main',
                    color: 'white',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 0 8px rgba(255, 255, 255, 0.3)',
                    '&:hover': {
                      transform: 'rotate(180deg)',
                      backgroundColor: isRefreshing ? 'warning.dark' : 'success.dark',
                      boxShadow: '0 0 12px rgba(255, 255, 255, 0.5)',
                    },
                    '&.Mui-disabled': {
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      color: 'rgba(255, 255, 255, 0.5)',
                    }
                  }}
                  title="Refresh Tasks"
                >
                  {isRefreshing ? (
                    <CircularProgress 
                      size={16} 
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
                    <RefreshIcon fontSize="small" />
                  )}
                </IconButton>
                <Avatar 
                  src={user.picture} 
                  alt={user.name}
                  sx={{
                    width: 32,
                    height: 32,
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    boxShadow: '0 0 8px rgba(255, 255, 255, 0.2)'
                  }}
                  title={user.name}
                />
                <IconButton 
                  color="inherit" 
                  onClick={handleLogout}
                  size="small"
                  sx={{
                    '&:hover': {
                      background: 'rgba(255, 255, 255, 0.1)',
                      transform: 'rotate(90deg)',
                      transition: 'all 0.3s ease'
                    }
                  }}
                  title="Logout"
                >
                  <LogoutIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
              />
            )}
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
                  {viewMode === 'upcoming' && renderUpcomingView()}
                </>
              )
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="h5" gutterBottom>
                  Welcome, {user.name}!
                </Typography>
                <Typography color="text.secondary" paragraph>
                  You're logged in as {user.email}. To start managing your tasks, please connect your Google Tasks account.
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                  onClick={handleConnectGoogleTasks}
                  disabled={googleTasksLoading}
                  startIcon={googleTasksLoading ? <CircularProgress size={20} /> : null}
                  sx={{ 
                    mt: 2,
                    px: 4,
                    py: 1.5,
                    fontSize: '1.1rem',
                    borderRadius: 2,
                    boxShadow: 3,
                    '&:hover': {
                      boxShadow: 6,
                      transform: 'translateY(-2px)',
                    }
                  }}
                >
                  {googleTasksLoading ? 'Connecting...' : 'Connect Google Tasks'}
                </Button>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                  This will allow you to view and manage your Google Tasks in this application.
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

        {/* Floating Action Button to add new task */}
        {user && googleAccounts.length > 0 && (
          <Box sx={{ position: 'fixed', bottom: 32, right: 32, zIndex: 2000 }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              sx={{ borderRadius: '50%', minWidth: 64, minHeight: 64, fontSize: 32, boxShadow: 6 }}
              onClick={() => setOpenNewTaskDialog(true)}
              title="Add New Task"
            >
              {/* Hide text for round FAB */}
            </Button>
          </Box>
        )}

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
              Connect another Google account to manage its tasks. This will add the account's tasks to your board alongside your existing tasks.
            </Typography>
            <GoogleLogin
              onSuccess={handleAddGoogleTasksAccountSuccess}
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

        {/* Add New Task Dialog */}
        <Dialog
          open={openNewTaskDialog}
          onClose={() => setOpenNewTaskDialog(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Add New Task</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField
                label="Task Title"
                value={newTaskForm.content}
                onChange={(e) => setNewTaskForm(prev => ({ ...prev, content: e.target.value }))}
                fullWidth
                multiline
                rows={2}
                error={!newTaskForm.content.trim()}
                helperText={!newTaskForm.content.trim() ? "Task title is required" : ""}
                autoFocus
              />
              <TextField
                label="Notes"
                value={newTaskForm.notes}
                onChange={(e) => setNewTaskForm(prev => ({ ...prev, notes: e.target.value }))}
                fullWidth
                multiline
                rows={4}
              />
              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Due Date"
                  value={newTaskForm.dueDate}
                  onChange={(date) => setNewTaskForm(prev => ({ ...prev, dueDate: date }))}
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
                  value={newTaskForm.color}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, color: e.target.value }))}
                  style={{ width: '50px', height: '30px' }}
                />
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Checkbox
                  checked={newTaskForm.isRecurring}
                  onChange={(e) => setNewTaskForm(prev => ({ ...prev, isRecurring: e.target.checked }))}
                />
                <Typography variant="body2">Recurring Task</Typography>
              </Box>
              <Box>
                <Typography variant="body2" sx={{ mb: 1 }}>Task List:</Typography>
                <Select
                  value={selectedListForNewTask}
                  onChange={(e) => setSelectedListForNewTask(e.target.value)}
                  fullWidth
                  displayEmpty
                >
                  <MenuItem value="" disabled>Select a list</MenuItem>
                  {googleAccounts[activeAccountIndex]?.taskLists?.map((list: any) => (
                    <MenuItem key={list.id} value={list.id}>{list.title}</MenuItem>
                  ))}
                </Select>
              </Box>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenNewTaskDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateNewTask}
              variant="contained"
              color="primary"
              disabled={!newTaskForm.content.trim() || !selectedListForNewTask}
            >
              Add Task
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </GoogleOAuthProvider>
  );
}

export default App;
