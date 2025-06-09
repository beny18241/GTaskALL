import { useState, useEffect } from 'react';
import { Box, CssBaseline, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemIcon, ListItemText, IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Paper, Stack, Avatar, Divider, Select, MenuItem } from '@mui/material';
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
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';

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

const STORAGE_KEY = 'kanban-board-data';
const USER_STORAGE_KEY = 'user-data';

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
        limit: 3, // Default limit for Done column
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
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(columns));
  }, [columns]);

  // Effect for fetching Google Tasks
  useEffect(() => {
    if (!googleTasksToken) return;

    setGoogleTasksLoading(true);

    // Fetch task lists
    axios.get('https://www.googleapis.com/tasks/v1/users/@me/lists', {
      headers: { Authorization: `Bearer ${googleTasksToken}` }
    })
      .then(response => {
        const taskLists = response.data.items || [];
        setGoogleTaskLists(taskLists);

        // Fetch tasks for each list
        const tasksPromises = taskLists.map(async (list: any) => {
          let allTasks: any[] = [];
          let pageToken: string | undefined;
          
          do {
            const response = await axios.get(`https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks`, {
              headers: { Authorization: `Bearer ${googleTasksToken}` },
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

        Promise.all(tasksPromises)
          .then((results: { listId: string; tasks: any[] }[]) => {
            const tasksByList: { [listId: string]: any[] } = {};
            results.forEach(({ listId, tasks }) => {
              tasksByList[listId] = tasks;
            });
            setGoogleTasks(tasksByList);

            // Map Google Tasks to local columns
            const mappedColumns = columns.map(column => {
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
                      status: 'todo' as const
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
                    color: '#42A5F5'
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
                      status: 'in-progress' as const
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
                      completedAt: task.completed ? new Date(task.completed) : null
                    }));
                  allCompletedTasks.push(...completedTasks);
                });
                
                // Sort by completion date (most recent first) and take last N tasks based on limit
                columnTasks = allCompletedTasks
                  .sort((a, b) => {
                    if (!a.completedAt || !b.completedAt) return 0;
                    return b.completedAt.getTime() - a.completedAt.getTime();
                  })
                  .slice(0, column.limit ?? 3);

                // If no tasks are completed yet or limit is 0, show a message
                if (columnTasks.length === 0 || column.limit === 0) {
                  columnTasks = [{
                    id: 'no-tasks',
                    content: 'No completed tasks yet',
                    status: 'completed' as const,
                    color: '#66BB6A'
                  }];
                }
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
      });
  }, [googleTasksToken]);

  // Effect to handle limit changes
  useEffect(() => {
    if (!googleTasksToken || !googleTasks) return;

    setColumns(prevColumns => {
      return prevColumns.map(column => {
        if (column.id === 'done') {
          // Get completed tasks from all lists
          const allCompletedTasks: Task[] = [];
          Object.values(googleTasks).forEach(tasks => {
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
                completedAt: task.completed ? new Date(task.completed) : null
              }));
            allCompletedTasks.push(...completedTasks);
          });
          
          // Sort by completion date (most recent first) and take last N tasks based on limit
          const columnTasks = allCompletedTasks
            .sort((a, b) => {
              if (!a.completedAt || !b.completedAt) return 0;
              return b.completedAt.getTime() - a.completedAt.getTime();
            })
            .slice(0, column.limit ?? 3);

          // If no tasks are completed yet or limit is 0, show a message
          if (columnTasks.length === 0 || column.limit === 0) {
            return {
              ...column,
              tasks: [{
                id: 'no-tasks',
                content: 'No completed tasks yet',
                status: 'completed' as const,
                color: '#66BB6A'
              }]
            };
          }

          return {
            ...column,
            tasks: columnTasks
          };
        }
        return column;
      });
    });
  }, [googleTasksToken, googleTasks, columns.find(col => col.id === 'done')?.limit]);

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
              headers: { Authorization: `Bearer ${googleTasksToken}` }
            }
          );

          // Update the local Google Tasks state with the response data
          setGoogleTasks(prevTasks => {
            const newTasks = { ...prevTasks };
            if (newTasks[taskListId]) {
              newTasks[taskListId] = newTasks[taskListId].map(t => 
                t.id === taskId 
                  ? { ...t, ...response.data }
                  : t
              );
            }
            return newTasks;
          });

          // Refresh the tasks data to ensure everything is in sync
          const taskListsResponse = await axios.get('https://www.googleapis.com/tasks/v1/users/@me/lists', {
            headers: { Authorization: `Bearer ${googleTasksToken}` }
          });

          const taskLists = taskListsResponse.data.items || [];
          const tasksPromises = taskLists.map(async (list: any) => {
            let allTasks: any[] = [];
            let pageToken: string | undefined;
            
            do {
              const response = await axios.get(`https://www.googleapis.com/tasks/v1/lists/${list.id}/tasks`, {
                headers: { Authorization: `Bearer ${googleTasksToken}` },
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
          setGoogleTasks(tasksByList);

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
                      status: 'todo' as const
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
                    color: '#42A5F5'
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
                      status: 'in-progress' as const
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
                      completedAt: task.completed ? new Date(task.completed) : null
                    }));
                  allCompletedTasks.push(...completedTasks);
                });
                
                // Sort by completion date (most recent first) and take last N tasks based on limit
                columnTasks = allCompletedTasks
                  .sort((a, b) => {
                    if (!a.completedAt || !b.completedAt) return 0;
                    return b.completedAt.getTime() - a.completedAt.getTime();
                  })
                  .slice(0, column.limit ?? 3);

                if (columnTasks.length === 0 || column.limit === 0) {
                  columnTasks = [{
                    id: 'no-tasks',
                    content: 'No completed tasks yet',
                    status: 'completed' as const,
                    color: '#66BB6A'
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
              completedAt: targetColumnId === 'done' ? new Date() : null
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
    if (googleTasksToken && task.listId) {
      try {
        axios.patch(
          `https://www.googleapis.com/tasks/v1/lists/${task.listId}/tasks/${task.id}`,
          {
            due: date ? date.toISOString() : null
          },
          {
            headers: { Authorization: `Bearer ${googleTasksToken}` }
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

  const handleGoogleSuccess = (credentialResponse: any) => {
    // In a real app, you would verify the token with your backend
    const decoded = JSON.parse(atob(credentialResponse.credential.split('.')[1]));
    const userData = {
      name: decoded.name,
      email: decoded.email,
      picture: decoded.picture,
    };
    setUser(userData);
    // Store the credential in localStorage
    localStorage.setItem('google-credential', credentialResponse.credential);
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
    localStorage.removeItem('google-credential');
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

  // Filter tasks based on search query
  const filterTasks = (tasks: Task[]) => {
    if (!searchQuery.trim()) return tasks;
    
    const query = searchQuery.toLowerCase();
    return tasks.filter(task => 
      task.content.toLowerCase().includes(query) ||
      (task.notes && task.notes.toLowerCase().includes(query))
    );
  };

  const renderTask = (task: Task, columnId: string) => {
    const isNoTask = task.id === 'no-tasks';
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'completed';
    
    const handleCheckboxClick = async (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent task selection when clicking checkbox
      if (googleTasksToken && task.listId) {
        try {
          // Update in Google Tasks
          const response = await axios.patch(
            `https://www.googleapis.com/tasks/v1/lists/${task.listId}/tasks/${task.id}`,
            {
              completed: new Date().toISOString(),
              status: 'completed'
            },
            {
              headers: { Authorization: `Bearer ${googleTasksToken}` }
            }
          );

          // Update local state
          setColumns(prevColumns => {
            return prevColumns.map(column => {
              if (column.id === columnId) {
                return {
                  ...column,
                  tasks: column.tasks.filter(t => t.id !== task.id)
                };
              }
              if (column.id === 'done') {
                return {
                  ...column,
                  tasks: [...column.tasks, { ...task, status: 'completed' as const, completedAt: new Date() }]
                };
              }
              return column;
            });
          });
        } catch (error) {
          console.error('Error marking task as completed:', error);
        }
      } else {
        // If not connected to Google Tasks, just update local state
        setColumns(prevColumns => {
          return prevColumns.map(column => {
            if (column.id === columnId) {
              return {
                ...column,
                tasks: column.tasks.filter(t => t.id !== task.id)
              };
            }
            if (column.id === 'done') {
              return {
                ...column,
                tasks: [...column.tasks, { ...task, status: 'completed' as const, completedAt: new Date() }]
              };
            }
            return column;
          });
        });
      }
    };
    
    return (
      <Paper 
        key={task.id}
        sx={{ 
          p: 1.5,
          cursor: 'grab',
          transition: 'all 0.2s ease',
          transform: task.isDragging ? 'scale(1.02)' : 'scale(1)',
          opacity: task.isDragging ? 0.5 : 1,
          boxShadow: task.isDragging ? 2 : 1,
          position: 'relative',
          '&:hover': {
            boxShadow: 2
          },
          borderLeft: task.color ? `4px solid ${task.color}` : 'none',
          bgcolor: task.color ? `${task.color}10` : 'background.paper',
          maxWidth: '100%',
          overflow: 'hidden',
          mb: 1
        }}
        draggable
        onDragStart={() => handleDragStart(task, columnId)}
        onDragOver={(e) => handleDragOver(e, columnId)}
        onDragLeave={handleDragLeave}
        onDrop={() => handleDrop(columnId)}
        onClick={() => setSelectedTask({ task, columnId })}
      >
        {/* Google Profile Badge */}
        {user && user.picture && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              zIndex: 1,
            }}
          >
            <Avatar
              src={user.picture}
              alt={user.name || 'User'}
              sx={{
                width: 24,
                height: 24,
                border: '2px solid',
                borderColor: 'background.paper',
                boxShadow: 1
              }}
            />
          </Box>
        )}

        {/* Checkbox */}
        {!isNoTask && columnId !== 'done' && (
          <Box
            sx={{
              position: 'absolute',
              top: 8,
              left: 8,
              zIndex: 1,
            }}
            onClick={handleCheckboxClick}
          >
            <IconButton
              size="small"
              sx={{
                bgcolor: 'background.paper',
                boxShadow: 1,
                '&:hover': {
                  bgcolor: 'action.hover',
                }
              }}
            >
              <CheckBoxOutlineBlankIcon fontSize="small" />
            </IconButton>
          </Box>
        )}

        {/* Task Content */}
        <Box sx={{ 
          pl: columnId === 'done' ? 0 : 4, // Add padding for checkbox
          pr: user?.picture ? 4 : 0, // Add padding for profile badge
        }}>
          <Typography variant="body1" sx={{ 
            fontWeight: 'medium',
            mb: 0.5,
            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
            color: task.status === 'completed' ? 'text.secondary' : 'text.primary'
          }}>
            {task.content}
          </Typography>
          {task.notes && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
              {task.notes}
            </Typography>
          )}
          {task.dueDate && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EventIcon fontSize="small" color={isOverdue ? 'error' : 'action'} />
              <Typography 
                variant="caption" 
                color={isOverdue ? 'error' : 'text.secondary'}
              >
                {format(task.dueDate, 'MMM d, yyyy')}
              </Typography>
            </Box>
          )}
        </Box>
      </Paper>
    );
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Box sx={{ display: 'flex' }}>
        <CssBaseline />
        <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
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
            <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
              Task Manager
            </Typography>
            {user ? (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar src={user.picture} alt={user.name} />
                <Typography variant="body1">{user.name}</Typography>
                <IconButton color="inherit" onClick={handleLogout}>
                  <LogoutIcon />
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
        
        {/* Add Search Bar */}
        <Box
          sx={{
            position: 'fixed',
            top: 64,
            left: isDrawerExpanded ? drawerWidth : collapsedDrawerWidth,
            right: 0,
            zIndex: (theme) => theme.zIndex.drawer,
            p: 2,
            bgcolor: 'background.paper',
            borderBottom: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 2,
            alignItems: 'center'
          }}
        >
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Search tasks by title or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary', pl: 1 }}>
                  <SearchIcon />
                  <FilterListIcon />
                </Box>
              ),
              endAdornment: searchQuery && (
                <IconButton
                  size="small"
                  onClick={() => setSearchQuery('')}
                  sx={{ 
                    color: 'text.secondary',
                    '&:hover': { color: 'primary.main' }
                  }}
                >
                  <ClearIcon />
                </IconButton>
              )
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                '&:hover fieldset': {
                  borderColor: 'primary.main',
                },
              },
            }}
          />
          <Button
            variant="outlined"
            startIcon={<AddIcon />}
            onClick={handleAddColumn}
            sx={{
              minWidth: 150,
              height: 56,
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
            width: { sm: `calc(100% - ${isDrawerExpanded ? drawerWidth : collapsedDrawerWidth}px)` },
            mt: '128px', // Increased to account for search bar
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
                          minWidth: 400,
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
                          '&::-webkit-scrollbar': {
                            width: '8px',
                          },
                          '&::-webkit-scrollbar-track': {
                            background: 'transparent',
                          },
                          '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(0,0,0,0.1)',
                            borderRadius: '4px',
                            '&:hover': {
                              background: 'rgba(0,0,0,0.2)',
                            },
                          },
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
                          p: 1.5,
                          borderRadius: 1,
                          bgcolor: 'action.hover',
                          '&:hover .delete-button': {
                            opacity: 1
                          },
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
                              <Typography variant="caption" color="text.secondary">
                                Limit:
                              </Typography>
                              <Box sx={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                border: '1px solid', 
                                borderColor: 'divider', 
                                borderRadius: 1,
                                bgcolor: 'background.paper'
                              }}>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const currentLimit = column.limit ?? 3;
                                    if (currentLimit > 0) {
                                      setColumns(columns.map(col => 
                                        col.id === 'done' 
                                          ? { ...col, limit: currentLimit - 1 }
                                          : col
                                      ));
                                    }
                                  }}
                                  sx={{ 
                                    p: 0.5,
                                    '&:hover': { bgcolor: 'action.hover' }
                                  }}
                                >
                                  <Typography variant="body2">−</Typography>
                                </IconButton>
                                <Typography 
                                  variant="body2" 
                                  sx={{ 
                                    px: 1,
                                    minWidth: '2ch',
                                    textAlign: 'center'
                                  }}
                                >
                                  {column.limit ?? 3}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => {
                                    const currentLimit = column.limit ?? 3;
                                    if (currentLimit < 50) {
                                      setColumns(columns.map(col => 
                                        col.id === 'done' 
                                          ? { ...col, limit: currentLimit + 1 }
                                          : col
                                      ));
                                    }
                                  }}
                                  sx={{ 
                                    p: 0.5,
                                    '&:hover': { bgcolor: 'action.hover' }
                                  }}
                                >
                                  <Typography variant="body2">+</Typography>
                                </IconButton>
                              </Box>
                            </Box>
                          )}
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
                                {filterTasks(tasksByDate[date]).map((task, taskIndex) => (
                                  renderTask(task, column.id)
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
      </Box>
    </GoogleOAuthProvider>
  );
}

export default App;
