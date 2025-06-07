import { useState, useEffect } from 'react';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Paper, Stack, Avatar, Divider } from '@mui/material';
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
import { format, addDays } from 'date-fns';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import LogoutIcon from '@mui/icons-material/Logout';

const drawerWidth = 240;
const collapsedDrawerWidth = 65;

interface Task {
  id: string;
  content: string;
  dueDate?: Date | null;
  isDragging?: boolean;
  isRecurring?: boolean;
  notes?: string;
  color?: string;
  status?: 'in-progress' | 'completed' | 'todo';
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
  isDragOver?: boolean;
}

interface User {
  name: string;
  email: string;
  picture: string;
}

const STORAGE_KEY = 'kanban-board-data';
const USER_STORAGE_KEY = 'gtaskall-user-data';

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(true);
  const [columns, setColumns] = useState<Column[]>(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      return JSON.parse(savedData);
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
  const [googleTasksToken, setGoogleTasksToken] = useState<string | null>(() => {
    const savedToken = localStorage.getItem('google-tasks-token');
    return savedToken || null;
  });
  const [googleTasksLoading, setGoogleTasksLoading] = useState(false);
  const [googleTaskLists, setGoogleTaskLists] = useState<any[]>([]);
  const [googleTasks, setGoogleTasks] = useState<{ [listId: string]: any[] }>({});
  const GOOGLE_CLIENT_ID = "251184335563-bdf3sv4vc1sr4v2itciiepd7fllvshec.apps.googleusercontent.com";
  const [googleTasksButtonHover, setGoogleTasksButtonHover] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  useEffect(() => {
    if (!googleTasksToken) {
      setGoogleTaskLists([]);
      setGoogleTasks({});
      return;
    }
    setGoogleTasksLoading(true);
    // Fetch task lists
    axios.get('https://www.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${googleTasksToken}` },
    })
      .then((res: any) => {
        setGoogleTaskLists(res.data.items || []);
        // Fetch tasks for each list
        return Promise.all(
          (res.data.items || []).map((list: any) =>
            axios.get(`https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks`, {
              headers: { Authorization: `Bearer ${googleTasksToken}` },
            }).then((tasksRes: any) => ({ listId: list.id, tasks: tasksRes.data.items || [] }))
          )
        );
      })
      .then((results: { listId: string; tasks: any[] }[]) => {
        const tasksByList: { [listId: string]: any[] } = {};
        results.forEach(({ listId, tasks }: { listId: string; tasks: any[] }) => {
          tasksByList[listId] = tasks;
        });
        setGoogleTasks(tasksByList);

        // Map Google Tasks to local columns
        const mappedColumns = columns.map(column => {
          let columnTasks: Task[] = [];
          
          // Map tasks based on column type
          if (column.id === 'todo') {
            // Get tasks from the first list or uncompleted tasks without "In Progress" note
            const firstListId = Object.keys(tasksByList)[0];
            if (firstListId) {
              columnTasks = tasksByList[firstListId]
                .filter(task => !task.completed && (!task.notes || !task.notes.includes('⚡ Active')))
                .map(task => ({
                  id: task.id,
                  content: task.title,
                  dueDate: task.due ? new Date(task.due) : null,
                  isRecurring: task.recurrence ? true : false,
                  notes: task.notes || '',
                  color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#42A5F5',
                  status: 'todo' as const
                }));
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
                  status: 'in-progress' as const
                }));
              columnTasks = [...columnTasks, ...inProgressTasks];
            });
          } else if (column.id === 'done') {
            // Get completed tasks from all lists
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
                  status: 'completed' as const
                }));
              columnTasks = [...columnTasks, ...completedTasks];
            });
          } else {
            // For custom columns, get tasks from remaining lists
            const remainingListIds = Object.keys(tasksByList).slice(2);
            remainingListIds.forEach(listId => {
              const listTasks = tasksByList[listId]
                .filter(task => !task.completed && (!task.notes || !task.notes.includes('🔄 In Progress')))
                .map(task => ({
                  id: task.id,
                  content: task.title,
                  dueDate: task.due ? new Date(task.due) : null,
                  isRecurring: task.recurrence ? true : false,
                  notes: task.notes || '',
                  color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#42A5F5',
                  status: 'todo' as const
                }));
              columnTasks = [...columnTasks, ...listTasks];
            });
          }

          return {
            ...column,
            tasks: columnTasks
          };
        });

        setColumns(mappedColumns);
        setGoogleTasksLoading(false);
      })
      .catch(() => {
        setGoogleTasksLoading(false);
        setGoogleTaskLists([]);
        setGoogleTasks({});
      });
  }, [googleTasksToken]);

  // Save user data to localStorage whenever it changes
  useEffect(() => {
    if (user) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  }, [user]);

  // Save token to localStorage whenever it changes
  useEffect(() => {
    if (googleTasksToken) {
      localStorage.setItem('google-tasks-token', googleTasksToken);
    } else {
      localStorage.removeItem('google-tasks-token');
    }
  }, [googleTasksToken]);

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

    // Update local state first
    setColumns(columns.map(column => {
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
                 targetColumnId === 'done' ? 'completed' as const : 'todo' as const
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
    }));

    // Sync with Google Tasks if connected
    if (googleTasksToken) {
      try {
        // Find the task in Google Tasks
        let taskListId = '';
        let taskId = '';
        
        // Search through all task lists to find the task
        for (const [listId, tasks] of Object.entries(googleTasks)) {
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
            update.status = 'completed';
            update.notes = ''; // Clear any notes
          } else if (targetColumnId === 'inProgress') {
            // Add "Active" note with icon
            update.notes = '⚡ Active';
            update.status = 'needsAction';
          } else {
            // Reset status and remove notes
            update.status = 'needsAction';
            update.notes = '';
          }

          // Update the task in Google Tasks
          await axios.patch(
            `https://www.googleapis.com/tasks/v1/lists/${taskListId}/tasks/${taskId}`,
            update,
            {
              headers: { Authorization: `Bearer ${googleTasksToken}` }
            }
          );

          // Refresh Google Tasks data
          const taskListsResponse = await axios.get('https://www.googleapis.com/tasks/v1/users/@me/lists', {
            headers: { Authorization: `Bearer ${googleTasksToken}` }
          });

          const taskLists = taskListsResponse.data.items || [];
          const tasksPromises = taskLists.map((list: any) =>
            axios.get(`https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks`, {
              headers: { Authorization: `Bearer ${googleTasksToken}` }
            }).then((tasksRes: any) => ({ listId: list.id, tasks: tasksRes.data.items || [] }))
          );

          const results = await Promise.all(tasksPromises);
          const tasksByList: { [listId: string]: any[] } = {};
          results.forEach(({ listId, tasks }) => {
            tasksByList[listId] = tasks;
          });

          // Update local state with fresh data
          const mappedColumns = columns.map(column => {
            let columnTasks: Task[] = [];
            
            if (column.id === 'todo') {
              // Get tasks from the first list or uncompleted tasks without "In Progress" note
              const firstListId = Object.keys(tasksByList)[0];
              if (firstListId) {
                columnTasks = tasksByList[firstListId]
                  .filter(task => !task.completed && (!task.notes || !task.notes.includes('⚡ Active')))
                  .map(task => ({
                    id: task.id,
                    content: task.title,
                    dueDate: task.due ? new Date(task.due) : null,
                    isRecurring: task.recurrence ? true : false,
                    notes: task.notes || '',
                    color: task.notes?.match(/#([A-Fa-f0-9]{6})/)?.[1] ? `#${task.notes.match(/#([A-Fa-f0-9]{6})/)[1]}` : '#42A5F5',
                    status: 'todo' as const
                  }));
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
                    status: 'in-progress' as const
                  }));
                columnTasks = [...columnTasks, ...inProgressTasks];
              });
            } else if (column.id === 'done') {
              // Get completed tasks from all lists
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
                    status: 'completed' as const
                  }));
                columnTasks = [...columnTasks, ...completedTasks];
              });
            }

            return {
              ...column,
              tasks: columnTasks
            };
          });

          setColumns(mappedColumns);
        }
      } catch (error) {
        console.error('Error syncing with Google Tasks:', error);
        // Optionally show an error message to the user
      }
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

  const handleDateChange = (date: Date | null) => {
    if (!selectedTask) return;

    setColumns(columns.map(column => {
      if (column.id === selectedTask.columnId) {
        return {
          ...column,
          tasks: column.tasks.map(task => 
            task.id === selectedTask.task.id 
              ? { ...task, dueDate: date }
              : task
          )
        };
      }
      return column;
    }));

    setSelectedTask(null);
  };

  const handleGoogleSuccess = (credentialResponse: any) => {
    // In a real app, you would verify the token with your backend
    const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
    const userData = {
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
    };
    setUser(userData);
    setGoogleTasksToken(credentialResponse.credential);
  };

  const handleGoogleError = () => {
    console.log('Login Failed');
  };

  const handleLogout = () => {
    googleLogout();
    setUser(null);
    setGoogleTasksToken(null);
    setGoogleTaskLists([]);
    setGoogleTasks({});
    // Clear all stored data
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem('google-tasks-token');
  };

  const loginGoogleTasks = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/tasks',
    onSuccess: (tokenResponse) => {
      setGoogleTasksToken(tokenResponse.access_token);
      setGoogleTasksLoading(false);
    },
    onError: () => {
      setGoogleTasksLoading(false);
      alert('Google Tasks connection failed.');
    },
    flow: 'implicit',
  });

  const drawer = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', p: 1 }}>
        <IconButton onClick={handleDrawerExpandToggle}>
          {isDrawerExpanded ? <ChevronLeftIcon /> : <ChevronRightIcon />}
        </IconButton>
      </Box>
      {user ? (
        <>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={user.picture} alt={user.name} />
            {isDrawerExpanded && (
              <Box>
                <Typography variant="subtitle1">{user.name}</Typography>
                <Typography variant="body2" color="text.secondary">{user.email}</Typography>
              </Box>
            )}
          </Box>
          <Divider />
          <List>
            <ListItem>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              {isDrawerExpanded && <ListItemText primary="Dashboard" />}
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CalendarTodayIcon />
              </ListItemIcon>
              {isDrawerExpanded && <ListItemText primary="Calendar" />}
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <StarIcon />
              </ListItemIcon>
              {isDrawerExpanded && <ListItemText primary="Important" />}
            </ListItem>
            <Divider sx={{ my: 2 }} />
            <ListItem>
              {googleTasksToken ? (
                <Box
                  sx={{ position: 'relative', width: '100%' }}
                  onMouseEnter={() => setGoogleTasksButtonHover(true)}
                  onMouseLeave={() => setGoogleTasksButtonHover(false)}
                >
                  <Button
                    variant="contained"
                    color="success"
                    fullWidth
                    startIcon={
                      user?.picture ? (
                        <Avatar src={user.picture} alt={user.name} sx={{ width: 24, height: 24 }} />
                      ) : (
                        <img src="/check-circle.svg" alt="Google Tasks" style={{ width: 20, height: 20 }} />
                      )
                    }
                    sx={{ 
                      justifyContent: 'flex-start', 
                      textTransform: 'none', 
                      pr: 4,
                      minWidth: isDrawerExpanded ? 'auto' : '40px',
                      width: isDrawerExpanded ? '100%' : '40px',
                      '& .MuiButton-startIcon': {
                        margin: isDrawerExpanded ? '0 8px 0 -4px' : 0
                      }
                    }}
                    onClick={() => {
                      setGoogleTasksToken(null);
                      googleLogout();
                    }}
                  >
                    {isDrawerExpanded && "Google Task account connected"}
                  </Button>
                  {googleTasksButtonHover && isDrawerExpanded && (
                    <IconButton
                      size="small"
                      color="error"
                      sx={{
                        position: 'absolute',
                        right: 2,
                        top: 2,
                        width: 24,
                        height: 24,
                        bgcolor: 'background.paper',
                        boxShadow: 1,
                        zIndex: 2,
                      }}
                      onClick={() => {
                        setGoogleTasksToken(null);
                        googleLogout();
                      }}
                    >
                      <LogoutIcon fontSize="inherit" />
                    </IconButton>
                  )}
                </Box>
              ) : (
                <Button
                  variant="outlined"
                  color="primary"
                  fullWidth
                  startIcon={<img src="/check-circle.svg" alt="Google Tasks" style={{ width: 20, height: 20 }} />}
                  sx={{ 
                    justifyContent: 'flex-start', 
                    textTransform: 'none',
                    minWidth: isDrawerExpanded ? 'auto' : '40px',
                    width: isDrawerExpanded ? '100%' : '40px',
                    '& .MuiButton-startIcon': {
                      margin: isDrawerExpanded ? '0 8px 0 -4px' : 0
                    }
                  }}
                  onClick={() => {
                    setGoogleTasksLoading(true);
                    loginGoogleTasks();
                  }}
                  disabled={googleTasksLoading}
                >
                  {isDrawerExpanded && (googleTasksLoading ? 'Connecting...' : 'Connect Google Task account')}
                </Button>
              )}
            </ListItem>
          </List>
          <Divider />
          <List>
            <ListItem 
              onClick={handleLogout}
              sx={{ cursor: 'pointer' }}
            >
              <ListItemIcon>
                <LogoutIcon />
              </ListItemIcon>
              {isDrawerExpanded && <ListItemText primary="Logout" />}
            </ListItem>
          </List>
        </>
      ) : (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Typography variant="h6" gutterBottom>
            Welcome to GTaskALL
          </Typography>
          <Typography>
            Sign in to manage your tasks
          </Typography>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleError}
            useOneTap
          />
        </Box>
      )}
    </Box>
  );

  const getDateColor = (date: string) => {
    if (date === 'no-date') return 'grey.600';
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    
    if (date === today) return 'error.main';
    if (date === tomorrow) return 'warning.main';
    return 'primary.main';
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${isDrawerExpanded ? drawerWidth : collapsedDrawerWidth}px)` },
          ml: { sm: `${isDrawerExpanded ? drawerWidth : collapsedDrawerWidth}px` },
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2, display: { sm: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <img src="/check-circle.svg" alt="GTaskALL" style={{ width: '32px', height: '32px' }} />
            <Typography variant="h6" noWrap component="div">
              GTaskALL
            </Typography>
          </Box>
        </Toolbar>
      </AppBar>
      <Box
        component="nav"
        sx={{ width: { sm: isDrawerExpanded ? drawerWidth : collapsedDrawerWidth }, flexShrink: { sm: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{
            keepMounted: true,
          }}
          sx={{
            display: { xs: 'block', sm: 'none' },
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
          }}
        >
          {drawer}
        </Drawer>
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              boxSizing: 'border-box',
              width: isDrawerExpanded ? drawerWidth : collapsedDrawerWidth,
              position: 'fixed',
              left: 0,
              top: 64,
              height: 'calc(100% - 64px)',
              borderRight: '1px solid #e0e0e0',
              transition: 'width 0.2s ease-in-out',
            },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: '100%',
          mt: '64px',
          minHeight: 'calc(100vh - 64px)',
          bgcolor: '#f5f5f5',
        }}
      >
        {user ? (
          googleTasksToken ? (
            googleTasksLoading ? (
              <Typography variant="h6">Loading Google Tasks...</Typography>
            ) : (
              <Box sx={{ display: 'flex', gap: 2, overflowX: 'auto', pb: 2 }}>
                {columns.map((column, index) => {
                  // Group tasks by date
                  const tasksByDate = column.tasks.reduce((acc: { [key: string]: Task[] }, task) => {
                    const date = task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : 'no-date';
                    if (!acc[date]) {
                      acc[date] = [];
                    }
                    acc[date].push(task);
                    return acc;
                  }, {});

                  // Sort dates
                  const sortedDates = Object.keys(tasksByDate).sort((a, b) => {
                    if (a === 'no-date') return 1;
                    if (b === 'no-date') return -1;
                    return new Date(a).getTime() - new Date(b).getTime();
                  });

                  return (
                    <Paper
                      key={column.id}
                      sx={{
                        p: 2,
                        minWidth: 300,
                        maxWidth: 300,
                        height: 'fit-content',
                        bgcolor: 'background.paper',
                        position: 'relative',
                        transition: 'all 0.2s ease',
                        transform: column.id === dragOverColumn ? 'scale(1.02)' : 'scale(1)',
                        boxShadow: column.id === dragOverColumn ? 3 : 1,
                        opacity: draggedTask && draggedTask.sourceColumnId === column.id ? 0.5 : 1
                      }}
                      onDragOver={(e) => handleDragOver(e, column.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={() => handleDrop(column.id)}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        mb: 2,
                        p: 1,
                        borderRadius: 1,
                        bgcolor: 'action.hover',
                        '&:hover .delete-button': {
                          opacity: 1
                        }
                      }}>
                        <Typography variant="h6">{column.title}</Typography>
                        {index > 0 && (
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteColumn(column.id)}
                            className="delete-button"
                            sx={{ 
                              ml: 1,
                              opacity: 0,
                              transition: 'opacity 0.2s ease-in-out',
                              '&:hover': {
                                bgcolor: 'error.light',
                                color: 'white'
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </Box>
                      <Stack spacing={2}>
                        {sortedDates.map((date) => (
                          <Box key={date}>
                            <Typography 
                              variant="subtitle2" 
                              sx={{ 
                                color: 'white',
                                mb: 1,
                                px: 1.5,
                                py: 0.75,
                                bgcolor: getDateColor(date),
                                borderRadius: 1,
                                fontWeight: 'bold',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                boxShadow: 1
                              }}
                            >
                              <EventIcon fontSize="small" />
                              {date === 'no-date' ? 'No Due Date' : format(new Date(date), 'MMM d, yyyy')}
                            </Typography>
                            <Stack spacing={1} sx={{ pl: 1 }}>
                              {tasksByDate[date].map((task, taskIndex) => (
                                <Paper 
                                  key={task.id}
                                  sx={{ 
                                    p: 2,
                                    cursor: 'grab',
                                    transition: 'all 0.2s ease',
                                    transform: task.isDragging ? 'scale(1.05)' : 'scale(1)',
                                    opacity: task.isDragging ? 0.5 : 1,
                                    boxShadow: task.isDragging ? 3 : 1,
                                    position: 'relative',
                                    '&:hover': {
                                      boxShadow: 2
                                    },
                                    borderLeft: task.color ? `4px solid ${task.color}` : 'none',
                                    bgcolor: task.color ? `${task.color}10` : 'background.paper',
                                    maxWidth: '100%',
                                    overflow: 'hidden'
                                  }}
                                  draggable
                                  onDragStart={() => handleDragStart(task, column.id)}
                                  onDragOver={(e) => handleDragOver(e, column.id, taskIndex)}
                                  onDragLeave={handleDragLeave}
                                  onDrop={() => handleDrop(column.id)}
                                >
                                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Typography variant="subtitle1" sx={{ wordBreak: 'break-word' }}>{task.content}</Typography>
                                    {task.isRecurring && (
                                      <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        bgcolor: 'primary.main',
                                        color: 'white',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: 1,
                                        fontSize: '0.75rem',
                                        flexShrink: 0
                                      }}>
                                        🔄 Recurring
                                      </Box>
                                    )}
                                    {task.status === 'in-progress' && (
                                      <Box sx={{ 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        bgcolor: 'warning.main',
                                        color: 'white',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: 1,
                                        fontSize: '0.75rem',
                                        flexShrink: 0
                                      }}>
                                        ⚡ Active
                                      </Box>
                                    )}
                                  </Box>
                                  {task.notes && (
                                    <Typography 
                                      variant="body2" 
                                      color="text.secondary"
                                      sx={{ 
                                        mb: 1,
                                        fontStyle: 'italic',
                                        borderLeft: '2px solid',
                                        borderColor: 'divider',
                                        pl: 1,
                                        wordBreak: 'break-word',
                                        maxHeight: '100px',
                                        overflow: 'auto'
                                      }}
                                    >
                                      {task.notes}
                                    </Typography>
                                  )}
                                  {task.dueDate && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                      <EventIcon fontSize="small" color="action" />
                                      <Typography variant="caption" color="text.secondary">
                                        {format(new Date(task.dueDate), 'MMM d, yyyy')}
                                      </Typography>
                                    </Box>
                                  )}
                                  {dragOverColumn === column.id && dragOverTaskIndex === taskIndex && (
                                    <Box
                                      sx={{
                                        position: 'absolute',
                                        left: 0,
                                        right: 0,
                                        top: -2,
                                        height: 4,
                                        bgcolor: 'primary.main',
                                        borderRadius: 1
                                      }}
                                    />
                                  )}
                                </Paper>
                              ))}
                            </Stack>
                          </Box>
                        ))}
                      </Stack>
                    </Paper>
                  );
                })}
                <Button
                  variant="outlined"
                  startIcon={<AddIcon />}
                  onClick={handleAddColumn}
                  sx={{
                    minWidth: 300,
                    height: 'fit-content',
                    borderStyle: 'dashed',
                    borderColor: 'primary.main',
                    color: 'primary.main',
                    '&:hover': {
                      borderStyle: 'dashed',
                      borderColor: 'primary.dark',
                      bgcolor: 'action.hover'
                    }
                  }}
                >
                  Add Column
                </Button>
              </Box>
            )
          ) : (
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'calc(100vh - 64px)',
              textAlign: 'center',
              p: 3,
            }}>
              <img src="/check-circle.svg" alt="Google Tasks" style={{ width: 80, height: 80, marginBottom: 16 }} />
              <Typography variant="h4" gutterBottom>
                Connect your Google Task account
              </Typography>
              <Typography variant="body1" color="text.secondary" paragraph>
                To use GTaskALL, please connect your Google Task account by clicking the button in the left menu.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Once connected, your Google Tasks will appear here.
              </Typography>
            </Box>
          )
        ) : (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 'calc(100vh - 64px)',
              textAlign: 'center',
              p: 3,
            }}
          >
            <img src="/check-circle.svg" alt="Logo" style={{ width: 120, height: 120, marginBottom: 2 }} />
            <Typography variant="h3" component="h1" gutterBottom>
              Welcome to GTaskALL
            </Typography>
            <Typography variant="h6" color="text.secondary" paragraph>
              Your all-in-one task management solution
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Sign in with your Google account to get started
            </Typography>
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
          <LocalizationProvider dateAdapter={AdapterDateFns}>
            <DatePicker
              label="Due Date"
              value={selectedTask?.task.dueDate || null}
              onChange={handleDateChange}
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
            onClick={() => handleDateChange(null)} 
            color="error"
          >
            Remove Date
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;
