import React from 'react';
import { Box, Typography, Chip, IconButton } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';

export interface TaskRowProps {
  task: any;
  onEdit: (task: any) => void;
  accountColor: string;
  showDivider?: boolean;
  isOverdue?: boolean | null;
}

const TaskRow: React.FC<TaskRowProps> = ({ task, onEdit, accountColor, showDivider = true, isOverdue = false }) => {
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
        borderLeft: `3px solid ${isOverdueTask ? '#f44336' : accountColor}`,
        position: 'relative',
        bgcolor: isOverdueTask ? '#ffebee' : 'white',
        '&:hover': {
          bgcolor: isOverdueTask ? '#ffcdd2' : 'action.hover',
        },
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
            lineHeight: 1.3
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
            backgroundColor: 'rgba(255,255,255,0.9)',
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