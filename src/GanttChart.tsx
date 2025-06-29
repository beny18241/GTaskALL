import React, { useMemo } from 'react';
import {
  Box,
  Typography,
  Chip,
  Avatar,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import { format, addDays, differenceInDays, eachDayOfInterval } from 'date-fns';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import PauseCircleIcon from '@mui/icons-material/PauseCircle';

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
  startDate?: Date;
  endDate?: Date;
  onTaskClick?: (task: Task) => void;
}

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  startDate = new Date(),
  endDate = addDays(new Date(), 30),
  onTaskClick,
}) => {
  const timelineData = useMemo(() => {
    const filteredTasks = tasks.filter(task => task.dueDate);
    
    return filteredTasks.map((task) => {
      const taskDate = task.dueDate ? new Date(task.dueDate) : new Date();
      const daysFromStart = differenceInDays(taskDate, startDate);
      
      return {
        id: task.id,
        name: task.content.length > 30 ? task.content.substring(0, 30) + '...' : task.content,
        dueDate: taskDate,
        status: task.status,
        color: task.color || '#1976d2',
        accountEmail: task.accountEmail,
        accountName: task.accountName,
        accountPicture: task.accountPicture,
        fullContent: task.content,
        daysFromStart: Math.max(0, daysFromStart),
      };
    }).sort((a, b) => a.daysFromStart - b.daysFromStart);
  }, [tasks, startDate]);

  const timelineDays = useMemo(() => {
    const totalDays = Math.min(differenceInDays(endDate, startDate), 30); // Limit to 30 days max
    return Array.from({ length: totalDays + 1 }, (_, i) => addDays(startDate, i));
  }, [startDate, endDate]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />;
      case 'in-progress':
        return <PauseCircleIcon sx={{ color: 'warning.main', fontSize: 16 }} />;
      default:
        return <RadioButtonUncheckedIcon sx={{ color: 'grey.500', fontSize: 16 }} />;
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

  const getStatusBackgroundColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#e8f5e8';
      case 'in-progress':
        return '#fff3e0';
      default:
        return '#f5f5f5';
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="h6" gutterBottom>
          Gantt Chart View
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Timeline: {format(startDate, 'MMM dd, yyyy')} - {format(endDate, 'MMM dd, yyyy')}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Tasks: {timelineData.length}
        </Typography>
      </Box>

      {/* Legend */}
      <Box sx={{ p: 2, mb: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
        <Typography variant="subtitle2" gutterBottom>
          Status Legend
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip
            icon={<RadioButtonUncheckedIcon />}
            label="To Do"
            size="small"
            sx={{ bgcolor: '#f5f5f5' }}
          />
          <Chip
            icon={<PauseCircleIcon />}
            label="In Progress"
            size="small"
            sx={{ bgcolor: '#fff3e0' }}
          />
          <Chip
            icon={<CheckCircleIcon />}
            label="Completed"
            size="small"
            sx={{ bgcolor: '#e8f5e8' }}
          />
        </Box>
      </Box>

      {/* Gantt Chart */}
      <Box sx={{ flex: 1, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', p: 2 }}>
        {timelineData.length === 0 ? (
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: 400,
            color: 'text.secondary',
            fontStyle: 'italic'
          }}>
            No tasks with due dates found
          </Box>
        ) : (
          <Box sx={{ height: 400, overflow: 'auto' }}>
            {/* Timeline Header */}
            <Box sx={{ 
              display: 'flex', 
              borderBottom: '2px solid', 
              borderColor: 'primary.main',
              position: 'sticky',
              top: 0,
              bgcolor: 'background.paper',
              zIndex: 2
            }}>
              <Box sx={{ width: 200, p: 1, fontWeight: 'bold', borderRight: '1px solid', borderColor: 'divider' }}>
                Tasks
              </Box>
              {timelineDays.map((day, index) => (
                <Box
                  key={index}
                  sx={{
                    width: 60,
                    p: 1,
                    textAlign: 'center',
                    fontSize: '0.75rem',
                    borderRight: '1px solid',
                    borderColor: 'divider',
                    bgcolor: index % 7 === 0 ? 'primary.light' : 'transparent',
                    color: index % 7 === 0 ? 'primary.contrastText' : 'text.primary',
                    fontWeight: index % 7 === 0 ? 'bold' : 'normal'
                  }}
                >
                  {format(day, 'MMM dd')}
                </Box>
              ))}
            </Box>

            {/* Gantt Bars */}
            {timelineData.map((task) => (
              <Box
                key={task.id}
                sx={{
                  display: 'flex',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  minHeight: 50,
                  '&:hover': {
                    bgcolor: 'action.hover'
                  }
                }}
              >
                {/* Task Name */}
                <Box sx={{ 
                  width: 200, 
                  p: 1, 
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  cursor: 'pointer',
                  borderRight: '1px solid',
                  borderColor: 'divider'
                }}
                onClick={() => onTaskClick && onTaskClick(tasks.find(t => t.id === task.id)!)}
                >
                  {getStatusIcon(task.status)}
                  <Typography variant="body2" sx={{ flex: 1 }}>
                    {task.name}
                  </Typography>
                </Box>

                {/* Timeline Cells */}
                {timelineDays.map((day, dayIndex) => {
                  const isTaskDay = task.daysFromStart === dayIndex;
                  const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  
                  return (
                    <Box
                      key={dayIndex}
                      sx={{
                        width: 60,
                        minHeight: 50,
                        borderRight: '1px solid',
                        borderColor: 'divider',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                        bgcolor: isToday ? 'warning.light' : 'transparent'
                      }}
                    >
                      {isTaskDay && (
                        <Box
                          sx={{
                            width: 50,
                            height: 30,
                            bgcolor: getStatusBackgroundColor(task.status),
                            border: `3px solid ${getStatusColor(task.status)}`,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            boxShadow: 2,
                            '&:hover': {
                              transform: 'scale(1.05)',
                              boxShadow: 4,
                              transition: 'all 0.2s ease'
                            }
                          }}
                          onClick={() => onTaskClick && onTaskClick(tasks.find(t => t.id === task.id)!)}
                          title={`${task.fullContent} - ${task.status} - Due: ${format(task.dueDate, 'MMM dd, yyyy')}`}
                        >
                          <Typography variant="caption" sx={{ fontSize: '0.7rem', fontWeight: 'bold', color: getStatusColor(task.status) }}>
                            {task.status === 'completed' ? '✓' : task.status === 'in-progress' ? '⟳' : '○'}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  );
                })}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Task List */}
      <Box sx={{ mt: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Task Details
        </Typography>
        <Grid container spacing={2}>
          {timelineData.map((task) => (
            <Grid item xs={12} sm={6} md={4} key={task.id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  '&:hover': { 
                    boxShadow: 3,
                    transform: 'translateY(-2px)',
                    transition: 'all 0.2s ease'
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
                <CardContent sx={{ p: 2 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    {getStatusIcon(task.status)}
                    <Typography variant="subtitle2" sx={{ ml: 1, flex: 1 }}>
                      {task.name}
                    </Typography>
                  </Box>
                  
                  {task.accountName && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Avatar
                        src={task.accountPicture}
                        sx={{ width: 20, height: 20, mr: 1 }}
                      >
                        {task.accountName.charAt(0)}
                      </Avatar>
                      <Typography variant="caption" color="text.secondary">
                        {task.accountName}
                      </Typography>
                    </Box>
                  )}
                  
                  <Typography variant="caption" color="text.secondary">
                    Due: {format(task.dueDate, 'MMM dd, yyyy')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
};

export default GanttChart; 