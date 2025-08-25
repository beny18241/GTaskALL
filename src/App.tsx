import { useState, useEffect, useCallback, useMemo } from 'react';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Paper, Stack, Avatar, Divider, Select, MenuItem, Chip, Grid, Checkbox, ThemeProvider, createTheme, Menu, Tabs, Tab } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import ScheduleIcon from '@mui/icons-material/Schedule';
import ViewListIcon from '@mui/icons-material/ViewList';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SettingsIcon from '@mui/icons-material/Settings';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import TimelineIcon from '@mui/icons-material/Timeline';
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { CircularProgress } from '@mui/material';
import { apiService } from './api';
import TaskRow from './TaskRow.tsx';
import GanttChart from './GanttChart.tsx';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import Alert from '@mui/material/Alert';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DisconnectIcon from '@mui/icons-material/LinkOff';
import Snackbar from '@mui/material/Snackbar';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import NoteAddIcon from '@mui/icons-material/NoteAdd';


const drawerWidth = 240;
const collapsedDrawerWidth = 65;

interface Task {
  id: string;
  content: string;
  dueDate?: Date | null;
  startDate?: Date | null; // New: start date for task duration
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
  dependencies?: string[]; // New: array of task IDs this task depends on
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

// Add status to GoogleAccount type
export type GoogleAccount = {
  user: User;
  token: string | null;
  taskLists: any[];
  tasks: { [listId: string]: any[] };
  status?: string; // 'active' or 'expired'
};

const STORAGE_KEY = 'kanban-board-data';
const USER_STORAGE_KEY = 'user-data';
const GOOGLE_ACCOUNTS_KEY = 'google-accounts';
const GOOGLE_CLIENT_ID = "251184335563-bdf3sv4vc1sr4v2itciiepd7fllvshec.apps.googleusercontent.com";
const DARK_MODE_KEY = 'dark-mode-preference';
const API_BASE_URL = 'http://localhost:3001/api';

// Add new view mode type
type ViewMode = 'kanban' | 'list' | 'calendar' | 'today' | 'ultimate' | 'upcoming' | 'gantt';

// Add this type at the top with other interfaces
type Timeout = ReturnType<typeof setTimeout>;

interface EditTaskForm {
  content: string;
  notes: string;
  color: string;
  dueDate: Date | null;
  startDate: Date | null; // New: start date for task duration
  isRecurring: boolean;
  dependencies: string[]; // New: array of task IDs this task depends on
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
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem(DARK_MODE_KEY);
    return saved ? JSON.parse(saved) : false;
  });
  
  // Create theme based on dark mode preference
  const theme = useMemo(() => createTheme({
    palette: {
      mode: darkMode ? 'dark' : 'light',
      primary: {
        main: '#1976d2',
      },
      secondary: {
        main: '#dc004e',
      },
      background: {
        default: darkMode ? '#121212' : '#f5f5f5',
        paper: darkMode ? '#1e1e1e' : '#ffffff',
      },
    },
  }), [darkMode]);
  
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
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [openTaskDialog, setOpenTaskDialog] = useState(false);
  const [editingTask, setEditingTask] = useState<{ task: Task; columnId: string } | null>(null);
  const [editTaskForm, setEditTaskForm] = useState<EditTaskForm>({
    content: '',
    notes: '',
    color: '#1976d2',
    dueDate: null,
    startDate: null,
    isRecurring: false,
    dependencies: []
  });
  const [newTask, setNewTask] = useState<Partial<Task>>({
    content: '',
    dueDate: null,
    isRecurring: false,
    notes: '',
    color: '#1976d2',
    status: 'todo'
  });
  const [sidebarWidth, setSidebarWidth] = useState(320);
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
    startDate: null,
    isRecurring: false,
    dependencies: []
  });
  const [selectedListForNewTask, setSelectedListForNewTask] = useState<string>('');
  const [tempUserData, setTempUserData] = useState<User | null>(null);
  const [calendarShowAll, setCalendarShowAll] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isLoadingSettings, setIsLoadingSettings] = useState(false);

  // AI Panel state (combined Summary, Chat, and Notes)
  const [aiSummary, setAiSummary] = useState<{ summary: string; insights: string[] } | null>(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiPanelTab, setAiPanelTab] = useState(0); // 0 = summary, 1 = chat, 2 = notes

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<Array<{ type: 'user' | 'ai'; message: string; timestamp: Date }>>([]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // Notes state
  const [notes, setNotes] = useState<string>('');
  const [isSavingNote, setIsSavingNote] = useState(false);


  // Account management state
  const [expiredAccounts, setExpiredAccounts] = useState<string[]>([]);
  const [accountMenuAnchor, setAccountMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedAccountForMenu, setSelectedAccountForMenu] = useState<number | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<'configured' | 'not-configured' | 'checking'>('checking');

  // Dark mode toggle function
  const toggleDarkMode = () => {
    setDarkMode((prev: boolean) => !prev);
  };

  // Save dark mode preference to localStorage
  useEffect(() => {
    localStorage.setItem(DARK_MODE_KEY, JSON.stringify(darkMode));
  }, [darkMode]);

  // Color coding for different accounts - optimized with useMemo
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
    // 1. Load from localStorage immediately
    const savedAccounts = localStorage.getItem(GOOGLE_ACCOUNTS_KEY);
    if (savedAccounts) {
      try {
        setGoogleAccounts(JSON.parse(savedAccounts));
      } catch (e) {
        setGoogleAccounts([]);
      }
    }
    // 2. Load from DB in the background
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
        // Load saved Google Tasks connections from database in background
        loadSavedConnections(userData.email);
      } catch (error) {
        console.error('Error restoring user session:', error);
        localStorage.removeItem('google-credential');
        setIsInitialLoad(false);
      }
    } else {
      setIsInitialLoad(false);
    }
  }, []);

  // Function to load saved connections from database
  const loadSavedConnections = async (mainUserEmail: string) => {
    try {
      const connections = await apiService.getConnections(mainUserEmail);
      if (connections.length > 0) {
        const savedAccounts: GoogleAccount[] = [];
        const expiredEmails: string[] = [];
        
        for (const connection of connections) {
          // Try to get the stored token
          const token = await apiService.getToken(mainUserEmail, connection.gtask_account_email);
          let status = connection.status || 'active';
          let account: GoogleAccount = {
            user: {
              name: connection.gtask_account_name,
              email: connection.gtask_account_email,
              picture: connection.gtask_account_picture
            },
            token: token,
            taskLists: [],
            tasks: {},
            status
          };
          
          if (token && status === 'active') {
            // Test if the token is still valid by making a simple API call
            try {
              await axios.get('https://www.googleapis.com/tasks/v1/users/@me/lists', {
                headers: { Authorization: `Bearer ${token}` }
              });
            } catch (error: any) {
              // Token is expired, mark as expired in DB and locally
              if (error.response?.status === 401) {
                await apiService.expireConnection(mainUserEmail, connection.gtask_account_email);
                account.status = 'expired';
                account.token = null;
                expiredEmails.push(connection.gtask_account_email);
              }
            }
          }
          savedAccounts.push(account);
        }
        
        setGoogleAccounts(savedAccounts);
        setExpiredAccounts(expiredEmails);
        setActiveAccountIndex(0);
        
        // Always refresh tasks when loading saved connections, regardless of account status
        // This ensures we get the latest data from Google Tasks
        if (savedAccounts.length > 0) {
          console.log('Loading saved connections, refreshing tasks...');
          setTimeout(() => refreshTasks(), 1000);
        } else {
          setIsInitialLoad(false);
        }
      } else {
        setIsInitialLoad(false);
      }
    } catch (error) {
      console.error('Error loading saved connections:', error);
      setIsInitialLoad(false);
    }
  };

  // Save user data to localStorage whenever it changes - optimized
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  // Save columns to localStorage whenever they change - optimized with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
    }, 100);

    return () => clearTimeout(timer);
  }, [columns]);

  // Save accounts to localStorage whenever they change - optimized with debouncing
  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem(GOOGLE_ACCOUNTS_KEY, JSON.stringify(googleAccounts));
    }, 100);

    return () => clearTimeout(timer);
  }, [googleAccounts]);

  // Check for existing user data on app startup
  useEffect(() => {
    const checkExistingUser = async () => {
      const savedUser = localStorage.getItem(USER_STORAGE_KEY);
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        
        // Verify user exists in database and update last login
        try {
          const dbUser = await apiService.getUser(userData.email);
          if (dbUser) {
            // User exists in database, update last login
            await apiService.updateUserLogin(userData.email);
            setUser(userData);
            
            // Load saved connections
            await loadSavedConnections(userData.email);
          } else {
            // User doesn't exist in database, clear local storage
            localStorage.removeItem(USER_STORAGE_KEY);
            localStorage.removeItem(GOOGLE_ACCOUNTS_KEY);
            setIsInitialLoad(false);
          }
        } catch (error) {
          console.error('Error checking existing user:', error);
          // If there's an error, clear local storage and start fresh
          localStorage.removeItem(USER_STORAGE_KEY);
          localStorage.removeItem(GOOGLE_ACCOUNTS_KEY);
          setIsInitialLoad(false);
        }
      } else {
        setIsInitialLoad(false);
      }
    };

    checkExistingUser();
  }, []);

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

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
      const userData = {
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
      };
      
      // Create or update user account in database
      try {
        await apiService.createOrUpdateUser(userData.email, userData.name, userData.picture);
        await apiService.updateUserLogin(userData.email);
        console.log('User account created/updated successfully');
      } catch (error) {
        console.error('Error creating/updating user account:', error);
      }
      
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
        <Box key={account.user.email} sx={{ position: 'relative' }}>
          <Avatar
            src={account.user.picture}
            alt={account.user.name}
            onClick={() => setActiveAccountIndex(index)}
            sx={{
              width: 28,
              height: 28,
              cursor: account.status === 'expired' ? 'not-allowed' : 'pointer',
              border: index === activeAccountIndex ? '2px solid #fff' : '2px solid rgba(255, 255, 255, 0.3)',
              opacity: account.status === 'expired' ? 0.5 : 1,
              '&:hover': {
                opacity: account.status === 'expired' ? 0.5 : 0.8,
                transform: account.status === 'expired' ? 'none' : 'scale(1.1)',
                transition: 'all 0.2s ease'
              }
            }}
            title={
              account.status === 'expired' 
                ? `${account.user.name} (${account.user.email}) - Token expired. Click to reconnect.`
                : `${account.user.name} (${account.user.email})`
            }
          />
          {account.status === 'expired' && (
            <Box
              sx={{
                position: 'absolute',
                top: -2,
                right: -2,
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: '#f44336',
                border: '2px solid white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                '&:hover': {
                  bgcolor: '#d32f2f',
                  transform: 'scale(1.2)',
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleReconnectAccount(account);
              }}
              title="Reconnect account"
            >
              <Typography sx={{ fontSize: '0.6rem', color: 'white', fontWeight: 'bold' }}>
                ↻
              </Typography>
            </Box>
          )}
          
          {/* Account menu button */}
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              setAccountMenuAnchor(e.currentTarget);
              setSelectedAccountForMenu(index);
            }}
            sx={{
              position: 'absolute',
              top: -4,
              right: -4,
              width: 16,
              height: 16,
              bgcolor: 'rgba(0, 0, 0, 0.6)',
              color: 'white',
              '&:hover': {
                bgcolor: 'rgba(0, 0, 0, 0.8)',
                transform: 'scale(1.1)',
              },
              '& .MuiSvgIcon-root': {
                fontSize: '0.7rem',
              }
            }}
            title="Account options"
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
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
      
      {/* Account menu */}
      <Menu
        anchorEl={accountMenuAnchor}
        open={Boolean(accountMenuAnchor)}
        onClose={() => {
          setAccountMenuAnchor(null);
          setSelectedAccountForMenu(null);
        }}
        PaperProps={{
          sx: {
            minWidth: 200,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            border: '1px solid rgba(0,0,0,0.1)',
          }
        }}
      >
        {selectedAccountForMenu !== null && googleAccounts[selectedAccountForMenu] && (
          <>
            <MenuItem
              onClick={() => {
                setAccountMenuAnchor(null);
                setSelectedAccountForMenu(null);
                setSelectedAccountForRemoval(selectedAccountForMenu);
              }}
              sx={{
                color: 'error.main',
                '&:hover': {
                  bgcolor: 'error.light',
                  color: 'white',
                }
              }}
            >
              <DisconnectIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
              Disconnect Account
            </MenuItem>
            <Divider />
            <MenuItem
              onClick={() => {
                setAccountMenuAnchor(null);
                setSelectedAccountForMenu(null);
                setActiveAccountIndex(selectedAccountForMenu);
              }}
            >
              <AccountCircleIcon sx={{ mr: 1, fontSize: '1.1rem' }} />
              Switch to this Account
            </MenuItem>
          </>
        )}
      </Menu>
    </Box>
  );

  // Add reconnect functionality for expired accounts
  const handleReconnectAccount = (account: GoogleAccount) => {
    // Set the account as the one to reconnect
    setTempUserData(account.user);
    setGoogleTasksLoading(true);
    
    // Use the existing Google Tasks login flow
    loginGoogleTasksForReconnection();
  };

  // Add Google Tasks login for reconnection
  const loginGoogleTasksForReconnection = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        if (!user || !tempUserData) return;

        // Save the new token to database
        await apiService.updateToken(user.email, tempUserData.email, tokenResponse.access_token);
        
        // Activate the connection in database
        await apiService.activateConnection(user.email, tempUserData.email);
        
        // Update the account in local state
        setGoogleAccounts(prevAccounts => 
          prevAccounts.map(acc =>
            acc.user.email === tempUserData.email
              ? { ...acc, token: tokenResponse.access_token, status: 'active' }
              : acc
          )
        );
        
        // Remove from expired accounts list
        setExpiredAccounts(prev => prev.filter(email => email !== tempUserData.email));
        
        // Refresh tasks to get updated data
        setTimeout(() => refreshTasks(), 1000);
        
        setGoogleTasksLoading(false);
        setTempUserData(null);
      } catch (error) {
        console.error('Error reconnecting account:', error);
        setGoogleTasksLoading(false);
        setTempUserData(null);
      }
    },
    onError: (error) => {
      console.error('Google Tasks login error:', error);
      setGoogleTasksLoading(false);
      setTempUserData(null);
    },
    scope: 'https://www.googleapis.com/auth/tasks',
    flow: 'implicit',
  });

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
    
    // Trigger sync after drag and drop action
    syncAfterAction();
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
          axios.patch(
            `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
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
        }
      } catch (error) {
        console.error('Error updating due date in Google Tasks:', error);
      }
    }

    setSelectedTask(null);
    
    // Trigger sync after quick date change
    syncAfterAction();
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

  // Filter tasks based on search query - optimized with useMemo
  const filterTasks = useCallback((tasks: Task[]) => {
    if (!debouncedSearchQuery.trim()) return tasks;
    
    const query = debouncedSearchQuery.toLowerCase();
    return tasks.filter(task => 
      task.content.toLowerCase().includes(query) ||
      (task.notes && task.notes.toLowerCase().includes(query))
    );
  }, [debouncedSearchQuery]);

  const handleEditTask = async (task: Task, columnId: string) => {
    if (!task || task.id === 'no-tasks') return;
    
    // Initialize the edit form with the current task data
    setEditTaskForm({
      content: task.content || '',
      notes: task.notes || '',
      color: task.color || '#1976d2',
      dueDate: task.dueDate || null,
      startDate: task.startDate || null,
      isRecurring: task.isRecurring || false,
      dependencies: task.dependencies || []
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
                    startDate: editTaskForm.startDate,
                    dueDate: editTaskForm.dueDate,
                    isRecurring: editTaskForm.isRecurring,
                    dependencies: editTaskForm.dependencies
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

          // Add start date to notes if specified
          if (editTaskForm.startDate) {
            const startDateNote = `📅 Start: ${format(editTaskForm.startDate, 'yyyy-MM-dd')}`;
            // Remove any existing start date from notes
            const notesWithoutStartDate = update.notes.replace(/📅 Start: \d{4}-\d{2}-\d{2}/g, '').trim();
            update.notes = `${notesWithoutStartDate}\n${startDateNote}`;
          }

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
      startDate: null,
      isRecurring: false,
      dependencies: []
    });
    
    // Trigger sync after task edit
    syncAfterAction();
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

        // Add start date to notes if specified (Google Tasks doesn't have a native start date field)
        if (newTaskForm.startDate) {
          taskData.notes = `${taskData.notes}\n📅 Start: ${format(newTaskForm.startDate, 'yyyy-MM-dd')}`;
        }

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
        startDate: null,
        isRecurring: false,
        dependencies: []
      });
      setSelectedListForNewTask('');
      setOpenNewTaskDialog(false);
      
      // Trigger sync after creating new task
      syncAfterAction();
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
          p: isDoneColumn ? 1.5 : 2,
          cursor: 'grab',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: task.isDragging ? 'scale(1.02) rotate(1deg)' : 'scale(1) rotate(0deg)',
          opacity: task.isDragging ? 0.5 : 1,
          boxShadow: task.isDragging ? 4 : '0 2px 8px rgba(0,0,0,0.08)',
          position: 'relative',
          '&:hover': {
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            transform: 'translateY(-3px)',
          },
          borderLeft: task.color ? `4px solid ${task.color}` : 'none',
          bgcolor: task.color ? `${task.color}08` : 'background.paper',
          maxWidth: '100%',
          overflow: 'hidden',
          mb: isDoneColumn ? 1 : 1.5,
          display: 'flex',
          flexDirection: 'column',
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider'
        }}
        draggable
        onDragStart={() => handleDragStart(task, columnId)}
      >
        {/* Checkbox for marking as done */}
        {!isNoTask && (
          <Box sx={{ 
            position: 'absolute', 
            top: isDoneColumn ? 8 : 12, 
            left: isDoneColumn ? 8 : 12, 
            zIndex: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Checkbox
              checked={task.status === 'completed'}
              onChange={e => handleTaskCompletionToggle(task, e.target.checked)}
              size="small"
              sx={{ 
                p: 0, 
                color: task.color || 'primary.main',
                '&:hover': {
                  backgroundColor: 'rgba(0, 0, 0, 0.04)',
                }
              }}
            />
          </Box>
        )}
        
        {/* Account Avatar - Only show in Done column if space allows */}
        {task.accountPicture && !isNoTask && !isDoneColumn && (
          <Box
            sx={{
              position: 'absolute',
              top: 12,
              right: 12,
              zIndex: 1,
            }}
          >
            <Avatar
              src={task.accountPicture}
              alt={task.accountName}
              sx={{
                width: 28,
                height: 28,
                border: '2px solid white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
              }}
            />
          </Box>
        )}
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: isDoneColumn ? 1 : 1.5, width: '100%' }}>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {/* Task Title */}
            <Typography 
              variant="subtitle1" 
              sx={{ 
                wordBreak: 'break-word',
                fontWeight: 600,
                fontSize: isDoneColumn ? '0.85rem' : '0.95rem',
                lineHeight: 1.4,
                mb: isDoneColumn ? 0.5 : 1,
                pr: (task.accountPicture && !isDoneColumn) ? 5 : 0,
                pl: !isNoTask ? (isDoneColumn ? 3 : 5) : 0,
                textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                color: task.status === 'completed' ? 'text.secondary' : 'text.primary'
              }}
            >
              {task.content}
            </Typography>
            
            {/* Task Notes - Hide in Done column to save space */}
            {!isNoTask && task.notes && !isDoneColumn && (
              <Typography 
                variant="body2" 
                color="text.secondary"
                sx={{ 
                  mb: 1.5,
                  fontSize: '0.8rem',
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

            {/* Status Badges - Simplified for Done column */}
            {!isDoneColumn && (
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.75, alignItems: 'center', mb: 1 }}>
                {!isNoTask && task.isRecurring && (
                  <Chip
                    icon={<span>🔄</span>}
                    label="Recurring"
                    size="small"
                    sx={{ 
                      fontSize: '0.7rem',
                      height: '24px',
                      bgcolor: 'primary.main',
                      color: 'white',
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                )}
                {!isNoTask && task.status === 'in-progress' && (
                  <Chip
                    icon={<span>⚡</span>}
                    label="Active"
                    size="small"
                    sx={{ 
                      fontSize: '0.7rem',
                      height: '24px',
                      bgcolor: 'warning.main',
                      color: 'white',
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                )}
                {!isNoTask && task.status === 'completed' && (
                  <Chip
                    icon={<span>✓</span>}
                    label="Done"
                    size="small"
                    sx={{ 
                      fontSize: '0.7rem',
                      height: '24px',
                      bgcolor: 'success.main',
                      color: 'white',
                      '& .MuiChip-label': { px: 1 }
                    }}
                  />
                )}
              </Stack>
            )}

            {/* Date and Quick Actions - Simplified for Done column */}
            {!isDoneColumn ? (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1 }}>
                {/* Due Date */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                  {!isNoTask && task.dueDate ? (
                    <Chip
                      icon={<EventIcon sx={{ fontSize: '0.8rem' }} />}
                      label={format(new Date(task.dueDate), 'MMM d')}
                      size="small"
                      sx={{ 
                        fontSize: '0.7rem',
                        height: '24px',
                        bgcolor: isOverdue ? 'error.main' : 'info.main',
                        color: 'white',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.9 },
                        '& .MuiChip-label': { px: 1 }
                      }}
                      onClick={() => setSelectedTask({ task, columnId })}
                    />
                  ) : !isNoTask && (
                    <Chip
                      icon={<EventIcon sx={{ fontSize: '0.8rem' }} />}
                      label="Add Date"
                      size="small"
                      sx={{ 
                        fontSize: '0.7rem',
                        height: '24px',
                        bgcolor: 'grey.500',
                        color: 'white',
                        cursor: 'pointer',
                        '&:hover': { opacity: 0.9 },
                        '& .MuiChip-label': { px: 1 }
                      }}
                      onClick={() => setSelectedTask({ task, columnId })}
                    />
                  )}
                </Box>
                
                {/* Quick Reschedule Buttons */}
                {!isNoTask && (
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ 
                        minWidth: 'auto', 
                        px: 1.5, 
                        py: 0.5, 
                        fontSize: '0.65rem',
                        height: '24px',
                        borderColor: 'primary.main',
                        color: 'primary.main',
                        borderRadius: 1,
                        '&:hover': {
                          bgcolor: 'primary.main',
                          color: 'white'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickDateChange(task, columnId, new Date());
                      }}
                    >
                      Today
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ 
                        minWidth: 'auto', 
                        px: 1.5, 
                        py: 0.5, 
                        fontSize: '0.65rem',
                        height: '24px',
                        borderColor: 'warning.main',
                        color: 'warning.main',
                        borderRadius: 1,
                        '&:hover': {
                          bgcolor: 'warning.main',
                          color: 'white'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickDateChange(task, columnId, addDays(new Date(), 1));
                      }}
                    >
                      Tomorrow
                    </Button>
                    <Button
                      size="small"
                      variant="outlined"
                      sx={{ 
                        minWidth: 'auto', 
                        px: 1.5, 
                        py: 0.5, 
                        fontSize: '0.65rem',
                        height: '24px',
                        borderColor: 'success.main',
                        color: 'success.main',
                        borderRadius: 1,
                        '&:hover': {
                          bgcolor: 'success.main',
                          color: 'white'
                        }
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickDateChange(task, columnId, addWeeks(new Date(), 1));
                      }}
                    >
                      Next Week
                    </Button>
                  </Box>
                )}
              </Box>
            ) : (
              /* Done column: Show only completion date if available */
              task.completedAt && (
                <Box sx={{ mt: 0.5 }}>
                  <Typography 
                    variant="caption" 
                    color="text.secondary"
                    sx={{ 
                      fontSize: '0.7rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5
                    }}
                  >
                    <CheckCircleIcon sx={{ fontSize: '0.8rem' }} />
                    Completed {format(new Date(task.completedAt), 'MMM d')}
                  </Typography>
                </Box>
              )
            )}
          </Box>
        </Box>
        
        {/* Edit Button - Smaller for Done column */}
        <IconButton
          size="small"
          onClick={(e) => {
            e.stopPropagation();
            handleEditTask(task, columnId);
          }}
          sx={{
            position: 'absolute',
            top: isDoneColumn ? 8 : 12,
            right: (task.accountPicture && !isDoneColumn) ? 48 : (isDoneColumn ? 8 : 12),
            opacity: 0.7,
            transition: 'all 0.3s ease',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
              transform: 'scale(1.1)',
              boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              opacity: 1,
            },
            '& .MuiSvgIcon-root': {
              fontSize: '1rem',
            },
            zIndex: 2,
            width: isDoneColumn ? '28px' : '32px',
            height: isDoneColumn ? '28px' : '32px',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
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
    
    // Group tasks by date sections
    const groupTasksByDate = (tasks: Task[]) => {
      const today = startOfDay(new Date());
      const tomorrow = addDays(today, 1);
      const nextWeek = addWeeks(today, 1);
      
      const sections: { [key: string]: Task[] } = {
        'overdue': [],
        'today': [],
        'tomorrow': [],
        'this-week': [],
        'next-week': [],
        'future': [],
        'no-date': []
      };
      
      tasks.forEach(task => {
        if (!task.dueDate) {
          sections['no-date'].push(task);
          return;
        }
        
        const taskDate = startOfDay(new Date(task.dueDate));
        
        if (taskDate < today) {
          sections['overdue'].push(task);
        } else if (isToday(taskDate)) {
          sections['today'].push(task);
        } else if (isToday(addDays(taskDate, -1))) {
          sections['tomorrow'].push(task);
        } else if (taskDate < nextWeek) {
          sections['this-week'].push(task);
        } else if (taskDate < addWeeks(nextWeek, 1)) {
          sections['next-week'].push(task);
        } else {
          sections['future'].push(task);
        }
      });
      
      return sections;
    };
    
    const dateSections = groupTasksByDate(filteredTasks);

    return (
      <Box sx={{ 
        minHeight: '100vh',
        bgcolor: 'background.default',
        p: 3
      }}>
        {/* Modern Header */}
        <Box sx={{ 
          mb: 4,
          textAlign: 'center'
        }}>
          <Typography 
            variant="h3" 
            sx={{ 
              fontWeight: 800,
              mb: 1,
              color: 'text.primary'
            }}
          >
            Task List
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              color: 'text.secondary',
              fontWeight: 300,
              letterSpacing: 1
            }}
          >
            {filteredTasks.length} Active Tasks
          </Typography>
        </Box>

        {/* Main Content Container */}
        <Box sx={{ 
          maxWidth: '1000px', 
          mx: 'auto',
          position: 'relative'
        }}>
          {/* Tasks List */}
          {filteredTasks.length === 0 ? (
            <Box sx={{ 
              textAlign: 'center',
              py: 8
            }}>
              <Box sx={{ 
                fontSize: '4rem', 
                mb: 2,
                opacity: 0.7
              }}>
                ✨
              </Box>
              <Typography variant="h5" sx={{ mb: 1, fontWeight: 600, color: 'text.primary' }}>
                All Caught Up!
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                No active tasks at the moment. Time to celebrate! 🎉
              </Typography>
            </Box>
          ) : (
            <Box sx={{ 
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid',
              borderColor: 'divider',
              overflow: 'hidden'
            }}
          >
            {Object.entries(dateSections).map(([sectionKey, tasks]) => {
                if (tasks.length === 0) return null;
                
                const sectionTitles = {
                  'overdue': '🚨 Overdue',
                  'today': '📅 Today',
                  'tomorrow': '⏰ Tomorrow',
                  'this-week': '📆 This Week',
                  'next-week': '📋 Next Week',
                  'future': '🔮 Future',
                  'no-date': '📝 No Due Date'
                };
                
                const sectionColors = {
                  'overdue': '#F44336',
                  'today': '#FF9800',
                  'tomorrow': '#2196F3',
                  'this-week': '#4CAF50',
                  'next-week': '#9C27B0',
                  'future': '#607D8B',
                  'no-date': '#757575'
                };
                
                return (
                  <Box key={sectionKey}>
                    {/* Section Header */}
                    <Box sx={{ 
                      p: 2,
                      bgcolor: 'rgba(0, 0, 0, 0.03)',
                      borderBottom: '1px solid',
                      borderColor: 'divider',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1
                    }}>
                      <Box sx={{ 
                        width: 4, 
                        height: 20, 
                        bgcolor: sectionColors[sectionKey as keyof typeof sectionColors],
                        borderRadius: 1
                      }} />
                      <Typography 
                        variant="subtitle2" 
                        sx={{ 
                          fontWeight: 600,
                          color: 'text.primary'
                        }}
                      >
                        {sectionTitles[sectionKey as keyof typeof sectionTitles]} ({tasks.length})
                      </Typography>
                    </Box>
                    
                    {/* Tasks in this section */}
                    {tasks.map((task: Task, index: number) => {
                      const accountColor = task.accountEmail ? getAccountColor(task.accountEmail) : '#9C27B0';
                      const isOverdue = task.dueDate && new Date(task.dueDate) < startOfDay(new Date()) && task.status !== 'completed';
                      const isTaskToday = task.dueDate && isToday(new Date(task.dueDate));
                      
                      return (
                        <Box
                          key={task.id}
                          sx={{
                            p: 2.5,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 2,
                            borderBottom: index < tasks.length - 1 ? '1px solid' : 'none',
                            borderColor: 'rgba(0, 0, 0, 0.08)',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            position: 'relative',
                            '&:hover': {
                              bgcolor: 'rgba(0, 0, 0, 0.02)',
                              transform: 'translateX(4px)',
                            },
                            '&::before': {
                              content: '""',
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: '4px',
                              background: `linear-gradient(180deg, ${task.color || accountColor}, ${accountColor})`,
                            }
                          }}
                          onClick={() => handleEditTask(task, task.listId || 'todo')}
                        >
                          {/* Checkbox */}
                          <Checkbox
                            checked={task.status === 'completed'}
                            onChange={(e) => handleTaskCompletionToggle(task, e.target.checked)}
                            sx={{ 
                              color: task.color || accountColor,
                              '&.Mui-checked': {
                                color: task.color || accountColor,
                              },
                              '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                              }
                            }}
                            onClick={(e) => e.stopPropagation()}
                          />
                          
                          {/* Task Content */}
                          <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 0.5 }}>
                              <Typography 
                                variant="subtitle1" 
                                sx={{ 
                                  fontWeight: 600,
                                  textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                                  color: task.status === 'completed' ? 'text.secondary' : 'text.primary',
                                  fontSize: '1rem',
                                  lineHeight: 1.3,
                                  flex: 1
                                }}
                              >
                                {task.content}
                              </Typography>
                              
                              {/* Status Chip */}
                              <Chip
                                label={task.status === 'in-progress' ? '⚡ Active' : task.status === 'completed' ? '✓ Done' : '📋 To Do'}
                                size="small"
                                sx={{ 
                                  height: '22px',
                                  fontSize: '0.7rem',
                                  fontWeight: 600,
                                  bgcolor: task.status === 'in-progress' ? '#FF9800' : 
                                          task.status === 'completed' ? '#4CAF50' : '#2196F3',
                                  color: 'white',
                                  '& .MuiChip-label': { px: 1 }
                                }}
                              />
                            </Box>
                            
                            {/* Notes */}
                            {task.notes && (
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ 
                                  mb: 0.5,
                                  fontSize: '0.8rem',
                                  lineHeight: 1.3,
                                  fontStyle: 'italic'
                                }}
                              >
                                {task.notes}
                              </Typography>
                            )}
                            
                            {/* Meta Info Row */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                              {/* Account Avatar */}
                              {task.accountPicture && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Avatar
                                    src={task.accountPicture}
                                    alt={task.accountName}
                                    sx={{
                                      width: 20,
                                      height: 20,
                                      fontSize: '0.6rem',
                                      border: '1px solid',
                                      borderColor: accountColor
                                    }}
                                  />
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      color: 'text.secondary',
                                      fontSize: '0.7rem'
                                    }}
                                  >
                                    {task.accountName}
                                  </Typography>
                                </Box>
                              )}
                              
                              {/* Due Date */}
                              {task.dueDate && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <EventIcon sx={{ 
                                    fontSize: '0.9rem',
                                    color: isOverdue ? '#F44336' : isTaskToday ? '#FF9800' : '#2196F3'
                                  }} />
                                  <Typography 
                                    variant="caption" 
                                    sx={{ 
                                      fontWeight: 500,
                                      color: isOverdue ? '#F44336' : isTaskToday ? '#FF9800' : '#2196F3',
                                      fontSize: '0.7rem'
                                    }}
                                  >
                                    {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                  </Typography>
                                  {isOverdue && (
                                    <Chip
                                      label="OVERDUE"
                                      size="small"
                                      sx={{ 
                                        height: '16px',
                                        fontSize: '0.6rem',
                                        bgcolor: '#F44336',
                                        color: 'white',
                                        fontWeight: 700,
                                        ml: 0.5
                                      }}
                                    />
                                  )}
                                </Box>
                              )}
                              
                              {/* Recurring Badge */}
                              {task.isRecurring && (
                                <Chip
                                  icon={<span>🔄</span>}
                                  label="Recurring"
                                  size="small"
                                  sx={{ 
                                    height: '16px',
                                    fontSize: '0.6rem',
                                    bgcolor: '#9C27B0',
                                    color: 'white',
                                    fontWeight: 600
                                  }}
                                />
                              )}
                            </Box>
                          </Box>
                          
                          {/* Quick Actions */}
                          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                const column = columns.find(col => col.tasks.some(t => t.id === task.id));
                                const columnId = column?.id || 'todo';
                                handleQuickDateChange(task, columnId, new Date());
                              }}
                              sx={{
                                fontSize: '0.65rem',
                                height: '24px',
                                minWidth: 'auto',
                                px: 1,
                                borderColor: '#4CAF50',
                                color: '#4CAF50',
                                '&:hover': {
                                  bgcolor: '#4CAF50',
                                  color: 'white',
                                }
                              }}
                            >
                              Today
                            </Button>
                            
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                const column = columns.find(col => col.tasks.some(t => t.id === task.id));
                                const columnId = column?.id || 'todo';
                                handleQuickDateChange(task, columnId, addDays(new Date(), 1));
                              }}
                              sx={{
                                fontSize: '0.65rem',
                                height: '24px',
                                minWidth: 'auto',
                                px: 1,
                                borderColor: '#FF9800',
                                color: '#FF9800',
                                '&:hover': {
                                  bgcolor: '#FF9800',
                                  color: 'white',
                                }
                              }}
                            >
                              Tomorrow
                            </Button>
                            
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={(e) => {
                                e.stopPropagation();
                                const column = columns.find(col => col.tasks.some(t => t.id === task.id));
                                const columnId = column?.id || 'todo';
                                handleQuickDateChange(task, columnId, addWeeks(new Date(), 1));
                              }}
                              sx={{
                                fontSize: '0.65rem',
                                height: '24px',
                                minWidth: 'auto',
                                px: 1,
                                borderColor: '#2196F3',
                                color: '#2196F3',
                                '&:hover': {
                                  bgcolor: '#2196F3',
                                  color: 'white',
                                }
                              }}
                            >
                              Next Week
                            </Button>
                            
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditTask(task, task.listId || 'todo');
                              }}
                              sx={{
                                width: '24px',
                                height: '24px',
                                border: '1px solid',
                                borderColor: '#9C27B0',
                                color: '#9C27B0',
                                '&:hover': {
                                  bgcolor: '#9C27B0',
                                  color: 'white',
                                }
                              }}
                              title="Edit task"
                            >
                              <EditIcon sx={{ fontSize: '0.9rem' }} />
                            </IconButton>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                );
              })}
            </Box>
          )}

          {/* Progress Summary */}
          {filteredTasks.length > 0 && (
            <Box sx={{ 
              mt: 3,
              p: 2.5,
              bgcolor: 'background.paper',
              borderRadius: 2,
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid',
              borderColor: 'divider',
              textAlign: 'center'
            }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Progress Overview
              </Typography>
              <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                mb: 2
              }}>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {filteredTasks.filter(t => t.status === 'completed').length} of {filteredTasks.length} completed
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'primary.main' }}>
                  {Math.round((filteredTasks.filter(t => t.status === 'completed').length / filteredTasks.length) * 100)}%
                </Typography>
              </Box>
              <Box sx={{ 
                height: 8, 
                bgcolor: 'rgba(0,0,0,0.1)', 
                borderRadius: 4,
                overflow: 'hidden'
              }}>
                <Box sx={{ 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #4CAF50, #66BB6A)',
                  width: `${(filteredTasks.filter(t => t.status === 'completed').length / filteredTasks.length) * 100}%`,
                  transition: 'width 0.5s ease',
                  borderRadius: 4
                }} />
              </Box>
            </Box>
          )}
        </Box>
      </Box>
    );
  };

  // Add new render functions for different views
  const renderCalendarView = () => {
    const allTasks = columns.reduce((acc: Task[], column) => {
      return [...acc, ...column.tasks];
    }, []);

    const filteredTasks = filterTasks(allTasks);
    const today = startOfDay(selectedDate);
    const overdueTasks = filteredTasks.filter(task => task.dueDate && new Date(task.dueDate) < today && task.status !== 'completed');
    const todayTasks = filteredTasks.filter(task => task.dueDate && isSameDay(new Date(task.dueDate), today));
    const tasksForSelectedDay = [...overdueTasks, ...todayTasks];
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
        <Paper sx={{ p: 2, bgcolor: 'background.paper' }}>
          {calendarShowAll ? (
            <>
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
                  All Tasks
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} total
                </Typography>
              </Box>

              <Box sx={{ 
                bgcolor: 'background.paper', 
                borderRadius: 1.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', 
                overflow: 'hidden', 
                border: '1px solid', 
                borderColor: 'divider'
              }}>
                {filteredTasks.length === 0 ? (
                  <Box sx={{ 
                    p: 3, 
                    textAlign: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      🎉 No tasks found!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Create some tasks to get started.
                    </Typography>
                  </Box>
                ) : (
                  filteredTasks.map((task, index) => {
                    const accountColor = task.accountEmail ? getAccountColor(task.accountEmail) : '#9C27B0';
                    const isOverdue = task.dueDate && new Date(task.dueDate) < startOfDay(new Date()) && task.status !== 'completed';
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        accountColor={accountColor}
                        showDivider={index < filteredTasks.length - 1}
                        onEdit={() => handleEditTask(task, task.listId || 'todo')}
                        isOverdue={isOverdue}
                      />
                    );
                  })
                )}
              </Box>

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
            </>
          ) : (
            <>
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
                  {format(selectedDate, 'MMMM d, yyyy')}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  {tasksForSelectedDay.length} task{tasksForSelectedDay.length !== 1 ? 's' : ''} for this date
                </Typography>
              </Box>

              <Box sx={{ 
                bgcolor: 'background.paper', 
                borderRadius: 1.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)', 
                overflow: 'hidden', 
                border: '1px solid', 
                borderColor: 'divider'
              }}>
                {tasksForSelectedDay.length === 0 ? (
                  <Box sx={{ 
                    p: 3, 
                    textAlign: 'center',
                    bgcolor: 'background.paper',
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: 'divider'
                  }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      🎉 No tasks for this date!
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      You're all caught up for {format(selectedDate, 'MMMM d')}.
                    </Typography>
                  </Box>
                ) : (
                  tasksForSelectedDay.map((task, index, arr) => {
                    const accountColor = task.accountEmail ? getAccountColor(task.accountEmail) : '#9C27B0';
                    const isOverdue = task.dueDate && new Date(task.dueDate) < startOfDay(new Date()) && task.status !== 'completed';
                    return (
                      <TaskRow
                        key={task.id}
                        task={task}
                        accountColor={accountColor}
                        showDivider={index < arr.length - 1}
                        onEdit={() => handleEditTask(task, task.listId || 'todo')}
                        isOverdue={isOverdue}
                      />
                    );
                  })
                )}
              </Box>

              {/* Progress Summary - Compact */}
              {tasksForSelectedDay.length > 0 && (
                <Box sx={{ 
                  mt: 1.5, 
                  p: 1.5,
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  borderRadius: 1.5
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                      Progress: {tasksForSelectedDay.filter(t => t.status === 'completed').length} of {tasksForSelectedDay.length} completed
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}>
                      {Math.round((tasksForSelectedDay.filter(t => t.status === 'completed').length / tasksForSelectedDay.length) * 100)}%
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
                      width: `${(tasksForSelectedDay.filter(t => t.status === 'completed').length / tasksForSelectedDay.length) * 100}%`,
                      transition: 'width 0.3s ease'
                    }} />
                  </Box>
                </Box>
              )}
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

    // Overdue: dueDate < today and not completed
    const overdueTasks = allTasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < startOfDay(new Date()) && task.status !== 'completed'
    );
    // Today: dueDate is today
    const todayTasks = allTasks.filter(task => 
      task.dueDate && isToday(new Date(task.dueDate))
    );
    const filteredTasks = filterTasks([...overdueTasks, ...todayTasks]);

    // Get account icon based on email
    const getAccountIcon = (accountEmail: string) => {
      if (accountEmail.includes('beny18241')) return '👨‍💻';
      if (accountEmail.includes('pindelaMaciej')) return '👨‍💼';
      if (accountEmail.includes('whitehatgmiang')) return '🎯';
      return '👤'; // Default icon
    };

    return (
      <Box sx={{ p: 2, maxWidth: '1400px', mx: 'auto' }}>
        <Box sx={{ 
          mb: 2, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 2,
          p: 2,
          color: 'white',
          boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
        }}>
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
            <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold', mb: 0.5 }}>
              Today's Tasks
            </Typography>
            <Box sx={{ display: 'flex', gap: 0.5 }}>
              <IconButton
                size="small"
                onClick={() => {
                  if (!showAIPanel) {
                    setShowAIPanel(true);
                    setAiPanelTab(0); // Show summary tab
                    if (!aiSummary) {
                      generateAISummary(filteredTasks);
                    }
                  } else {
                    setShowAIPanel(!showAIPanel);
                  }
                }}
                disabled={isGeneratingSummary}
                sx={{
                  color: 'white',
                  bgcolor: 'rgba(255,255,255,0.2)',
                  '&:hover': {
                    bgcolor: 'rgba(255,255,255,0.3)',
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.5)',
                  }
                }}
                title="AI Assistant (Summary, Chat, Notes)"
              >
                {isGeneratingSummary ? (
                  <CircularProgress size={16} color="inherit" />
                ) : (
                  <AutoAwesomeIcon fontSize="small" />
                )}
              </IconButton>
            </Box>
          </Box>
          <Typography variant="body2" sx={{ opacity: 0.9, mb: 0.5 }}>
            {filteredTasks.length} task{filteredTasks.length !== 1 ? 's' : ''} for today
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8, fontStyle: 'italic' }}>
            💡 Quick reschedule buttons available for each task
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 3, alignItems: 'flex-start' }}>
          {/* Left Column - Tasks */}
          <Box sx={{ flex: 1, minWidth: 0 }}>
            {filteredTasks.length === 0 ? (
              <Box sx={{ 
                p: 3, 
                textAlign: 'center',
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider'
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
                bgcolor: 'background.paper', 
                borderRadius: 1.5,
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                overflow: 'hidden',
                border: '1px solid',
                borderColor: 'divider'
              }}>
                {filteredTasks.map((task, index) => {
                  const accountColor = task.accountEmail ? getAccountColor(task.accountEmail) : '#9C27B0';
                  const isOverdue = task.dueDate && new Date(task.dueDate) < startOfDay(new Date()) && task.status !== 'completed';
                  return (
                    <TaskRow
                      key={task.id}
                      task={task}
                      accountColor={accountColor}
                      showDivider={index < filteredTasks.length - 1}
                      onEdit={() => handleEditTask(task, task.listId || 'todo')}
                      isOverdue={isOverdue}
                      showQuickReschedule={true}
                      onQuickReschedule={(task, newDate) => handleQuickDateChange(task, task.listId || 'todo', newDate)}
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

          {/* Right Column - AI Panel (Summary, Chat, Notes) */}
          {showAIPanel && (
            <Box sx={{ 
              width: 350, 
              flexShrink: 0,
              position: 'sticky',
              top: 20
            }}>
              <Box sx={{ 
                bgcolor: 'background.paper',
                borderRadius: 2,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                height: '500px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                {/* Panel Header */}
                <Box sx={{ 
                  p: 2,
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <Typography variant="h6" sx={{ 
                    color: 'primary.main',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}>
                    🤖 AI Assistant
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={() => setShowAIPanel(false)}
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'text.primary',
                      }
                    }}
                    title="Close AI Panel"
                  >
                    <ClearIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Tabs */}
                <Tabs 
                  value={aiPanelTab} 
                  onChange={(e, newValue) => {
                    setAiPanelTab(newValue);
                    // Initialize chat messages when switching to chat tab
                    if (newValue === 1 && chatMessages.length === 0) {
                      setChatMessages([{
                        type: 'ai',
                        message: 'Cześć! Jestem tutaj, aby pomóc Ci z zarządzaniem zadaniami. Możesz mnie zapytać o wszystko związane z Twoimi zadaniami na dziś.',
                        timestamp: new Date()
                      }]);
                    }
                    // Load notes when switching to notes tab
                    if (newValue === 2) {
                      loadNote();
                    }
                  }}
                  sx={{ 
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    px: 2
                  }}
                >
                  <Tab 
                    label="Summary" 
                    sx={{ 
                      fontSize: '0.8rem',
                      minHeight: 40,
                      textTransform: 'none'
                    }}
                  />
                  <Tab 
                    label="Chat" 
                    sx={{ 
                      fontSize: '0.8rem',
                      minHeight: 40,
                      textTransform: 'none'
                    }}
                  />
                  <Tab 
                    label="Notes" 
                    sx={{ 
                      fontSize: '0.8rem',
                      minHeight: 40,
                      textTransform: 'none'
                    }}
                  />
                </Tabs>

                {/* Tab Content */}
                <Box sx={{ flex: 1, overflow: 'hidden' }}>
                  {/* Summary Tab */}
                  {aiPanelTab === 0 && (
                    <Box sx={{ p: 2, height: '100%', overflow: 'auto' }}>
                      {summaryError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                          {summaryError}
                        </Alert>
                      )}

                      {aiSummary ? (
                        <Box>
                          <Typography variant="body1" sx={{ 
                            mb: 2,
                            fontWeight: 'medium',
                            color: 'text.primary',
                            fontSize: '0.9rem',
                            lineHeight: 1.5
                          }}>
                            {aiSummary.summary}
                          </Typography>
                          
                          {aiSummary.insights.length > 0 && (
                            <Box>
                              <Typography variant="subtitle2" sx={{ 
                                mb: 1,
                                fontWeight: 'bold',
                                color: 'primary.main',
                                fontSize: '0.85rem'
                              }}>
                                Key Insights:
                              </Typography>
                              <Box component="ul" sx={{ m: 0, pl: 2 }}>
                                {aiSummary.insights.map((insight, index) => (
                                  <Typography 
                                    key={index} 
                                    component="li" 
                                    variant="body2" 
                                    sx={{ 
                                      mb: 0.5,
                                      color: 'text.secondary',
                                      fontSize: '0.8rem',
                                      lineHeight: 1.4
                                    }}
                                  >
                                    {insight}
                                  </Typography>
                                ))}
                              </Box>
                            </Box>
                          )}
                        </Box>
                      ) : (
                        <Box sx={{ 
                          textAlign: 'center', 
                          py: 3,
                          color: 'text.secondary'
                        }}>
                          <AutoAwesomeIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                          <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                            Generating AI insights about your tasks...
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  )}

                  {/* Chat Tab */}
                  {aiPanelTab === 1 && (
                    <Box sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {/* Chat Messages */}
                      <Box sx={{ 
                        flex: 1,
                        overflow: 'auto',
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1
                      }}>
                        {chatMessages.length === 0 && (
                          <Box sx={{ 
                            textAlign: 'center', 
                            py: 3,
                            color: 'text.secondary'
                          }}>
                            <ChatIcon sx={{ fontSize: 40, mb: 1, opacity: 0.5 }} />
                            <Typography variant="body2" sx={{ fontSize: '0.85rem' }}>
                              Cześć! Jestem tutaj, aby pomóc Ci z zarządzaniem zadaniami.
                            </Typography>
                          </Box>
                        )}
                        {chatMessages.map((msg, index) => (
                          <Box
                            key={index}
                            sx={{
                              display: 'flex',
                              justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                              mb: 1
                            }}
                          >
                                                    <Box
                          sx={{
                            maxWidth: '80%',
                            p: 1.5,
                            borderRadius: 2,
                            bgcolor: msg.type === 'user' ? 'primary.main' : 'grey.100',
                            color: msg.type === 'user' ? 'white' : 'text.primary',
                            fontSize: '0.85rem',
                            lineHeight: 1.4,
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word'
                          }}
                        >
                          {msg.type === 'ai' ? (
                            <Box sx={{ 
                              '& strong': { fontWeight: 'bold' },
                              '& em': { fontStyle: 'italic' },
                              '& ul, & ol': { 
                                margin: '8px 0', 
                                paddingLeft: '20px' 
                              },
                              '& li': { 
                                margin: '4px 0' 
                              },
                              '& blockquote': { 
                                borderLeft: '3px solid #ccc',
                                margin: '8px 0',
                                paddingLeft: '12px',
                                fontStyle: 'italic',
                                color: 'text.secondary'
                              },
                              '& h3': {
                                fontSize: '1rem',
                                fontWeight: 'bold',
                                margin: '12px 0 8px 0',
                                color: 'primary.main'
                              }
                            }}>
                              {msg.message}
                            </Box>
                          ) : (
                            msg.message
                          )}
                        </Box>
                          </Box>
                        ))}
                        {isChatLoading && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
                            <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'grey.100' }}>
                              <CircularProgress size={16} />
                            </Box>
                          </Box>
                        )}
                      </Box>

                      {/* Chat Input */}
                      <Box sx={{ 
                        p: 2,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        gap: 1
                      }}>
                        <TextField
                          fullWidth
                          size="small"
                          placeholder="Zapytaj o swoje zadania..."
                          value={chatInput}
                          onChange={(e) => setChatInput(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              sendChatMessage(chatInput);
                            }
                          }}
                          disabled={isChatLoading}
                        />
                        <IconButton
                          onClick={() => sendChatMessage(chatInput)}
                          disabled={!chatInput.trim() || isChatLoading}
                          sx={{
                            bgcolor: 'primary.main',
                            color: 'white',
                            '&:hover': {
                              bgcolor: 'primary.dark',
                            },
                            '&.Mui-disabled': {
                              bgcolor: 'grey.300',
                              color: 'grey.500',
                            }
                          }}
                        >
                          <SendIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  )}

                  {/* Notes Tab */}
                  {aiPanelTab === 2 && (
                    <Box sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column'
                    }}>
                      {/* Notes Content */}
                      <Box sx={{ 
                        flex: 1,
                        p: 2,
                        display: 'flex',
                        flexDirection: 'column'
                      }}>
                        <TextField
                          multiline
                          fullWidth
                          rows={15}
                          placeholder="Dodaj notatki o swoich zadaniach na dziś..."
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          variant="outlined"
                          size="small"
                          sx={{
                            flex: 1,
                            '& .MuiOutlinedInput-root': {
                              fontSize: '0.85rem',
                              lineHeight: 1.4
                            }
                          }}
                        />
                      </Box>

                      {/* Notes Actions */}
                      <Box sx={{ 
                        p: 2,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        gap: 1
                      }}>
                        <Button
                          variant="outlined"
                          size="small"
                          onClick={() => setNotes('')}
                          disabled={!notes.trim()}
                          sx={{ flex: 1 }}
                        >
                          Clear
                        </Button>
                        <Button
                          variant="contained"
                          size="small"
                          onClick={saveNote}
                          disabled={isSavingNote}
                          sx={{ flex: 1 }}
                        >
                          {isSavingNote ? <CircularProgress size={16} /> : 'Save'}
                        </Button>

                      </Box>
                    </Box>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </Box>
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
            p: 1.5, 
            height: 'calc(100vh - 100px)', 
            overflow: 'auto',
            width: sidebarWidth,
            position: 'relative',
            transition: 'width 0.3s ease',
            flexShrink: 0,
            bgcolor: 'background.paper',
            borderLeft: '2px solid',
            borderColor: 'primary.main',
            boxShadow: '-4px 0 12px rgba(0, 0, 0, 0.1)',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
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
              const newWidth = Math.max(280, Math.min(600, startWidth - deltaX));
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
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            pb: 1.5,
            mb: 1,
            borderBottom: '1px solid',
            borderColor: 'primary.main'
          }}>
            <Typography 
              variant="h6" 
              sx={{
                color: 'primary.main',
                fontWeight: 'bold',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '1rem'
              }}
            >
              Today's Tasks
            </Typography>
            <Chip
              label={columns.reduce((acc: Task[], column) => {
                const todayTasks = column.tasks.filter(task => 
                  task.dueDate && isToday(new Date(task.dueDate))
                );
                return [...acc, ...todayTasks];
              }, []).length}
              size="small"
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                fontWeight: 'bold',
                height: '24px',
                '& .MuiChip-label': {
                  px: 1,
                  fontSize: '0.75rem'
                }
              }}
            />
          </Box>
          <Stack spacing={0.5}>
            {columns.reduce((acc: Task[], column) => {
              const todayTasks = column.tasks.filter(task => 
                task.dueDate && isToday(new Date(task.dueDate))
              );
              return [...acc, ...todayTasks];
            }, []).map((task) => (
              <Box
                key={task.id}
                sx={{
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  borderLeft: `3px solid ${task.color || '#42A5F5'}`,
                  '&:hover': {
                    bgcolor: 'action.hover',
                    transition: 'all 0.2s ease'
                  },
                  bgcolor: 'background.paper',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  borderRadius: 1
                }}
                onClick={() => handleEditTask(task, 'ultimate')}
              >
                {/* Status Checkbox */}
                <Checkbox
                  checked={task.status === 'completed'}
                  onChange={(e) => handleTaskCompletionToggle(task, e.target.checked)}
                  size="small"
                  sx={{ 
                    p: 0.5,
                    color: task.color || 'primary.main',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    }
                  }}
                />
                
                {/* Task Content */}
                <Box sx={{ 
                  flex: 1, 
                  minWidth: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5
                }}>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      wordBreak: 'break-word',
                      fontWeight: 500,
                      color: task.status === 'completed' ? 'text.secondary' : 'text.primary',
                      textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                      flex: 1,
                      fontSize: '0.85rem',
                      lineHeight: 1.3
                    }}
                  >
                    {task.content}
                  </Typography>
                  
                  {/* Account Avatar */}
                  {task.accountPicture && (
                    <Avatar
                      src={task.accountPicture}
                      alt={task.accountName}
                      sx={{
                        width: 20,
                        height: 20,
                        fontSize: '0.7rem',
                        border: '1px solid',
                        borderColor: 'divider'
                      }}
                    />
                  )}
                  
                  {/* Status Badge */}
                  <Chip
                    label={task.status === 'in-progress' ? 'Active' : task.status === 'completed' ? 'Done' : 'Todo'}
                    color={task.status === 'in-progress' ? 'warning' : task.status === 'completed' ? 'success' : 'info'}
                    size="small"
                    sx={{ 
                      height: '20px',
                      '& .MuiChip-label': {
                        px: 0.5,
                        fontSize: '0.65rem',
                        fontWeight: 500
                      }
                    }}
                  />
                  
                  {/* Quick Actions Menu */}
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Show quick actions menu
                      const column = columns.find(col => col.tasks.some(t => t.id === task.id));
                      const columnId = column?.id || 'todo';
                      handleQuickDateChange(task, columnId, addDays(new Date(), 1));
                    }}
                    sx={{
                      p: 0.5,
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        bgcolor: 'primary.light',
                      }
                    }}
                    title="Reschedule to tomorrow"
                  >
                    <EventIcon sx={{ fontSize: '0.8rem' }} />
                  </IconButton>
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

    // Get overdue tasks (not completed, dueDate < today)
    const overdueTasks = allTasks.filter(task => 
      task.dueDate && new Date(task.dueDate) < startOfDay(new Date()) && task.status !== 'completed'
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
      let tasks = tasksByDate[dateKey] || [];
      // For today, prepend overdue tasks
      if (i === 0 && overdueTasks.length > 0) {
        tasks = [...overdueTasks, ...tasks];
      }
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
              bgcolor: isToday(dateColumn.date) ? 'warning.light' : 'background.paper',
              border: isToday(dateColumn.date) ? '2px solid' : '1px solid',
              borderColor: isToday(dateColumn.date) ? 'warning.main' : 'divider',
              borderRadius: 2,
              overflow: 'hidden'
            }}
          >
            {/* Column Header */}
            <Box
              sx={{
                p: 2,
                bgcolor: isToday(dateColumn.date) ? 'warning.main' : 'background.default',
                color: isToday(dateColumn.date) ? 'warning.contrastText' : 'text.primary',
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
                  {dateColumn.tasks.map((task, idx) => {
                    const isOverdue = task.dueDate && new Date(task.dueDate) < startOfDay(new Date()) && task.status !== 'completed';
                    const accountColor = task.accountEmail ? getAccountColor(task.accountEmail) : '#9C27B0';
                    return (
                      <Paper
                        key={task.id}
                        sx={{
                          p: 1.5,
                          cursor: 'pointer',
                          borderLeft: `4px solid ${isOverdue ? '#ff6b6b' : (task.color || '#42A5F5')}`,
                          bgcolor: isOverdue ? 'rgba(255, 107, 107, 0.08)' : 'background.paper',
                          '&:hover': {
                            boxShadow: 2,
                            transform: 'translateY(-1px)',
                            transition: 'all 0.2s ease',
                            bgcolor: isOverdue ? 'rgba(255, 107, 107, 0.12)' : 'action.hover',
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
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
                              
                              {/* Quick Reschedule Buttons */}
                              <Box sx={{ display: 'flex', gap: 0.5, ml: 'auto' }}>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  sx={{ 
                                    minWidth: 'auto', 
                                    px: 0.5, 
                                    py: 0.25, 
                                    fontSize: '0.55rem',
                                    height: '20px',
                                    borderColor: 'primary.main',
                                    color: 'primary.main',
                                    '&:hover': {
                                      bgcolor: 'primary.main',
                                      color: 'white'
                                    }
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const column = columns.find(col => col.tasks.some(t => t.id === task.id));
                                    const columnId = column?.id || 'todo';
                                    handleQuickDateChange(task, columnId, new Date());
                                  }}
                                >
                                  Today
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  sx={{ 
                                    minWidth: 'auto', 
                                    px: 0.5, 
                                    py: 0.25, 
                                    fontSize: '0.55rem',
                                    height: '20px',
                                    borderColor: 'warning.main',
                                    color: 'warning.main',
                                    '&:hover': {
                                      bgcolor: 'warning.main',
                                      color: 'white'
                                    }
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const column = columns.find(col => col.tasks.some(t => t.id === task.id));
                                    const columnId = column?.id || 'todo';
                                    handleQuickDateChange(task, columnId, addDays(new Date(), 1));
                                  }}
                                >
                                  Tomorrow
                                </Button>
                                <Button
                                  size="small"
                                  variant="outlined"
                                  sx={{ 
                                    minWidth: 'auto', 
                                    px: 0.5, 
                                    py: 0.25, 
                                    fontSize: '0.55rem',
                                    height: '20px',
                                    borderColor: 'success.main',
                                    color: 'success.main',
                                    '&:hover': {
                                      bgcolor: 'success.main',
                                      color: 'white'
                                    }
                                  }}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const column = columns.find(col => col.tasks.some(t => t.id === task.id));
                                    const columnId = column?.id || 'todo';
                                    handleQuickDateChange(task, columnId, addWeeks(new Date(), 1));
                                  }}
                                >
                                  Next Week
                                </Button>
                              </Box>
                            </Box>
                          </Box>
                        </Box>
                      </Paper>
                    );
                  })}
                </Stack>
              )}
            </Box>
          </Paper>
        ))}
      </Box>
    );
  };

  // Helper function to update columns with tasks from Google Tasks - optimized with useCallback
  const updateColumnsWithTasks = useCallback((tasksByList: { [listId: string]: any[] }) => {
    setColumns(prevColumns => {
      return prevColumns.map(column => {
        let columnTasks: Task[] = [];
        
        if (column.id === 'todo') {
          // Get all uncompleted tasks from all lists
          Object.values(tasksByList).forEach(tasks => {
            const todoTasks = tasks
              .filter(task => !task.completed && (!task.notes || !task.notes.includes('⚡ Active')))
              .map(task => {
                // Parse start date from notes
                const startDateMatch = task.notes?.match(/📅 Start: (\d{4}-\d{2}-\d{2})/);
                const startDate = startDateMatch ? new Date(startDateMatch[1]) : null;
                
                return {
                  id: task.id,
                  content: task.title,
                  dueDate: task.due ? new Date(task.due) : null,
                  startDate: startDate,
                  isRecurring: task.recurrence ? true : false,
                  notes: task.notes || '',
                  color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#42A5F5',
                  status: 'todo' as const,
                  accountEmail: task.accountEmail,
                  accountName: task.accountName,
                  accountPicture: task.accountPicture
                };
              });
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
              .map(task => {
                // Parse start date from notes
                const startDateMatch = task.notes?.match(/📅 Start: (\d{4}-\d{2}-\d{2})/);
                const startDate = startDateMatch ? new Date(startDateMatch[1]) : null;
                
                return {
                  id: task.id,
                  content: task.title,
                  dueDate: task.due ? new Date(task.due) : null,
                  startDate: startDate,
                  isRecurring: task.recurrence ? true : false,
                  notes: task.notes?.replace('⚡ Active', '').trim() || '',
                  color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#FFA726',
                  status: 'in-progress' as const,
                  accountEmail: task.accountEmail,
                  accountName: task.accountName,
                  accountPicture: task.accountPicture
                };
              });
            columnTasks = [...columnTasks, ...inProgressTasks];
          });
        } else if (column.id === 'done') {
          // Get completed tasks from all lists
          const allCompletedTasks: Task[] = [];
          Object.values(tasksByList).forEach(tasks => {
            const completedTasks = tasks
              .filter(task => task.completed)
              .map(task => {
                // Parse start date from notes
                const startDateMatch = task.notes?.match(/📅 Start: (\d{4}-\d{2}-\d{2})/);
                const startDate = startDateMatch ? new Date(startDateMatch[1]) : null;
                
                return {
                  id: task.id,
                  content: task.title,
                  dueDate: task.due ? new Date(task.due) : null,
                  startDate: startDate,
                  isRecurring: task.recurrence ? true : false,
                  notes: task.notes || '',
                  color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#66BB6A',
                  status: 'completed' as const,
                  completedAt: task.completed ? new Date(task.completed) : null,
                  accountEmail: task.accountEmail,
                  accountName: task.accountName,
                  accountPicture: task.accountPicture
                };
              });
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
  }, []);

  const refreshTasks = useCallback(async () => {
    console.log('refreshTasks called, googleAccounts.length:', googleAccounts.length, 'isRefreshing:', isRefreshing);
    
    if (googleAccounts.length === 0) {
      console.log('No Google accounts, skipping refresh');
      setIsRefreshing(false);
      setIsInitialLoad(false); // Mark initial load as complete when no accounts
      return;
    }
    
    if (isRefreshing) {
      console.log('Already refreshing, skipping');
      setIsInitialLoad(false); // Mark initial load as complete even if already refreshing
      return;
    }

    try {
      console.log('Starting refresh...');
      setIsRefreshing(true);

      // Fetch tasks for all accounts (not just the active one)
      const allTasksPromises = googleAccounts.map(async (account, index) => {
        try {
          // Skip expired accounts
          if (account.status === 'expired') {
            return null;
          }

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
            
            // Mark account as expired instead of removing it
            setGoogleAccounts(prevAccounts => {
              const newAccounts = [...prevAccounts];
              newAccounts[index] = {
                ...newAccounts[index],
                status: 'expired',
                token: null
              };
              return newAccounts;
            });
            
            // Add to expired accounts list
            setExpiredAccounts(prev => [...prev, account.user.email]);
            
            // Mark as expired in database
            if (user) {
              try {
                await apiService.expireConnection(user.email, account.user.email);
              } catch (removeError) {
                console.error('Error marking connection as expired:', removeError);
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
        // All tokens are expired, but don't clear accounts
        setIsRefreshing(false);
        setIsInitialLoad(false); // Mark initial load as complete even if all tokens are expired
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
      console.log('Refresh completed successfully');
      

      
      setIsRefreshing(false);
      setIsInitialLoad(false); // Always mark initial load as complete
    } catch (error) {
      console.error('Error refreshing tasks:', error);
      setIsRefreshing(false);
      setIsInitialLoad(false); // Always mark initial load as complete, even on error
    }
  }, [googleAccounts.length, activeAccountIndex, user, updateColumnsWithTasks]);

  // Enhanced auto-refresh with better interval management
  useEffect(() => {
    if (googleAccounts.length > 0) {
      // Set up auto-refresh every 30 seconds (increased from 15 for better performance)
      const interval = setInterval(refreshTasks, 30000);
      setRefreshInterval(interval);

      return () => {
        if (interval) {
          clearInterval(interval);
        }
      };
    }
  }, [googleAccounts.length, activeAccountIndex, refreshTasks]);

  // Enhanced sync functionality with multiple triggers
  useEffect(() => {
    if (googleAccounts.length > 0) {
      // Smart sync intervals - more frequent when active, less when idle
      let syncInterval: NodeJS.Timeout;
      let isPageActive = true;
      let lastActivity = Date.now();
      
      const handleVisibilityChange = () => {
        isPageActive = !document.hidden;
        if (isPageActive) {
          // Sync immediately when page becomes visible
          console.log('Page became visible, triggering sync...');
          refreshTasks();
          // Reset to active interval
          syncInterval = setInterval(refreshTasks, 15000); // More frequent when active
        } else {
          // Less frequent when page is hidden
          if (syncInterval) clearInterval(syncInterval);
          syncInterval = setInterval(refreshTasks, 60000); // Less frequent when idle
        }
      };

      const handleUserActivity = () => {
        lastActivity = Date.now();
        // If we haven't synced in the last 10 seconds, sync now
        if (Date.now() - lastActivity > 10000) {
          refreshTasks();
        }
      };

      // Set up event listeners
      document.addEventListener('visibilitychange', handleVisibilityChange);
      document.addEventListener('mousemove', handleUserActivity);
      document.addEventListener('keydown', handleUserActivity);
      document.addEventListener('click', handleUserActivity);
      document.addEventListener('focus', handleUserActivity);

      // Initial sync interval (active state)
      syncInterval = setInterval(refreshTasks, 15000);

      return () => {
        if (syncInterval) clearInterval(syncInterval);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        document.removeEventListener('mousemove', handleUserActivity);
        document.removeEventListener('keydown', handleUserActivity);
        document.removeEventListener('click', handleUserActivity);
        document.removeEventListener('focus', handleUserActivity);
      };
    }
  }, [googleAccounts.length, activeAccountIndex, refreshTasks]);

  // Enhanced manual sync function with better feedback
  const handleManualSync = useCallback(async () => {
    if (isRefreshing) {
      console.log('Sync already in progress...');
      return;
    }

    console.log('Manual sync triggered...');
    setLastRefreshTime(new Date());
    await refreshTasks();
  }, [isRefreshing, refreshTasks]);

  // Enhanced sync after user actions
  const syncAfterAction = useCallback(async () => {
    // Debounce sync calls to avoid too many API requests
    if (refreshInterval) {
      clearTimeout(refreshInterval);
    }
    
    const timeoutId = setTimeout(() => {
      if (googleAccounts.length > 0 && !isRefreshing) {
        console.log('Syncing after user action...');
        refreshTasks();
      }
    }, 2000); // Wait 2 seconds after last action before syncing
    
    setRefreshInterval(timeoutId);
  }, [googleAccounts.length, isRefreshing, refreshTasks]);

  const handleTaskCompletionToggle = useCallback(async (task: Task, isCompleted: boolean) => {
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
    
    // Trigger sync after task completion toggle
    syncAfterAction();
  }, [googleAccounts, activeAccountIndex, syncAfterAction]);

  const handleLimitChange = useCallback((columnId: string, newLimit: number) => {
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
  }, [googleAccounts]);

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

  // Helper function to group tasks by date sections - optimized with useMemo
  const groupTasksByDate = useMemo(() => (tasks: Task[]): DateSection[] => {
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
  }, []);

  // Helper function to render date section header - optimized with useCallback
  const renderDateSectionHeader = useCallback((section: DateSection) => {
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
  }, []);

  const renderColumnHeader = useCallback((column: Column) => (
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
  ), [dateGroupingEnabled, handleLimitChange]);

  const renderColumn = useCallback((column: Column) => {
    // Apply limit for done column
    const displayTasks = column.id === 'done' ? 
      (column.limit && column.limit > 0 ? column.tasks.slice(0, column.limit) : 
       column.limit === -1 ? column.tasks : column.tasks.slice(0, 3)) : 
      column.tasks;

    const filteredTasks = filterTasks(displayTasks);
    
    // Performance optimization: limit tasks rendered at once for large lists
    const maxTasksToRender = 50;
    const tasksToRender = filteredTasks.length > maxTasksToRender 
      ? filteredTasks.slice(0, maxTasksToRender) 
      : filteredTasks;

    // Define column widths based on column type
    const getColumnWidth = () => {
      switch (column.id) {
        case 'todo':
          return { flex: 2, minWidth: 400 }; // Wider for todo column
        case 'done':
          return { flex: 0.6, minWidth: 250 }; // Smaller for done column
        default:
          return { flex: 1, minWidth: 300 }; // Default for other columns
      }
    };

    const columnWidth = getColumnWidth();

    return (
      <Paper
        key={column.id}
        sx={{
          p: 2,
          ...columnWidth,
          maxWidth: 'none',
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
            {groupTasksByDate(tasksToRender).map((section) => (
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
  }, [filterTasks, dragOverColumn, draggedTask, dateGroupingEnabled, groupTasksByDate, renderDateSectionHeader, renderColumnHeader, handleDragOver, handleDragLeave, handleDrop, renderTask]);

  const renderKanbanView = useCallback(() => (
    <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
      {columns.map(column => renderColumn(column))}
    </Box>
  ), [columns, renderColumn]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === 'q' &&
        !e.repeat &&
        document.activeElement &&
        ['INPUT', 'TEXTAREA'].indexOf((document.activeElement as HTMLElement).tagName) === -1
      ) {
        setOpenNewTaskDialog(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Debounce search query for better performance
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Settings management functions
  const handleOpenSettings = async () => {
    if (!user?.email) return;
    setIsLoadingSettings(true);
    try {
      // Always use the main user email for API key storage (not individual account emails)
      const apiKey = await apiService.getApiKey(user.email, user.email);
      setGeminiApiKey(apiKey || '');
    } catch (error) {
      console.error('Error loading API key:', error);
      setGeminiApiKey('');
    } finally {
      setIsLoadingSettings(false);
    }
    setSettingsOpen(true);
  };

  // Enhanced handleSaveSettings with API key status update
  const handleSaveSettings = async () => {
    if (!user) return;
    setIsLoadingSettings(true);
    try {
      // Always save API key with main user email (not individual account emails)
      const response = await apiService.saveApiKey(user.email, user.email, geminiApiKey);
      if (response.success) {
        const newStatus = geminiApiKey && geminiApiKey.trim() !== '' ? 'configured' : 'not-configured';
        setApiKeyStatus(newStatus);
        setSettingsOpen(false);
        setSnackbar({ open: true, message: 'Klucz API został zapisany pomyślnie!', severity: 'success' });
      } else {
        setSnackbar({ open: true, message: 'Nie udało się zapisać klucza API.', severity: 'error' });
      }
    } catch (error) {
      setSnackbar({ open: true, message: 'Błąd podczas zapisywania klucza API.', severity: 'error' });
      console.error('Error saving API key:', error);
    } finally {
      setIsLoadingSettings(false);
    }
  };

  const handleCloseSettings = () => {
    setSettingsOpen(false);
  };

  // AI Summary function
  const generateAISummary = async (tasks: Task[]) => {
    if (!user?.email || tasks.length === 0) return;
    
    // Check if API key is configured before making the request
    if (geminiApiKey === '') {
      setSummaryError('Skonfiguruj swój klucz API Gemini w Ustawieniach, aby korzystać z funkcji AI');
      return;
    }
    
    setIsGeneratingSummary(true);
    setSummaryError(null);
    
    try {
      // Always use main user email for API key lookup
      const response = await apiService.generateTaskSummary(user.email, tasks, user.email);
      setAiSummary(response);
    } catch (error: any) {
      console.error('Error generating AI summary:', error);
      
      // Handle specific error cases
      if (error.message?.includes('400')) {
        setSummaryError('Klucz API Gemini nie jest skonfigurowany. Dodaj swój klucz API w Ustawieniach.');
      } else if (error.message?.includes('500')) {
        setSummaryError('Błąd serwera. Spróbuj ponownie później lub sprawdź swój klucz API.');
      } else {
        setSummaryError(error.message || 'Nie udało się wygenerować podsumowania AI. Sprawdź konfigurację klucza API.');
      }
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  // AI Chat function
  const sendChatMessage = async (message: string) => {
    if (!user?.email || !message.trim()) return;
    
    // Check if API key is configured
    if (geminiApiKey === '') {
      setSnackbar({ open: true, message: 'Skonfiguruj swój klucz API Gemini w Ustawieniach', severity: 'error' });
      return;
    }
    
    // Add user message to chat
    const userMessage = { type: 'user' as const, message: message.trim(), timestamp: new Date() };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    setIsChatLoading(true);
    
    try {
      // Get current tasks for context
      const currentTasks = columns.reduce((acc: Task[], column) => {
        if (column.id !== 'done') {
          return [...acc, ...column.tasks];
        }
        return acc;
      }, []);
      
      const response = await apiService.chatWithAI(user.email, currentTasks, message.trim(), user.email);
      
      // Add AI response to chat
      const aiMessage = { type: 'ai' as const, message: response.response, timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMessage]);
    } catch (error: any) {
      console.error('Error chatting with AI:', error);
      const errorMessage = { type: 'ai' as const, message: 'Przepraszam, wystąpił błąd podczas generowania odpowiedzi.', timestamp: new Date() };
      setChatMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsChatLoading(false);
    }
  };

  // Notes functions
  const saveNote = async () => {
    if (!user?.email || !notes.trim()) return;
    
    setIsSavingNote(true);
    try {
      await apiService.updateUserSetting(user.email, 'daily_notes', notes.trim());
      setSnackbar({ open: true, message: 'Notatka została zapisana!', severity: 'success' });
      // Note saved successfully
    } catch (error) {
      console.error('Error saving note:', error);
      setSnackbar({ open: true, message: 'Błąd podczas zapisywania notatki', severity: 'error' });
    } finally {
      setIsSavingNote(false);
    }
  };

  const loadNote = async () => {
    if (!user?.email) return;
    
    try {
      const response = await apiService.getUserSettings(user.email);
      if (response.settings?.daily_notes) {
        setNotes(response.settings.daily_notes);
      }
    } catch (error) {
      console.error('Error loading note:', error);
    }
  };



  // Add apiService methods for expiring/activating connections
  apiService.expireConnection = async (mainUserEmail: string, gtaskAccountEmail: string) => {
    await fetch(`${API_BASE_URL}/connections/${encodeURIComponent(mainUserEmail)}/${encodeURIComponent(gtaskAccountEmail)}/expire`, { method: 'PUT' });
  };
  apiService.activateConnection = async (mainUserEmail: string, gtaskAccountEmail: string) => {
    await fetch(`${API_BASE_URL}/connections/${encodeURIComponent(mainUserEmail)}/${encodeURIComponent(gtaskAccountEmail)}/activate`, { method: 'PUT' });
  };

  // Add handleReconnectGoogleTasksAccount
  const handleReconnectGoogleTasksAccount = (userData: User) => {
    setTempUserData(userData);
    setGoogleTasksLoading(true);
    loginGoogleTasksForReconnect();
  };

  // Add loginGoogleTasksForReconnect hook
  const loginGoogleTasksForReconnect = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/tasks',
    onSuccess: async (tokenResponse) => {
      try {
        if (!tempUserData || !user) throw new Error('No user data available');
        // Update token in DB and set status to active
        await apiService.addConnection(
          user.email, // main user email
          tempUserData.email, // Google Tasks account email
          tempUserData.name,
          tempUserData.picture,
          tokenResponse.access_token
        );
        await apiService.activateConnection(user.email, tempUserData.email);
        // Update local state
        setGoogleAccounts(prevAccounts => prevAccounts.map(acc =>
          acc.user.email === tempUserData.email
            ? { ...acc, token: tokenResponse.access_token, status: 'active' }
            : acc
        ));
        setGoogleTasksLoading(false);
        setTempUserData(null);
      } catch (error) {
        console.error('Error reconnecting account:', error);
        setGoogleTasksLoading(false);
        setTempUserData(null);
      }
    },
    onError: () => {
      setGoogleTasksLoading(false);
      setTempUserData(null);
      alert('Google Tasks reconnection failed.');
    },
    flow: 'implicit',
  });

  // Check API key status on app load or when user/account changes
  useEffect(() => {
    const checkApiKeyStatus = async () => {
      if (user) {
        try {
          // Always check API key status using main user email
          const apiKey = await apiService.getApiKey(user.email, user.email);
          setApiKeyStatus(apiKey && apiKey.trim() !== '' ? 'configured' : 'not-configured');
          if (apiKey) setGeminiApiKey(apiKey);
        } catch (error) {
          setApiKeyStatus('not-configured');
        }
      } else {
        setApiKeyStatus('not-configured');
      }
    };
    checkApiKeyStatus();
  }, [user]);

  const renderGanttView = () => {
    // Get all tasks directly from Google Tasks to avoid column limits
    let allTasks: Task[] = [];
    
    if (googleAccounts.length > 0) {
      // Get all tasks from all accounts and lists
      googleAccounts.forEach(account => {
        Object.values(account.tasks).forEach(tasks => {
          const mappedTasks = tasks
            .filter(task => task.due) // Only tasks with due dates
            .map(task => {
              // Parse start date from notes
              const startDateMatch = task.notes?.match(/📅 Start: (\d{4}-\d{2}-\d{2})/);
              const startDate = startDateMatch ? new Date(startDateMatch[1]) : null;
              
              return {
                id: task.id,
                content: task.title,
                dueDate: task.due ? new Date(task.due) : null,
                startDate: startDate,
                isRecurring: task.recurrence ? true : false,
                notes: task.notes || '',
                color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#42A5F5',
                status: task.completed ? 'completed' as const : 
                       (task.notes && task.notes.includes('⚡ Active')) ? 'in-progress' as const : 'todo' as const,
                completedAt: task.completed ? new Date(task.completed) : null,
                accountEmail: task.accountEmail,
                accountName: task.accountName,
                accountPicture: task.accountPicture,
                dependencies: []
              };
            });
          allTasks = [...allTasks, ...mappedTasks];
        });
      });
    } else {
      // Fallback to columns if no Google Tasks
      allTasks = columns.reduce((acc: Task[], column) => {
        return [...acc, ...column.tasks];
      }, []);
    }

    // Filter tasks that have due dates
    const tasksWithDates = allTasks.filter(task => task.dueDate);

    const handleTaskClick = (task: Task) => {
      handleEditTask(task, 'gantt');
    };

    const handleTaskMove = async (taskId: string, newDueDate: Date) => {
      // Find the task in the columns
      let foundTask: Task | null = null;
      let foundColumnId = '';

      for (const column of columns) {
        const task = column.tasks.find(t => t.id === taskId);
        if (task) {
          foundTask = task;
          foundColumnId = column.id;
          break;
        }
      }

      if (!foundTask) {
        console.error('Task not found:', taskId);
        return;
      }

      // Update the task's due date (do not touch startDate)
      const updatedTask = { ...foundTask, dueDate: newDueDate };

      // Update local state immediately
      setColumns(prevColumns => 
        prevColumns.map(column => 
          column.id === foundColumnId
            ? {
                ...column,
                tasks: column.tasks.map(task => 
                  task.id === taskId ? updatedTask : task
                )
              }
            : column
        )
      );

      // Also update Google Tasks state immediately for live UI
      if (googleAccounts.length > 0) {
        setGoogleAccounts(prevAccounts => 
          prevAccounts.map(account => ({
            ...account,
            tasks: Object.fromEntries(
              Object.entries(account.tasks).map(([listId, tasks]) => [
                listId,
                tasks.map(task => 
                  task.id === taskId ? updatedTask : task
                )
              ])
            )
          }))
        );
      }

      // Sync with Google Tasks API if connected
      if (googleAccounts.length > 0 && foundTask.accountEmail) {
        try {
          let taskListId = '';
          let googleTaskId = '';
          for (const [listId, tasks] of Object.entries(googleAccounts[activeAccountIndex].tasks)) {
            const foundGoogleTask = tasks.find(t => t.id === taskId);
            if (foundGoogleTask) {
              taskListId = listId;
              googleTaskId = foundGoogleTask.id;
              break;
            }
          }
          if (taskListId && googleTaskId) {
            await axios.patch(
              `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${googleTaskId}`,
              { due: newDueDate.toISOString() },
              { headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` } }
            );
            console.log(`Task ${taskId} moved to ${newDueDate.toDateString()}`);
          }
        } catch (error) {
          console.error('Error updating task in Google Tasks:', error);
        }
      }
    };

    const handleTaskResize = async (taskId: string, newStartDate: Date, newDueDate: Date) => {
      // Find the task in the columns
      let foundTask: Task | null = null;
      let foundColumnId = '';
      for (const column of columns) {
        const task = column.tasks.find(t => t.id === taskId);
        if (task) {
          foundTask = task;
          foundColumnId = column.id;
          break;
        }
      }
      if (!foundTask) {
        console.error('Task not found:', taskId);
        return;
      }
      // Update the task's start and due date
      const updatedTask = { ...foundTask, startDate: newStartDate, dueDate: newDueDate };
      // Update local state immediately
      setColumns(prevColumns => 
        prevColumns.map(column => 
          column.id === foundColumnId
            ? {
                ...column,
                tasks: column.tasks.map(task => 
                  task.id === taskId ? updatedTask : task
                )
              }
            : column
        )
      );

      // Also update Google Tasks state immediately for live UI
      if (googleAccounts.length > 0) {
        setGoogleAccounts(prevAccounts => 
          prevAccounts.map(account => ({
            ...account,
            tasks: Object.fromEntries(
              Object.entries(account.tasks).map(([listId, tasks]) => [
                listId,
                tasks.map(task => {
                  if (task.id === taskId) {
                    // Update start date in notes
                    const startDateNote = `📅 Start: ${format(newStartDate, 'yyyy-MM-dd')}`;
                    let notes = task.notes || '';
                    notes = notes.replace(/📅 Start: \d{4}-\d{2}-\d{2}/g, '').trim();
                    if (notes) {
                      notes = `${notes}\n${startDateNote}`;
                    } else {
                      notes = startDateNote;
                    }
                    return { 
                      ...task, 
                      due: newDueDate.toISOString(),
                      notes: notes
                    };
                  }
                  return task;
                })
              ])
            )
          }))
        );
      }

      // Sync with Google Tasks API if connected
      if (googleAccounts.length > 0 && foundTask.accountEmail) {
        try {
          let taskListId = '';
          let googleTaskId = '';
          let currentTask = null;
          for (const [listId, tasks] of Object.entries(googleAccounts[activeAccountIndex].tasks)) {
            const foundGoogleTask = tasks.find(t => t.id === taskId);
            if (foundGoogleTask) {
              taskListId = listId;
              googleTaskId = foundGoogleTask.id;
              currentTask = foundGoogleTask;
              break;
            }
          }
          if (taskListId && googleTaskId && currentTask) {
            const update: any = { due: newDueDate.toISOString() };
            // Update start date in notes
            const startDateNote = `📅 Start: ${format(newStartDate, 'yyyy-MM-dd')}`;
            let notes = currentTask.notes || '';
            notes = notes.replace(/📅 Start: \d{4}-\d{2}-\d{2}/g, '').trim();
            if (notes) {
              notes = `${notes}\n${startDateNote}`;
            } else {
              notes = startDateNote;
            }
            update.notes = notes;
            await axios.patch(
              `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${googleTaskId}`,
              update,
              { headers: { Authorization: `Bearer ${googleAccounts[activeAccountIndex].token}` } }
            );
            console.log(`Task ${taskId} resized: ${format(newStartDate, 'yyyy-MM-dd')} to ${format(newDueDate, 'yyyy-MM-dd')}`);
          }
        } catch (error) {
          console.error('Error resizing task in Google Tasks:', error);
        }
      }
    };

    return (
      <Box sx={{ height: 'calc(100vh - 120px)', overflow: 'auto' }}>
        <GanttChart
          tasks={tasksWithDates}
          onTaskClick={handleTaskClick}
          onTaskMove={handleTaskMove}
          onTaskResize={handleTaskResize}
        />
      </Box>
    );
  };

  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });

  return (
    <ThemeProvider theme={theme}>
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
                  mr: 3,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1
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
                  className={viewMode === 'upcoming' ? 'active' : ''}
                  onClick={() => setViewMode('upcoming')}
                  title="Upcoming Tasks"
                >
                  <ScheduleIcon fontSize="small" />
                </IconButton>
                <IconButton 
                  className={viewMode === 'gantt' ? 'active' : ''}
                  onClick={() => setViewMode('gantt')}
                  title="Gantt Chart"
                >
                  <TimelineIcon fontSize="small" />
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
                  {/* Dark Mode Toggle */}
                  <IconButton
                    onClick={toggleDarkMode}
                    size="small"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      transition: 'all 0.3s ease',
                      padding: '8px',
                      '&:hover': {
                        color: '#fff',
                        transform: 'scale(1.1)',
                        background: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                    title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                  >
                    {darkMode ? <Brightness7Icon fontSize="small" /> : <Brightness4Icon fontSize="small" />}
                  </IconButton>

                  {/* Settings Button */}
                  <IconButton
                    onClick={handleOpenSettings}
                    size="small"
                    sx={{
                      color: 'rgba(255, 255, 255, 0.8)',
                      transition: 'all 0.3s ease',
                      padding: '8px',
                      '&:hover': {
                        color: '#fff',
                        transform: 'scale(1.1)',
                        background: 'rgba(255, 255, 255, 0.1)'
                      }
                    }}
                    title="Settings"
                  >
                    <SettingsIcon fontSize="small" />
                  </IconButton>

                  {/* API Key Status Indicator */}
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      px: 1,
                      py: 0.5,
                      borderRadius: 1,
                      bgcolor: apiKeyStatus === 'configured' 
                        ? 'rgba(76, 175, 80, 0.2)' 
                        : apiKeyStatus === 'checking'
                        ? 'rgba(255, 152, 0, 0.2)'
                        : 'rgba(244, 67, 54, 0.2)',
                      border: '1px solid',
                      borderColor: apiKeyStatus === 'configured' 
                        ? 'rgba(76, 175, 80, 0.4)' 
                        : apiKeyStatus === 'checking'
                        ? 'rgba(255, 152, 0, 0.4)'
                        : 'rgba(244, 67, 54, 0.4)',
                      minWidth: 24,
                      height: 24,
                      justifyContent: 'center'
                    }}
                    title={
                      apiKeyStatus === 'configured' 
                        ? 'Gemini API Key Configured' 
                        : apiKeyStatus === 'checking'
                        ? 'Checking API Key Status...'
                        : 'Gemini API Key Not Configured'
                    }
                  >
                    {apiKeyStatus === 'configured' ? (
                      <AutoAwesomeIcon 
                        fontSize="small" 
                        sx={{ color: '#4CAF50', fontSize: '1rem' }} 
                      />
                    ) : apiKeyStatus === 'checking' ? (
                      <CircularProgress size={12} sx={{ color: '#FF9800' }} />
                    ) : (
                      <AutoAwesomeIcon 
                        fontSize="small" 
                        sx={{ color: '#F44336', fontSize: '1rem' }} 
                      />
                    )}
                  </Box>

                  {/* Removed Sync Status Indicator - keeping only AI key status */}

                  <IconButton
                    onClick={handleManualSync}
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
                    title={`${isRefreshing ? 'Syncing...' : 'Sync Now'} (Last: ${lastRefreshTime ? format(lastRefreshTime, 'HH:mm') : 'Never'})`}
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
                    {viewMode === 'gantt' && renderGanttView()}
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
                startDate: null,
                isRecurring: false,
                dependencies: []
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
                    label="Start Date"
                    value={editTaskForm.startDate}
                    onChange={(date) => setEditTaskForm(prev => ({ ...prev, startDate: date }))}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
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
                    startDate: null,
                    isRecurring: false,
                    dependencies: []
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
                    label="Start Date"
                    value={newTaskForm.startDate}
                    onChange={(date) => setNewTaskForm(prev => ({ ...prev, startDate: date }))}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                      },
                    }}
                  />
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

          {/* Settings Dialog */}
          <Dialog
            open={settingsOpen}
            onClose={handleCloseSettings}
            maxWidth="sm"
            fullWidth
          >
            <DialogTitle>Settings</DialogTitle>
            <DialogContent>
              <Stack spacing={3} sx={{ mt: 1 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    Gemini API Configuration
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                    Add your Gemini API key to enable AI-powered features in the application.
                  </Typography>
                  <Typography variant="caption" color="primary" sx={{ mb: 2, display: 'block' }}>
                    💡 API key is shared across all Google Tasks accounts
                  </Typography>
                  <TextField
                    label="Gemini API Key"
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    fullWidth
                    type="password"
                    placeholder="Enter your Gemini API key"
                    helperText="Your API key will be stored securely and used only for AI features"
                    disabled={isLoadingSettings}
                  />
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Get your API key from{' '}
                    <a 
                      href="https://makersuite.google.com/app/apikey" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{ color: 'inherit', textDecoration: 'underline' }}
                    >
                      Google AI Studio
                    </a>
                  </Typography>
                </Box>
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={handleCloseSettings} disabled={isLoadingSettings}>
                Cancel
              </Button>
              <Button 
                onClick={handleSaveSettings} 
                variant="contained" 
                color="primary"
                disabled={isLoadingSettings}
                startIcon={isLoadingSettings ? <CircularProgress size={16} /> : null}
              >
                {isLoadingSettings ? 'Saving...' : 'Save Settings'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </GoogleOAuthProvider>
      {/* Snackbar for feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
      

    </ThemeProvider>
  );
}

export default App;
