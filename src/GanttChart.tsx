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
import { format, addDays, differenceInDays, eachDayOfInterval } from 'date-fns';
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

interface GanttChartProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  onTaskMove?: (taskId: string, newDueDate: Date) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  onTaskClick,
  onTaskMove,
}) => {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverDate, setDragOverDate] = useState<Date | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragPreviewRef = useRef<HTMLDivElement>(null);

  const timelineData = useMemo(() => {
    const filteredTasks = tasks.filter(task => task.dueDate);
    
    return filteredTasks.map((task) => {
      const taskDate = task.dueDate ? new Date(task.dueDate) : new Date();
      
      return {
        id: task.id,
        name: task.content.length > 25 ? task.content.substring(0, 25) + '...' : task.content,
        dueDate: taskDate,
        status: task.status,
        color: task.color || '#1976d2',
        accountEmail: task.accountEmail,
        accountName: task.accountName,
        accountPicture: task.accountPicture,
        fullContent: task.content,
      };
    }).sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
  }, [tasks]);

  const timelineDays = useMemo(() => {
    // Extend timeline to show past days (7 days before today) and future days
    const pastDays = 7;
    const futureDays = 30;
    const totalDays = pastDays + futureDays + 1; // +1 for today
    
    const timelineStart = addDays(new Date(), -pastDays);
    return Array.from({ length: totalDays }, (_, i) => addDays(timelineStart, i));
  }, []);

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

  // Enhanced drag and drop handlers for Jira-like slider
  const handleDragStart = (e: React.DragEvent, task: any) => {
    setIsDragging(true);
    setDraggedTaskId(task.id);
    
    // Create a custom drag image
    if (dragPreviewRef.current) {
      e.dataTransfer.setDragImage(dragPreviewRef.current, 25, 16);
    }
    
    e.dataTransfer.setData('text/plain', JSON.stringify({
      taskId: task.id,
      taskName: task.name
    }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedTaskId(null);
    setDragOverDate(null);
  };

  const handleDragOver = (e: React.DragEvent, date: Date) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverDate(date);
  };

  const handleDragLeave = () => {
    setDragOverDate(null);
  };

  const handleDrop = (e: React.DragEvent, targetDate: Date) => {
    e.preventDefault();
    
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      const taskId = dragData.taskId;
      
      if (onTaskMove) {
        onTaskMove(taskId, targetDate);
      }
    } catch (error) {
      console.error('Error parsing drag data:', error);
    }
    
    handleDragEnd();
  };

  // Get the day index for a task
  const getTaskDayIndex = (taskDueDate: Date) => {
    return timelineDays.findIndex(day => 
      format(day, 'yyyy-MM-dd') === format(taskDueDate, 'yyyy-MM-dd')
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Hidden drag preview element */}
      <Box
        ref={dragPreviewRef}
        sx={{
          position: 'absolute',
          left: '-9999px',
          top: '-9999px',
          width: 56,
          height: 32,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 2.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(102, 126, 234, 0.4)',
          border: '2px solid #fff',
          zIndex: 9999,
        }}
      >
        <Typography variant="caption" sx={{
          fontSize: '0.8rem',
          fontWeight: 700,
          color: 'white',
          textShadow: '0 1px 2px rgba(0,0,0,0.3)',
        }}>
          Moving...
        </Typography>
      </Box>

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
                  label={`${timelineData.length} Tasks`} 
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
        flex: 1, 
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
        maxHeight: '65vh',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {timelineData.length === 0 ? (
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
          <Box sx={{ flex: 1, height: '100%', overflowY: 'auto', overflowX: 'auto', width: '100%' }}>
            <Box sx={{ minWidth: timelineDays.length * 64 + 220, display: 'flex', flexDirection: 'column', mt: 2 }}>
              {/* Timeline Header */}
              <Box sx={{ display: 'flex', borderBottom: '2px solid', borderColor: 'primary.main', bgcolor: 'background.paper', position: 'sticky', top: 0, zIndex: 10 }}>
                {/* Empty space for task names */}
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

                {/* Date headers */}
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

              {/* Task Rows */}
              {timelineData.map((task, rowIdx) => {
                const taskDayIndex = getTaskDayIndex(task.dueDate);
                const isBeingDragged = draggedTaskId === task.id;
                
                return (
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
                      opacity: isBeingDragged ? 0.3 : 1,
                      transition: 'opacity 0.2s ease',
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
                    onClick={() => onTaskClick && onTaskClick(tasks.find(t => t.id === task.id)!)}
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

                    {/* Timeline Cells with Slider Indicators */}
                    {timelineDays.map((day, dayIndex) => {
                      const dueDate = new Date(task.dueDate);
                      const isTaskDay = format(day, 'yyyy-MM-dd') === format(dueDate, 'yyyy-MM-dd');
                      const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                      const isPast = day < new Date() && !isToday;
                      const isWeekend = day.getDay() === 0 || day.getDay() === 6;
                      const isDragOver = dragOverDate && format(dragOverDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
                      
                      return (
                        <Box
                          key={dayIndex}
                          onDragOver={(e) => handleDragOver(e, day)}
                          onDragLeave={handleDragLeave}
                          onDrop={(e) => handleDrop(e, day)}
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
                          {/* Task Slider Indicator */}
                          {isTaskDay && !isBeingDragged && (
                            <Tooltip 
                              title={`${task.fullContent} - ${task.status} - Due: ${format(task.dueDate, 'MMM dd, yyyy')} (Drag to move)`}
                              arrow
                            >
                              <Box
                                draggable
                                onDragStart={(e) => handleDragStart(e, task)}
                                onDragEnd={handleDragEnd}
                                sx={{
                                  width: 56,
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
                                    transform: 'scale(1.08)',
                                    boxShadow: `${getStatusShadow(task.status)}, 0 8px 25px rgba(0,0,0,0.18)`,
                                    cursor: 'grabbing'
                                  },
                                  '&:active': {
                                    cursor: 'grabbing',
                                    transform: 'scale(1.05)'
                                  },
                                  border: '2px solid #fff',
                                  position: 'absolute',
                                  left: 4,
                                  top: 11,
                                  zIndex: 5,
                                }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTaskClick && onTaskClick(tasks.find(t => t.id === task.id)!);
                                }}
                              >
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
                );
              })}
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
          {timelineData.map((task) => (
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
                }}
                onClick={() => {
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
        `}
      </style>
    </Box>
  );
};

export default GanttChart; 