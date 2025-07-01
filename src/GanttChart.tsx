import React, { useMemo, useState, useRef } from 'react';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import { format, addDays, differenceInDays, eachDayOfInterval, startOfDay, isAfter, isBefore } from 'date-fns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';
import TimelineIcon from '@mui/icons-material/Timeline';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';

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

interface GanttChartProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newDueDate: Date) => void;
  onTaskResize?: (taskId: string, newStartDate: Date, newDueDate: Date) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  onTaskClick,
  onTaskMove,
  onTaskResize,
}) => {
  // State for drag feedback and resize
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [resizingTask, setResizingTask] = useState<{ taskId: string; edge: 'start' | 'end' } | null>(null);
  const isDragging = useRef(false);
  const isResizing = useRef(false);

  const timelineData = useMemo(() => {
    const filteredTasks = tasks.filter(task => task.dueDate);
    
    console.log('Timeline tasks:', filteredTasks.length);
    console.log('All tasks:', tasks);
    
    const taskData = filteredTasks.map((task) => {
      const taskDate = task.dueDate ? new Date(task.dueDate) : new Date();
      const startDate = task.startDate ? new Date(task.startDate) : taskDate; // Use due date as start if no start date
      
      console.log(`Processing task: ${task.content}, startDate: ${startDate}, dueDate: ${taskDate}`);
      
      return {
        id: task.id,
        name: task.content.length > 25 ? task.content.substring(0, 25) + '...' : task.content,
        dueDate: taskDate,
        startDate: startDate,
        status: task.status,
        color: task.color || '#1976d2',
        accountEmail: task.accountEmail,
        accountName: task.accountName,
        accountPicture: task.accountPicture,
        fullContent: task.content,
        dependencies: task.dependencies || [],
      };
    });

    // Calculate timeline date range
    const pastDays = 7;
    const futureDays = 30;
    const timelineStart = addDays(new Date(), -pastDays);
    const timelineEnd = addDays(new Date(), futureDays);
    
    // Filter tasks to only include those within the timeline range
    const tasksInRange = taskData.filter(task => {
      const taskStartDate = startOfDay(task.startDate);
      const taskDueDate = startOfDay(task.dueDate);
      const rangeStart = startOfDay(timelineStart);
      const rangeEnd = startOfDay(timelineEnd);
      
      // Task is in range if it overlaps with the timeline at all
      return taskStartDate <= rangeEnd && taskDueDate >= rangeStart;
    });

    // Separate active and completed tasks
    const activeTasks = tasksInRange.filter(task => task.status !== 'completed');
    const completedTasks = tasksInRange.filter(task => task.status === 'completed');

    // Maintain original order for active tasks (don't sort by due date)
    const sortedActiveTasks = activeTasks;
    
    // Sort completed tasks by completion date (most recent first)
    const sortedCompletedTasks = completedTasks.sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

    return {
      active: sortedActiveTasks,
      completed: sortedCompletedTasks,
      all: [...sortedActiveTasks, ...sortedCompletedTasks]
    };
  }, [tasks]);

  const timelineDays = useMemo(() => {
    // Extend timeline to show past days (7 days before today) and future days
    const pastDays = 7;
    const futureDays = 30;
    const totalDays = pastDays + futureDays + 1; // +1 for today
    
    const timelineStart = addDays(new Date(), -pastDays);
    const days = Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));
    
    console.log('Timeline days:', days.length);
    console.log('Timeline range:', format(days[0], 'yyyy-MM-dd'), 'to', format(days[days.length - 1], 'yyyy-MM-dd'));
    
    return days;
  }, []);

  // Calculate task positions and connections
  const taskPositions = useMemo(() => {
    const positions: { [taskId: string]: { startDay: number; endDay: number; rowIndex: number } } = {};
    const connections: Array<{ from: string; to: string; fromPos: { x: number; y: number }; toPos: { x: number; y: number } }> = [];
    
    // Calculate positions for all tasks
    timelineData.all.forEach((task, index) => {
      // Use startOfDay to normalize dates for comparison
      const taskStartDate = startOfDay(task.startDate);
      const taskDueDate = startOfDay(task.dueDate);
      
      const startDayIndex = timelineDays.findIndex(day => 
        startOfDay(day).getTime() === taskStartDate.getTime()
      );
      const endDayIndex = timelineDays.findIndex(day => 
        startOfDay(day).getTime() === taskDueDate.getTime()
      );
      
      console.log(`Task ${task.name}: startDate=${format(taskStartDate, 'yyyy-MM-dd')}, dueDate=${format(taskDueDate, 'yyyy-MM-dd')}`);
      console.log(`Found indices: startDayIndex=${startDayIndex}, endDayIndex=${endDayIndex}`);
      
      if (startDayIndex !== -1 && endDayIndex !== -1) {
        positions[task.id] = {
          startDay: startDayIndex,
          endDay: endDayIndex,
          rowIndex: index
        };
      }
    });
    
    // Calculate connections between dependent tasks
    timelineData.all.forEach(task => {
      task.dependencies.forEach(depId => {
        const fromTask = positions[depId];
        const toTask = positions[task.id];
        
        if (fromTask && toTask) {
          const fromX = 220 + (fromTask.endDay * 64) + 32; // End of source task
          const fromY = 120 + (fromTask.rowIndex * 54) + 27; // Center of source task row
          const toX = 220 + (toTask.startDay * 64) + 32; // Start of target task
          const toY = 120 + (toTask.rowIndex * 54) + 27; // Center of target task row
          
          connections.push({
            from: depId,
            to: task.id,
            fromPos: { x: fromX, y: fromY },
            toPos: { x: toX, y: toY }
          });
        }
      });
    });
    
    return { positions, connections };
  }, [timelineData, timelineDays]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: '#4caf50', fontSize: 18 }} />;
      case 'in-progress':
        return <PauseCircleIcon sx={{ color: '#ff9800', fontSize: 18 }} />;
      default:
        return <RadioButtonUncheckedIcon sx={{ color: '#9e9e9e', fontSize: 18 }} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#4caf50';
      case 'in-progress':
        return '#ff9800';
      default:
        return '#9e9e9e';
    }
  };

  const getStatusGradient = (status: string) => {
    switch (status) {
      case 'completed':
        return 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)';
      case 'in-progress':
        return 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)';
      default:
        return 'linear-gradient(135deg, #9e9e9e 0%, #bdbdbd 100%)';
    }
  };

  const getStatusShadow = (status: string) => {
    switch (status) {
      case 'completed':
        return '0 4px 20px rgba(76, 175, 80, 0.3)';
      case 'in-progress':
        return '0 4px 20px rgba(255, 152, 0, 0.3)';
      default:
        return '0 4px 20px rgba(158, 158, 158, 0.3)';
    }
  };

  const handleTaskDragStart = (e: React.MouseEvent, task: any) => {
    console.log('Drag start attempt for task:', task.id);
    
    // Check if we're clicking on a resize handle
    const target = e.target as HTMLElement;
    if (target.closest('[data-resize-handle]') || target.hasAttribute('data-resize-handle')) {
      console.log('Preventing drag - clicked on resize handle');
      return;
    }
    
    // Block drag if resize is in progress
    if (isResizing.current) {
      console.log('Preventing drag - resize in progress');
      return;
    }
    
    console.log('Drag started successfully for task:', task.id);
    isDragging.current = true;
    
    const startX = e.clientX;
    const startY = e.clientY;
    let hasMoved = false;
    let initialDragOverDate: Date | null = null;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isResizing.current) return;
      
      const deltaX = Math.abs(e.clientX - startX);
      const deltaY = Math.abs(e.clientY - startY);
      
      if (deltaX > 5 || deltaY > 5) {
        hasMoved = true;
        console.log('Drag threshold reached');
      }
      
      if (!hasMoved) return;
      
      // Find the timeline container and calculate the target date
      const timelineContainer = document.querySelector('[data-timeline-container]');
      if (!timelineContainer) {
        console.log('Timeline container not found');
        return;
      }
      
      const rect = timelineContainer.getBoundingClientRect();
      const x = e.clientX - rect.left - 220; // 220 is the task name column width
      const dayIndex = Math.floor(x / 64); // 64 is the day column width
      
      console.log('Mouse position:', e.clientX, 'Container rect:', rect, 'Calculated x:', x, 'Day index:', dayIndex);
      
      if (dayIndex >= 0 && dayIndex < timelineDays.length) {
        const targetDate = timelineDays[dayIndex];
        console.log('Setting drag over date to:', targetDate);
        setDragOverDate(targetDate);
        initialDragOverDate = targetDate;
      }
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      console.log('Custom drag ended, hasMoved:', hasMoved, 'initialDragOverDate:', initialDragOverDate);
      isDragging.current = false;
      
      if (hasMoved && initialDragOverDate) {
        console.log('Custom drop successful for task:', task.id, 'to date:', initialDragOverDate);
        if (onTaskMove) {
          onTaskMove(task.id, initialDragOverDate);
        }
      } else {
        console.log('No drop - either no movement or no target date');
      }
      
      setDragOverDate(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // Resize handlers
  const handleResizeStart = (e: React.MouseEvent, taskId: string, edge: 'start' | 'end') => {
    e.stopPropagation();
    e.preventDefault();
    
    // Don't start resize if we're currently dragging
    if (isDragging.current) {
      console.log('Preventing resize - drag in progress');
      return;
    }
    
    isResizing.current = true;
    setResizingTask({ taskId, edge });
    
    const startX = e.clientX;
    let isActuallyResizing = false;
    
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging.current) return;
      const deltaX = Math.abs(e.clientX - startX);
      if (deltaX > 5) isActuallyResizing = true;
      if (!isActuallyResizing) return;
      const timelineContainer = document.querySelector('[data-timeline-container]');
      if (!timelineContainer) return;
      const rect = timelineContainer.getBoundingClientRect();
      const x = e.clientX - rect.left - 220;
      const dayIndex = Math.floor(x / 64);
      
      if (dayIndex >= 0 && dayIndex < timelineDays.length) {
        const newDate = timelineDays[dayIndex];
        const task = timelineData.all.find(t => t.id === taskId);
        if (!task) return;
        
        if (edge === 'start') {
          if (newDate <= task.dueDate) {
            if (onTaskResize) {
              onTaskResize(taskId, newDate, task.dueDate);
            }
          }
        } else {
          if (newDate >= task.startDate) {
            if (onTaskResize) {
              onTaskResize(taskId, task.startDate, newDate);
            }
          }
        }
      }
    };
    
    const handleMouseUp = () => {
      console.log('Resize ended');
      setResizingTask(null);
      isResizing.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
      {/* Fancy Header */}
      <Box sx={{ 
        p: 3, 
        mb: 3, 
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: 3,
        color: 'white',
        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 120
      }}>
        <Box sx={{ 
          position: 'absolute', 
          top: -50, 
          right: -50, 
          width: 100, 
          height: 100, 
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          animation: 'pulse 2s infinite'
        }} />
        <Box sx={{ 
          position: 'absolute', 
          bottom: -30, 
          left: -30, 
          width: 60, 
          height: 60, 
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.1)',
          animation: 'pulse 2s infinite 1s'
        }} />
        <Box sx={{ position: 'relative', zIndex: 1 }}>
          {/* Top Row: Title and Task Count */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <TimelineIcon sx={{ fontSize: 32, mr: 2 }} />
              <Typography variant="h4" sx={{ fontWeight: 700, textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                Project Timeline
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              {/* Color Legend */}
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: 2,
                bgcolor: 'rgba(0,0,0,0.2)',
                p: 1.5,
                borderRadius: 2,
                border: '1px solid rgba(255,255,255,0.2)'
              }}>
                <Typography variant="caption" sx={{ 
                  color: 'white', 
                  fontWeight: 600, 
                  fontSize: '0.75rem',
                  textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                }}>
                  Colors:
                </Typography>
                
                {/* To Do - Gray */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    borderRadius: 2, 
                    background: 'linear-gradient(135deg, #9e9e9e 0%, #bdbdbd 100%)',
                    border: '1px solid rgba(255,255,255,0.4)'
                  }} />
                  <Typography variant="caption" sx={{ 
                    color: 'white', 
                    fontWeight: 500,
                    fontSize: '0.7rem'
                  }}>
                    To Do
                  </Typography>
                </Box>
                
                {/* In Progress - Orange */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    borderRadius: 2, 
                    background: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
                    border: '1px solid rgba(255,255,255,0.4)'
                  }} />
                  <Typography variant="caption" sx={{ 
                    color: 'white', 
                    fontWeight: 500,
                    fontSize: '0.7rem'
                  }}>
                    In Progress
                  </Typography>
                </Box>
                
                {/* Completed - Green */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3 }}>
                  <Box sx={{ 
                    width: 16, 
                    height: 16, 
                    borderRadius: 2, 
                    background: 'linear-gradient(135deg, #4caf50 0%, #66bb6a 100%)',
                    border: '1px solid rgba(255,255,255,0.4)'
                  }} />
                  <Typography variant="caption" sx={{ 
                    color: 'white', 
                    fontWeight: 500,
                    fontSize: '0.7rem'
                  }}>
                    Done
                  </Typography>
                </Box>
              </Box>
              
              {/* Task Count */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Chip 
                  label={`${timelineData.all.length} Tasks`} 
                  sx={{ 
                    bgcolor: 'rgba(255,255,255,0.2)', 
                    color: 'white',
                    fontWeight: 600,
                    fontSize: '1rem',
                    height: 32
                  }} 
                />
                <TrendingUpIcon sx={{ fontSize: 24 }} />
              </Box>
            </Box>
          </Box>
          
          {/* Middle Row: Date Range */}
          <Typography variant="h6" sx={{ opacity: 0.9, mb: 2, fontSize: '1.1rem', fontWeight: 600 }}>
            {format(timelineDays[0], 'MMM dd, yyyy')} - {format(timelineDays[timelineDays.length - 1], 'MMM dd, yyyy')}
          </Typography>
        </Box>
      </Box>

      {/* Fancy Gantt Chart */}
      <Box sx={{ 
        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        p: 3,
        pt: 4,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
        position: 'relative',
        overflow: 'visible',
        minHeight: 550,
        display: 'flex',
        flexDirection: 'column',
      }}>
        {timelineData.all.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center', 
            height: 400,
            color: 'text.secondary',
            textAlign: 'center'
          }}>
            <TimelineIcon sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600 }}>
              No Tasks Found
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              Add tasks with due dates to see them in the timeline
            </Typography>
          </Box>
        ) : (
          <Box sx={{ flex: 1, overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
            <Box 
            data-timeline-container
            sx={{ minWidth: timelineDays.length * 64 + 220, display: 'flex', flexDirection: 'column', mt: 2 }}
          >
              {/* SVG Connections Layer */}
              <Box sx={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1 }}>
                <svg width="100%" height="100%" style={{ position: 'absolute', top: 0, left: 0 }}>
                  {taskPositions.connections.map((connection, index) => (
                    <g key={`connection-${index}`}>
                      {/* Connection line */}
                      <line
                        x1={connection.fromPos.x}
                        y1={connection.fromPos.y}
                        x2={connection.toPos.x}
                        y2={connection.toPos.y}
                        stroke="#1976d2"
                        strokeWidth="2"
                        strokeDasharray="5,5"
                        opacity="0.7"
                      />
                      {/* Arrow head */}
                      <polygon
                        points={`${connection.toPos.x - 8},${connection.toPos.y - 4} ${connection.toPos.x - 8},${connection.toPos.y + 4} ${connection.toPos.x},${connection.toPos.y}`}
                        fill="#1976d2"
                        opacity="0.7"
                      />
                    </g>
                  ))}
                </svg>
              </Box>

              {/* Timeline Header */}
              <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'primary.main', bgcolor: 'background.paper', position: 'sticky', top: 0, zIndex: 10 }}>
                {/* Task Names Header */}
                <Box sx={{
                  width: 220,
                  minWidth: 220,
                  maxWidth: 220,
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRight: '2px solid',
                  borderColor: 'primary.main',
                  bgcolor: 'primary.main',
                  color: 'primary.contrastText',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                }}>
                  <DragIndicatorIcon sx={{ mr: 1, fontSize: 18 }} />
                  Tasks
                </Box>

                {/* Date Headers */}
                {timelineDays.map((day, dayIndex) => {
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                  
                  return (
                    <Box
                      key={dayIndex}
                      sx={{
                        width: 64,
                        minWidth: 64,
                        maxWidth: 64,
                        p: 1,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        bgcolor: isToday 
                          ? 'warning.main'
                          : isWeekend
                          ? 'rgba(102, 126, 234, 0.1)'
                          : 'background.paper',
                        color: isToday ? 'warning.contrastText' : 'text.primary',
                        fontWeight: isToday ? 700 : 600,
                        fontSize: '0.75rem',
                        textAlign: 'center',
                        lineHeight: 1.2,
                      }}
                    >
                      <Typography variant="caption" sx={{ fontWeight: 'inherit', fontSize: 'inherit' }}>
                        {format(day, 'EEE')}
                      </Typography>
                      <Typography variant="caption" sx={{ fontWeight: 'inherit', fontSize: 'inherit' }}>
                        {format(day, 'MMM d')}
                      </Typography>
                    </Box>
                  );
                })}
              </Box>

              {/* Active Tasks Section */}
              {timelineData.active.length > 0 && (
                <>
                  {/* Active Tasks Header */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'rgba(76, 175, 80, 0.1)',
                    borderBottom: '2px solid',
                    borderColor: 'success.main',
                    py: 1,
                    px: 2,
                    mt: 2,
                  }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'success.main' }}>
                      Active Tasks ({timelineData.active.length})
                    </Typography>
                  </Box>

                  {/* Active Task Rows */}
                  {timelineData.active.map((task, rowIdx) => (
                    <Box
                      key={task.id}
                      sx={{
                        display: 'flex',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        minHeight: 54,
                        alignItems: 'center',
                        '&:hover': {
                          bgcolor: 'rgba(102, 126, 234, 0.05)',
                        },
                        position: 'relative',
                      }}
                    >
                      {/* Task Name - Fixed Position */}
                      <Box sx={{
                        width: 220,
                        minWidth: 220,
                        maxWidth: 220,
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        cursor: 'pointer',
                        borderRight: '2px solid',
                        borderColor: 'primary.main',
                        bgcolor: 'background.paper',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'primary.light',
                          color: 'primary.contrastText',
                        },
                      }}
                      onClick={(e) => {
                        // Don't trigger click if we're resizing
                        if (resizingTask) {
                          e.stopPropagation();
                          return;
                        }
                        // Don't trigger click if we're on a resize handle
                        const target = e.target as HTMLElement;
                        if (target.closest('[data-resize-handle]')) {
                          e.stopPropagation();
                          return;
                        }
                        // Don't trigger click if we're dragging
                        if (isDragging.current) {
                          e.stopPropagation();
                          return;
                        }
                        e.stopPropagation();
                        onTaskClick && onTaskClick(tasks.find(t => t.id === task.id)!);
                      }}
                      >
                        {getStatusIcon(task.status)}
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>
                          {task.name}
                        </Typography>
                        {task.accountName && (
                          <Avatar
                            src={task.accountPicture}
                            sx={{ width: 24, height: 24, border: '2px solid white' }}
                          >
                            {task.accountName.charAt(0)}
                          </Avatar>
                        )}
                      </Box>

                      {/* Timeline Cells with Task Duration Bars */}
                      {timelineDays.map((day, dayIndex) => {
                        const taskStartDate = startOfDay(new Date(task.startDate));
                        const taskDueDate = startOfDay(new Date(task.dueDate));
                        const currentDay = startOfDay(new Date(day));
                        
                        // Check if this day is within the task duration
                        const isTaskStartDay = currentDay.getTime() === taskStartDate.getTime();
                        const isTaskEndDay = currentDay.getTime() === taskDueDate.getTime();
                        const isTaskDurationDay = currentDay >= taskStartDate && currentDay <= taskDueDate;
                        
                        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                        const isPast = day < new Date() && !isToday;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        const isDragOver = dragOverDate && format(dragOverDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                        
                        return (
                          <Box
                            key={dayIndex}
                            sx={{
                              width: 64,
                              minWidth: 64,
                              maxWidth: 64,
                              height: 54,
                              borderRight: '1px solid',
                              borderColor: 'divider',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              bgcolor: isDragOver
                                ? 'rgba(102, 126, 234, 0.2)'
                                : isToday 
                                ? 'rgba(255, 152, 0, 0.15)'
                                : isPast
                                ? '#fafafa'
                                : isWeekend
                                ? 'rgba(102, 126, 234, 0.05)'
                                : 'transparent',
                              transition: 'all 0.2s ease',
                              px: 0,
                              py: 0,
                              '&:hover': {
                                bgcolor: isDragOver
                                  ? 'rgba(102, 126, 234, 0.3)'
                                  : isToday 
                                  ? 'rgba(255, 152, 0, 0.25)'
                                  : isPast
                                  ? '#f0f0f0'
                                  : isWeekend
                                  ? 'rgba(102, 126, 234, 0.1)'
                                  : 'rgba(0, 0, 0, 0.05)',
                              },
                            }}
                          >
                            {/* Debug: Show task name on task days */}
                            {isTaskDurationDay && (
                              <Typography 
                                variant="caption" 
                                sx={{ 
                                  position: 'absolute', 
                                  top: 2, 
                                  left: 2, 
                                  fontSize: '8px',
                                  color: 'red',
                                  zIndex: 10,
                                  fontWeight: 'bold'
                                }}
                              >
                                TASK
                              </Typography>
                            )}
                            {/* Task Duration Bar - Only render on start day to avoid duplication */}
                            {isTaskStartDay && (
                              <Tooltip 
                                title={`${task.fullContent} - ${task.status} - Duration: ${format(task.startDate, 'MMM dd')} to ${format(task.dueDate, 'MMM dd, yyyy')} (Drag to move, resize edges to change dates)`}
                                arrow
                              >
                                <Box
                                  data-task-id={task.id}
                                  onMouseDown={(e) => handleTaskDragStart(e, task)}
                                  sx={{
                                    width: `${Math.max(1, differenceInDays(task.dueDate, task.startDate) + 1) * 64}px`,
                                    height: 32,
                                    background: getStatusGradient(task.status),
                                    borderRadius: 2.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'grab',
                                    boxShadow: getStatusShadow(task.status),
                                    transition: 'all 0.3s cubic-bezier(.4,2,.6,1)',
                                    '&:hover': {
                                      transform: 'scale(1.02)',
                                      boxShadow: `${getStatusShadow(task.status)}, 0 8px 25px rgba(0,0,0,0.18)`,
                                      cursor: 'grabbing'
                                    },
                                    '&:active': {
                                      cursor: 'grabbing',
                                      transform: 'scale(1.01)'
                                    },
                                    border: '2px solid #fff',
                                    position: 'absolute',
                                    left: 4,
                                    top: 11,
                                    zIndex: 5,
                                    animation: resizingTask?.taskId === task.id ? 'resize 0.2s ease-out' : 'slideIn 0.3s ease-out',
                                  }}
                                  onClick={(e) => {
                                    // Don't trigger click if we're resizing
                                    if (resizingTask) {
                                      e.stopPropagation();
                                      return;
                                    }
                                    // Don't trigger click if we're on a resize handle
                                    const target = e.target as HTMLElement;
                                    if (target.closest('[data-resize-handle]')) {
                                      e.stopPropagation();
                                      return;
                                    }
                                    // Don't trigger click if we're dragging
                                    if (isDragging.current) {
                                      e.stopPropagation();
                                      return;
                                    }
                                    e.stopPropagation();
                                    onTaskClick && onTaskClick(tasks.find(t => t.id === task.id)!);
                                  }}
                                >
                                  {/* Resize Handle - Left (Start Date) */}
                                  <Box
                                    data-resize-handle="start"
                                    onMouseDown={(e) => handleResizeStart(e, task.id, 'start')}
                                    sx={{
                                      cursor: 'ew-resize',
                                      position: 'absolute',
                                      left: -4,
                                      top: 0,
                                      width: 8,
                                      height: '100%',
                                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                      borderRadius: '4px 0 0 4px',
                                      border: '1px solid rgba(0, 0, 0, 0.2)',
                                      zIndex: 10,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 1)',
                                        transform: 'scaleX(1.2)',
                                      },
                                      '&::after': {
                                        content: '""',
                                        width: 2,
                                        height: 16,
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        borderRadius: 1,
                                      }
                                    }}
                                    tabIndex={-1}
                                  />
                                  
                                  {/* Resize Handle - Right (End Date) */}
                                  <Box
                                    data-resize-handle="end"
                                    onMouseDown={(e) => handleResizeStart(e, task.id, 'end')}
                                    sx={{
                                      cursor: 'ew-resize',
                                      position: 'absolute',
                                      right: -4,
                                      top: 0,
                                      width: 8,
                                      height: '100%',
                                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                      borderRadius: '0 4px 4px 0',
                                      border: '1px solid rgba(0, 0, 0, 0.2)',
                                      zIndex: 10,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 1)',
                                        transform: 'scaleX(1.2)',
                                      },
                                      '&::after': {
                                        content: '""',
                                        width: 2,
                                        height: 16,
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        borderRadius: 1,
                                      }
                                    }}
                                    tabIndex={-1}
                                  />
                                  
                                  <Typography variant="caption" sx={{
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: 'white',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                    px: 1,
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    width: '100%',
                                    textAlign: 'center',
                                    pointerEvents: 'none',
                                  }}>
                                    {task.name}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            )}

                            {/* Drag Over Indicator */}
                            {isDragOver && (
                              <Box
                                sx={{
                                  width: 56,
                                  height: 32,
                                  background: 'rgba(102, 126, 234, 0.3)',
                                  borderRadius: 2.5,
                                  border: '2px dashed rgba(102, 126, 234, 0.8)',
                                  position: 'absolute',
                                  left: 4,
                                  top: 11,
                                  zIndex: 4,
                                  animation: 'pulse 1s infinite',
                                }}
                              />
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </>
              )}

              {/* Completed Tasks Section */}
              {timelineData.completed.length > 0 && (
                <>
                  {/* Completed Tasks Header */}
                  <Box sx={{
                    display: 'flex',
                    alignItems: 'center',
                    bgcolor: 'rgba(158, 158, 158, 0.1)',
                    borderBottom: '2px solid',
                    borderColor: 'grey.400',
                    py: 1,
                    px: 2,
                    mt: timelineData.active.length > 0 ? 2 : 2,
                  }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'grey.600' }}>
                      Completed Tasks ({timelineData.completed.length})
                    </Typography>
                  </Box>

                  {/* Completed Task Rows */}
                  {timelineData.completed.map((task, rowIdx) => (
                    <Box
                      key={task.id}
                      sx={{
                        display: 'flex',
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        minHeight: 54,
                        alignItems: 'center',
                        bgcolor: 'rgba(158, 158, 158, 0.05)',
                        opacity: 0.8,
                        '&:hover': {
                          bgcolor: 'rgba(158, 158, 158, 0.1)',
                          opacity: 1,
                        },
                        position: 'relative',
                      }}
                    >
                      {/* Task Name - Fixed Position */}
                      <Box sx={{
                        width: 220,
                        minWidth: 220,
                        maxWidth: 220,
                        p: 1.5,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        cursor: 'pointer',
                        borderRight: '2px solid',
                        borderColor: 'grey.400',
                        bgcolor: 'background.paper',
                        transition: 'all 0.2s ease',
                        '&:hover': {
                          bgcolor: 'grey.100',
                        },
                      }}
                      onClick={(e) => {
                        // Don't trigger click if we're resizing
                        if (resizingTask) {
                          e.stopPropagation();
                          return;
                        }
                        // Don't trigger click if we're on a resize handle
                        const target = e.target as HTMLElement;
                        if (target.closest('[data-resize-handle]')) {
                          e.stopPropagation();
                          return;
                        }
                        // Don't trigger click if we're dragging
                        if (isDragging.current) {
                          e.stopPropagation();
                          return;
                        }
                        e.stopPropagation();
                        onTaskClick && onTaskClick(tasks.find(t => t.id === task.id)!);
                      }}
                      >
                        {getStatusIcon(task.status)}
                        <Typography variant="body2" sx={{ flex: 1, fontWeight: 500, color: 'grey.600' }}>
                          {task.name}
                        </Typography>
                        {task.accountName && (
                          <Avatar
                            src={task.accountPicture}
                            sx={{ width: 24, height: 24, border: '2px solid white' }}
                          >
                            {task.accountName.charAt(0)}
                          </Avatar>
                        )}
                      </Box>

                      {/* Timeline Cells for Completed Tasks */}
                      {timelineDays.map((day, dayIndex) => {
                        const taskStartDate = startOfDay(new Date(task.startDate));
                        const taskDueDate = startOfDay(new Date(task.dueDate));
                        const currentDay = startOfDay(new Date(day));
                        
                        // Check if this day is within the task duration
                        const isTaskStartDay = currentDay.getTime() === taskStartDate.getTime();
                        const isTaskEndDay = currentDay.getTime() === taskDueDate.getTime();
                        const isTaskDurationDay = currentDay >= taskStartDate && currentDay <= taskDueDate;
                        
                        const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                        const isPast = day < new Date() && !isToday;
                        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                        
                        return (
                          <Box
                            key={dayIndex}
                            sx={{
                              width: 64,
                              minWidth: 64,
                              maxWidth: 64,
                              height: 54,
                              borderRight: '1px solid',
                              borderColor: 'divider',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              position: 'relative',
                              bgcolor: isToday 
                                ? 'rgba(255, 152, 0, 0.15)'
                                : isPast
                                ? '#fafafa'
                                : isWeekend
                                ? 'rgba(102, 126, 234, 0.05)'
                                : 'transparent',
                              transition: 'all 0.2s ease',
                              px: 0,
                              py: 0,
                            }}
                          >
                            {/* Completed Task Duration Bar - Only render on start day to avoid duplication */}
                            {isTaskStartDay && (
                              <Tooltip 
                                title={`${task.fullContent} - Completed - Duration: ${format(task.startDate, 'MMM dd')} to ${format(task.dueDate, 'MMM dd, yyyy')} (Resize edges to change dates)`}
                                arrow
                              >
                                <Box
                                  data-task-id={task.id}
                                  onMouseDown={(e) => handleTaskDragStart(e, task)}
                                  sx={{
                                    width: `${Math.max(1, differenceInDays(task.dueDate, task.startDate) + 1) * 64}px`,
                                    height: 32,
                                    background: getStatusGradient(task.status),
                                    borderRadius: 2.5,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: '2px solid #fff',
                                    position: 'absolute',
                                    left: 4,
                                    top: 11,
                                    zIndex: 5,
                                    opacity: 0.7,
                                    animation: resizingTask?.taskId === task.id ? 'resize 0.2s ease-out' : 'slideIn 0.3s ease-out',
                                  }}
                                  onClick={(e) => {
                                    // Don't trigger click if we're resizing
                                    if (resizingTask) {
                                      e.stopPropagation();
                                      return;
                                    }
                                    // Don't trigger click if we're on a resize handle
                                    const target = e.target as HTMLElement;
                                    if (target.closest('[data-resize-handle]')) {
                                      e.stopPropagation();
                                      return;
                                    }
                                    // Don't trigger click if we're dragging
                                    if (isDragging.current) {
                                      e.stopPropagation();
                                      return;
                                    }
                                    e.stopPropagation();
                                    onTaskClick && onTaskClick(tasks.find(t => t.id === task.id)!);
                                  }}
                                >
                                  {/* Resize Handle - Left (Start Date) */}
                                  <Box
                                    data-resize-handle="start"
                                    onMouseDown={(e) => handleResizeStart(e, task.id, 'start')}
                                    sx={{
                                      cursor: 'ew-resize',
                                      position: 'absolute',
                                      left: -4,
                                      top: 0,
                                      width: 8,
                                      height: '100%',
                                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                      borderRadius: '4px 0 0 4px',
                                      border: '1px solid rgba(0, 0, 0, 0.2)',
                                      zIndex: 10,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 1)',
                                        transform: 'scaleX(1.2)',
                                      },
                                      '&::after': {
                                        content: '""',
                                        width: 2,
                                        height: 16,
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        borderRadius: 1,
                                      }
                                    }}
                                    tabIndex={-1}
                                  />
                                  
                                  {/* Resize Handle - Right (End Date) */}
                                  <Box
                                    data-resize-handle="end"
                                    onMouseDown={(e) => handleResizeStart(e, task.id, 'end')}
                                    sx={{
                                      cursor: 'ew-resize',
                                      position: 'absolute',
                                      right: -4,
                                      top: 0,
                                      width: 8,
                                      height: '100%',
                                      backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                      borderRadius: '0 4px 4px 0',
                                      border: '1px solid rgba(0, 0, 0, 0.2)',
                                      zIndex: 10,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      '&:hover': {
                                        backgroundColor: 'rgba(255, 255, 255, 1)',
                                        transform: 'scaleX(1.2)',
                                      },
                                      '&::after': {
                                        content: '""',
                                        width: 2,
                                        height: 16,
                                        backgroundColor: 'rgba(0, 0, 0, 0.4)',
                                        borderRadius: 1,
                                      }
                                    }}
                                    tabIndex={-1}
                                  />
                                  
                                  <Typography variant="caption" sx={{
                                    fontSize: '0.9rem',
                                    fontWeight: 700,
                                    color: 'white',
                                    textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                                    px: 1,
                                    overflow: 'hidden',
                                    whiteSpace: 'nowrap',
                                    textOverflow: 'ellipsis',
                                    width: '100%',
                                    textAlign: 'center',
                                    pointerEvents: 'none',
                                  }}>
                                    {task.name}
                                  </Typography>
                                </Box>
                              </Tooltip>
                            )}
                          </Box>
                        );
                      })}
                    </Box>
                  ))}
                </>
              )}
            </Box>
          </Box>
        )}
      </Box>

      {/* Fancy Task List */}
      <Box sx={{ 
        mt: 3, 
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        p: 3,
        boxShadow: '0 8px 32px rgba(0,0,0,0.1)'
      }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: '#2c3e50', mb: 3 }}>
          Task Details
        </Typography>
        <Grid container spacing={3}>
          {timelineData.all.map((task) => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                  transition: 'all 0.3s ease',
                  '&:hover': { 
                    transform: 'translateY(-8px)',
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)'
                  },
                  borderLeft: `4px solid ${getStatusColor(task.status)}`,
                  opacity: task.status === 'completed' ? 0.8 : 1,
                }}
                onClick={(e) => {
                  const originalTask = tasks.find(t => t.id === task.id);
                  if (originalTask && onTaskClick) {
                    onTaskClick(originalTask);
                  }
                }}
              >
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getStatusIcon(task.status)}
                    <Typography variant="subtitle1" sx={{ ml: 1.5, flex: 1, fontWeight: 600 }}>
                      {task.name}
                    </Typography>
                  </Box>
                  
                  {task.accountName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Avatar
                        src={task.accountPicture}
                        sx={{ width: 24, height: 24, mr: 1.5, border: '2px solid white' }}
                      >
                        {task.accountName.charAt(0)}
                      </Avatar>
                      <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                        {task.accountName}
                      </Typography>
                    </Box>
                  )}
                  
                  <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                    Due: {format(task.dueDate, 'MMM dd, yyyy')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      <style>
        {`
          @keyframes pulse {
            0% { transform: scale(1); opacity: 0.5; }
            50% { transform: scale(1.1); opacity: 0.3; }
            100% { transform: scale(1); opacity: 0.5; }
          }
          
          @keyframes slideIn {
            0% { 
              opacity: 0; 
              transform: translateY(-10px) scale(0.95);
            }
            100% { 
              opacity: 1; 
              transform: translateY(0) scale(1);
            }
          }
          
          @keyframes resize {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
        `}
      </style>
    </Box>
  );
};

export default GanttChart; 