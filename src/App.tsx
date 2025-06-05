import { useState, useEffect } from 'react';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Paper, Stack } from '@mui/material';
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

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

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

  const drawer = (
    <div>
      <Toolbar />
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
      </List>
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
            '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
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
          width: { sm: `calc(100% - ${drawerWidth}px)` },
          mt: '64px',
        }}
      >
        <Box sx={{ display: 'flex', gap: 2, height: 'calc(100vh - 100px)' }}>
          {columns.map((column) => (
            <Paper
              key={column.id}
              elevation={1}
              sx={{
                flex: 1,
                backgroundColor: '#f5f5f5',
                borderRadius: 1,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                minWidth: '250px',
              }}
            >
              <Box 
                sx={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  mb: 2,
                  '&:hover .delete-button': {
                    opacity: 1,
                  }
                }}
              >
                <Typography variant="h6">
                  {column.title}
                </Typography>
                <IconButton
                  size="small"
                  onClick={() => handleDeleteColumn(column.id)}
                  sx={{ 
                    color: 'error.main',
                    opacity: 0,
                    transition: 'opacity 0.2s',
                  }}
                  className="delete-button"
                >
                  <DeleteIcon />
                </IconButton>
              </Box>
              <Box
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(column.id)}
                sx={{ 
                  flex: 1, 
                  overflowY: 'auto',
                  minHeight: '100px',
                  backgroundColor: 'rgba(0, 0, 0, 0.03)',
                  borderRadius: 1,
                  p: 1,
                }}
              >
                {column.tasks.map((task) => (
                  <Paper
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task, column.id)}
                    elevation={1}
                    sx={{
                      p: 2,
                      mb: 1,
                      backgroundColor: 'white',
                      cursor: 'grab',
                      userSelect: 'none',
                      '&:active': {
                        cursor: 'grabbing',
                      },
                      '&:hover': {
                        boxShadow: 2,
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      <Typography>{task.content}</Typography>
                      <Box 
                        sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          color: task.dueDate ? 'text.secondary' : 'text.disabled',
                          fontSize: '0.875rem',
                        }}
                      >
                        <EventIcon 
                          fontSize="small" 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask({ task, columnId: column.id });
                          }}
                          sx={{ 
                            cursor: 'pointer',
                            '&:hover': {
                              color: 'primary.main',
                            }
                          }}
                        />
                        {task.dueDate ? (
                          <Typography variant="body2">
                            Due: {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </Typography>
                        ) : (
                          <Typography variant="body2">Set due date</Typography>
                        )}
                      </Box>
                    </Stack>
                  </Paper>
                ))}
              </Box>
            </Paper>
          ))}
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={() => setOpenNewColumnDialog(true)}
            sx={{
              minWidth: '250px',
              height: 'fit-content',
              alignSelf: 'flex-start',
              mt: 2,
            }}
          >
            Add Column
          </Button>
        </Box>
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
