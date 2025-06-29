import React, { useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Chip,
  Avatar,
  Card,
  CardContent,
  Grid,
  Divider,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { format, addDays, differenceInDays, startOfDay, endOfDay } from 'date-fns';
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

interface GanttTaskData {
  id: string;
  name: string;
  start: number;
  end: number;
  duration: number;
  status: string;
  color: string;
  accountEmail?: string;
  accountName?: string;
  accountPicture?: string;
  dueDate?: Date | null;
  fullContent: string;
}

const GanttChart: React.FC<GanttChartProps> = ({
  tasks,
  startDate = new Date(),
  endDate = addDays(new Date(), 30),
  onTaskClick,
}) => {
  const ganttData = useMemo(() => {
    const filteredTasks = tasks.filter(task => task.dueDate);
    
    return filteredTasks.map((task, index) => {
      const taskDate = task.dueDate ? new Date(task.dueDate) : new Date();
      const daysFromStart = differenceInDays(taskDate, startDate);
      
      // Create a bar that spans 1-3 days depending on task status
      const duration = task.status === 'completed' ? 1 : 
                      task.status === 'in-progress' ? 2 : 3;
      
      return {
        id: task.id,
        name: task.content.length > 30 ? task.content.substring(0, 30) + '...' : task.content,
        start: Math.max(0, daysFromStart),
        end: Math.max(0, daysFromStart + duration),
        duration,
        status: task.status,
        color: task.color || '#1976d2',
        accountEmail: task.accountEmail,
        accountName: task.accountName,
        accountPicture: task.accountPicture,
        dueDate: task.dueDate,
        fullContent: task.content,
      };
    }).sort((a, b) => a.start - b.start);
  }, [tasks, startDate]);

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

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            bgcolor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 2,
            boxShadow: 3,
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
            {data.fullContent}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Status: {data.status}
          </Typography>
          {data.dueDate && (
            <Typography variant="body2" color="text.secondary">
              Due: {format(new Date(data.dueDate), 'MMM dd, yyyy')}
            </Typography>
          )}
          {data.accountName && (
            <Typography variant="body2" color="text.secondary">
              Account: {data.accountName}
            </Typography>
          )}
        </Box>
      );
    }
    return null;
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
        {ganttData.length === 0 ? (
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
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={ganttData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              layout="horizontal"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
              <XAxis
                type="number"
                domain={[0, differenceInDays(endDate, startDate)]}
                tickFormatter={(value) => format(addDays(startDate, value), 'MMM dd')}
                interval={7}
                stroke="#666"
                fontSize={12}
              />
              <YAxis
                type="category"
                dataKey="name"
                width={200}
                tick={{ fontSize: 12 }}
                stroke="#666"
              />
              <RechartsTooltip content={<CustomTooltip />} />
              <Bar
                dataKey="duration"
                fill="#8884d8"
                onClick={(data) => {
                  const task = tasks.find(t => t.id === data.id);
                  if (task && onTaskClick) {
                    onTaskClick(task);
                  }
                }}
                cursor="pointer"
                radius={[2, 2, 2, 2]}
              >
                {ganttData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={getStatusColor(entry.status)}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Box>

      {/* Task List */}
      <Box sx={{ mt: 2, bgcolor: 'background.paper', borderRadius: 1, border: '1px solid', borderColor: 'divider', p: 2 }}>
        <Typography variant="h6" gutterBottom>
          Task Details
        </Typography>
        <Grid container spacing={2}>
          {ganttData.map((task) => (
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
                  
                  {task.dueDate && (
                    <Typography variant="caption" color="text.secondary">
                      Due: {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                    </Typography>
                  )}
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