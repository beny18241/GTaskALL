import { useState, useEffect } from 'react';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Paper, Stack, Avatar, Divider } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import StarIcon from '@mui/icons-material/Star';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EventIcon from '@mui/icons-material/Event';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format } from 'date-fns';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useGoogleLogin, googleLogout } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import LogoutIcon from '@mui/icons-material/Logout';

const drawerWidth = 240;

interface Task {
  id: string;
  content: string;
  dueDate?: Date | null;
}

interface Column {
  id: string;
  title: string;
  tasks: Task[];
}

interface User {
  name: string;
  email: string;
  picture: string;
}

const STORAGE_KEY = 'kanban-board-data';

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [columns, setColumns] = useState<Column[]>(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      return JSON.parse(savedData);
    }
    return [
      {
        id: 'todo',
        title: 'To Do',
        tasks: [
          { id: '1', content: 'Learn React' },
          { id: '2', content: 'Build Todo App' },
        ],
      },
      {
        id: 'inProgress',
        title: 'In Progress',
        tasks: [
          { id: '3', content: 'Design UI' },
        ],
      },
      {
        id: 'done',
        title: 'Done',
        tasks: [
          { id: '4', content: 'Setup Project' },
        ],
      },
    ];
  });
  const [openNewColumnDialog, setOpenNewColumnDialog] = useState(false);
  const [newColumnTitle, setNewColumnTitle] = useState('');
  const [deleteColumnId, setDeleteColumnId] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<{ task: Task; sourceColumnId: string } | null>(null);
  const [selectedTask, setSelectedTask] = useState<{ task: Task; columnId: string } | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [googleTasksToken, setGoogleTasksToken] = useState<string | null>(null);
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
        setGoogleTasksLoading(false);
      })
      .catch(() => {
        setGoogleTasksLoading(false);
        setGoogleTaskLists([]);
        setGoogleTasks({});
      });
  }, [googleTasksToken]);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleDragStart = (task: Task, columnId: string) => {
    setDraggedTask({ task, sourceColumnId: columnId });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetColumnId: string) => {
    if (!draggedTask) return;

    const { task, sourceColumnId } = draggedTask;
    
    if (sourceColumnId === targetColumnId) {
      setDraggedTask(null);
      return;
    }

    setColumns(columns.map(column => {
      if (column.id === sourceColumnId) {
        return {
          ...column,
          tasks: column.tasks.filter(t => t.id !== task.id)
        };
      }
      if (column.id === targetColumnId) {
        return {
          ...column,
          tasks: [...column.tasks, task]
        };
      }
      return column;
    }));

    setDraggedTask(null);
  };

  const handleAddColumn = () => {
    if (newColumnTitle.trim()) {
      const newColumn: Column = {
        id: `column-${Date.now()}`,
        title: newColumnTitle.trim(),
        tasks: [],
      };
      setColumns([...columns, newColumn]);
      setNewColumnTitle('');
      setOpenNewColumnDialog(false);
    }
  };

  const handleDeleteColumn = (columnId: string) => {
    setDeleteColumnId(columnId);
  };

  const confirmDeleteColumn = () => {
    if (deleteColumnId) {
      setColumns(columns.filter(col => col.id !== deleteColumnId));
      setDeleteColumnId(null);
    }
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
    setUser({
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
    });
  };

  const handleGoogleError = () => {
    console.log('Login Failed');
  };

  const handleLogout = () => {
    setUser(null);
  };

  const loginGoogleTasks = useGoogleLogin({
    scope: 'https://www.googleapis.com/auth/tasks.readonly',
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
    <div>
      <Toolbar />
      {user ? (
        <>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Avatar src={user.picture} alt={user.name} />
            <Box>
              <Typography variant="subtitle1">{user.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user.email}</Typography>
            </Box>
          </Box>
          <Divider />
          <List>
            <ListItem>
              <ListItemIcon>
                <DashboardIcon />
              </ListItemIcon>
              <ListItemText primary="Dashboard" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <CalendarTodayIcon />
              </ListItemIcon>
              <ListItemText primary="Calendar" />
            </ListItem>
            <ListItem>
              <ListItemIcon>
                <StarIcon />
              </ListItemIcon>
              <ListItemText primary="Important" />
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
                    sx={{ justifyContent: 'flex-start', textTransform: 'none', pr: 4 }}
                    onClick={() => {
                      setGoogleTasksToken(null);
                      googleLogout();
                    }}
                  >
                    Google Task account connected
                  </Button>
                  {googleTasksButtonHover && (
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
                  sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                  onClick={() => {
                    setGoogleTasksLoading(true);
                    loginGoogleTasks();
                  }}
                  disabled={googleTasksLoading}
                >
                  {googleTasksLoading ? 'Connecting...' : 'Connect Google Task account'}
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
              <ListItemText primary="Logout" />
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
    </div>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          ml: { sm: `${drawerWidth}px` },
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
        sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
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
              width: drawerWidth,
              position: 'fixed',
              left: 0,
              top: 64,
              height: 'calc(100% - 64px)',
              borderRight: '1px solid #e0e0e0',
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
                {googleTaskLists.map((list) => {
                  // Group tasks by date
                  const tasksByDate = (googleTasks[list.id] || []).reduce((acc: { [key: string]: any[] }, task) => {
                    const date = task.due ? format(new Date(task.due), 'yyyy-MM-dd') : 'no-date';
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
                      key={list.id}
                      sx={{
                        p: 2,
                        minWidth: 300,
                        maxWidth: 300,
                        height: 'fit-content',
                        bgcolor: 'background.paper'
                      }}
                    >
                      <Typography variant="h6" sx={{ mb: 2 }}>{list.title}</Typography>
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
                                bgcolor: date === 'no-date' ? 'grey.600' : 'primary.main',
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
                              {tasksByDate[date].map((task) => (
                                <Paper key={task.id} sx={{ p: 2 }}>
                                  <Typography variant="subtitle1">{task.title}</Typography>
                                  {task.notes && (
                                    <Typography variant="body2" color="text.secondary">
                                      {task.notes}
                                    </Typography>
                                  )}
                                  {task.due && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                                      <EventIcon fontSize="small" color="action" />
                                      <Typography variant="caption" color="text.secondary">
                                        {format(new Date(task.due), 'MMM d, yyyy')}
                                      </Typography>
                                    </Box>
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
          <Button onClick={confirmDeleteColumn} color="error" variant="contained">
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
