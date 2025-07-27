import React from 'react';
import { Box, Typography, Chip, IconButton, Button } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import { addDays } from 'date-fns';

export interface TaskRowProps {
  task: any;
  onEdit: (task: any) => void;
  accountColor: string;
  showDivider?: boolean;
  isOverdue?: boolean | null;
  onQuickReschedule?: (task: any, newDate: Date) => void;
  showQuickReschedule?: boolean;
}

const TaskRow: React.FC<TaskRowProps> = ({ 
  task, 
  onEdit, 
  accountColor, 
  showDivider = true, 
  isOverdue = false,
  onQuickReschedule,
  showQuickReschedule = false
}) => {
  const isOverdueTask = Boolean(isOverdue);
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        p: 1.5,
        borderBottom: showDivider ? '1px solid' : 'none',
        borderColor: 'divider',
        transition: 'all 0.2s ease',
        borderLeft: `3px solid ${isOverdueTask ? '#ff6b6b' : accountColor}`,
        position: 'relative',
        bgcolor: isOverdueTask ? 'rgba(255, 107, 107, 0.08)' : 'background.paper',
        '&:hover': {
          bgcolor: isOverdueTask ? 'rgba(255, 107, 107, 0.12)' : 'action.hover',
        },
        ...(isOverdueTask && {
          '&::before': {
            content: '""',
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '3px',
            background: 'linear-gradient(180deg, #ff6b6b 0%, #ff8e8e 100%)',
            animation: 'pulse 2s ease-in-out infinite',
          },
          '@keyframes pulse': {
            '0%, 100%': { opacity: 1 },
            '50%': { opacity: 0.7 },
          },
        }),
      }}
    >
      {/* Checkbox (not handled here, for display only) */}
      <Box sx={{ pt: 0.25, flexShrink: 0 }}>
        <input
          type="checkbox"
          checked={task.status === 'completed'}
          readOnly
          style={{
            width: '16px',
            height: '16px',
            cursor: 'default',
            accentColor: accountColor,
            borderRadius: '2px',
            border: `1.5px solid ${accountColor}`,
            transition: 'all 0.2s ease'
          }}
        />
      </Box>

      {/* Task Content */}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            wordBreak: 'break-word',
            fontWeight: 500,
            color: task.status === 'completed' ? 'text.secondary' : 'text.primary',
            textDecoration: task.status === 'completed' ? 'line-through' : 'none',
            mb: task.notes ? 0.25 : 0,
            transition: 'all 0.2s ease',
            fontSize: '0.9rem',
            lineHeight: 1.3,
            ...(isOverdueTask && {
              '&::after': {
                content: '" ⏰"',
                color: '#ff6b6b',
                fontSize: '0.8rem',
                fontWeight: 'bold',
              },
            }),
          }}
        >
          {task.content}
        </Typography>
        {task.notes && (
          <Typography 
            variant="caption" 
            color="text.secondary"
            sx={{ 
              wordBreak: 'break-word',
              whiteSpace: 'pre-wrap',
              lineHeight: 1.3,
              mb: 0.5,
              fontStyle: 'italic',
              opacity: task.status === 'completed' ? 0.4 : 0.6,
              fontSize: '0.75rem',
              display: 'block'
            }}
          >
            {task.notes}
          </Typography>
        )}


      </Box>

      {/* Right side elements */}
      <Box sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 0.75,
        flexShrink: 0
      }}>
        {/* Quick Reschedule Buttons */}
        {showQuickReschedule && onQuickReschedule && (
          <Box sx={{ 
            display: 'flex', 
            gap: 0.5,
            flexWrap: 'wrap',
            mr: 1,
            opacity: task.status === 'completed' ? 0.4 : 1,
            pointerEvents: task.status === 'completed' ? 'none' : 'auto'
          }}>
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                onQuickReschedule(task, addDays(new Date(), 1));
              }}
              disabled={task.status === 'completed'}
              sx={{
                fontSize: '0.65rem',
                height: '24px',
                minWidth: 'auto',
                px: 1,
                borderColor: task.status === 'completed' ? '#ccc' : '#FF9800',
                color: task.status === 'completed' ? '#ccc' : '#FF9800',
                '&:hover': {
                  bgcolor: task.status === 'completed' ? 'transparent' : '#FF9800',
                  color: task.status === 'completed' ? '#ccc' : 'white',
                },
                '&.Mui-disabled': {
                  borderColor: '#ccc',
                  color: '#ccc',
                  opacity: 0.6
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
                onQuickReschedule(task, addDays(new Date(), 2));
              }}
              disabled={task.status === 'completed'}
              sx={{
                fontSize: '0.65rem',
                height: '24px',
                minWidth: 'auto',
                px: 1,
                borderColor: task.status === 'completed' ? '#ccc' : '#9C27B0',
                color: task.status === 'completed' ? '#ccc' : '#9C27B0',
                '&:hover': {
                  bgcolor: task.status === 'completed' ? 'transparent' : '#9C27B0',
                  color: task.status === 'completed' ? '#ccc' : 'white',
                },
                '&.Mui-disabled': {
                  borderColor: '#ccc',
                  color: '#ccc',
                  opacity: 0.6
                }
              }}
            >
              Day After
            </Button>
            <Button
              size="small"
              variant="outlined"
              onClick={(e) => {
                e.stopPropagation();
                onQuickReschedule(task, addDays(new Date(), 7));
              }}
              disabled={task.status === 'completed'}
              sx={{
                fontSize: '0.65rem',
                height: '24px',
                minWidth: 'auto',
                px: 1,
                borderColor: task.status === 'completed' ? '#ccc' : '#607D8B',
                color: task.status === 'completed' ? '#ccc' : '#607D8B',
                '&:hover': {
                  bgcolor: task.status === 'completed' ? 'transparent' : '#607D8B',
                  color: task.status === 'completed' ? '#ccc' : 'white',
                },
                '&.Mui-disabled': {
                  borderColor: '#ccc',
                  color: '#ccc',
                  opacity: 0.6
                }
              }}
            >
              Next Week
            </Button>
          </Box>
        )}

        {/* Status Badge */}
        <Chip
          label={task.status === 'in-progress' ? 'Active' : task.status === 'completed' ? 'Done' : 'To Do'}
          color={task.status === 'in-progress' ? 'warning' : task.status === 'completed' ? 'success' : 'info'}
          size="small"
          sx={{ 
            fontWeight: 500,
            height: '16px',
            '& .MuiChip-label': {
              px: 0.5,
              fontSize: '0.65rem'
            }
          }}
        />

        {/* Account Photo */}
        {task.accountPicture && (
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: `2px solid ${accountColor}`,
            boxShadow: `0 2px 4px ${accountColor}40`
          }}>
            <img 
              src={task.accountPicture} 
              alt={task.accountName || task.accountEmail}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover'
              }}
            />
          </Box>
        )}
        {/* Fallback to letter if no photo */}
        {!task.accountPicture && (
          <Box sx={{
            width: '24px',
            height: '24px',
            bgcolor: accountColor,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.7rem',
            fontWeight: 'bold',
            borderRadius: '50%',
            border: `2px solid ${accountColor}`,
            boxShadow: `0 2px 4px ${accountColor}40`
          }}>
            {(task.accountName || task.accountEmail).charAt(0).toUpperCase()}
          </Box>
        )}

        {/* Recurring Task Indicator */}
        {task.isRecurring && (
          <Box sx={{ 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '20px',
            height: '20px',
            borderRadius: '50%',
            bgcolor: 'orange',
            color: 'white',
            fontSize: '0.7rem',
            boxShadow: '0 2px 4px rgba(255, 152, 0, 0.4)'
          }}>
            🔄
          </Box>
        )}

        {/* Edit Button */}
        <IconButton
          size="small"
          onClick={() => onEdit(task)}
          sx={{
            ml: 0.5,
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            '&:hover': {
              backgroundColor: 'primary.main',
              color: 'white',
              transform: 'scale(1.1) rotate(5deg)',
              boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
            },
            '& .MuiSvgIcon-root': {
              fontSize: '1rem',
            },
            width: '28px',
            height: '28px',
            zIndex: 2,
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
};

export default TaskRow; 