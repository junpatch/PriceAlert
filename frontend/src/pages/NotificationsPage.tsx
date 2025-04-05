import React from 'react';
import {
  List,
  Button,
  Box,
  Typography,
  Divider,
} from '@mui/material';
import { 
  NotificationsNone as NotificationsIcon,
  DoneAll as DoneAllIcon,
} from '@mui/icons-material';
import PageContainer from '@components/layout/PageContainer';
import NotificationItem from '@components/notifications/NotificationItem';
import { useNotifications } from '@features/notifications/hooks/useNotifications';
import LoadingSpinner from '@components/common/LoadingSpinner';
import ErrorAlert from '@components/common/ErrorAlert';

const NotificationsPage: React.FC = () => {
  const { notifications, unreadCount, loading, error, markAsRead, markAllAsRead } = useNotifications();
  
  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };
  
  return (
    <PageContainer
      title="通知"
      subTitle="価格変動や重要なお知らせ"
    >
      <ErrorAlert error={error} />
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          {unreadCount > 0 ? (
            `未読の通知が${unreadCount}件あります`
          ) : (
            'すべての通知を既読済みです'
          )}
        </Typography>
        
        {unreadCount > 0 && (
          <Button
            variant="outlined"
            startIcon={<DoneAllIcon />}
            onClick={handleMarkAllAsRead}
            disabled={loading}
          >
            すべて既読にする
          </Button>
        )}
      </Box>
      
      <Divider sx={{ mb: 2 }} />
      
      {loading ? (
        <LoadingSpinner />
      ) : notifications.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 5 }}>
          <NotificationsIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            通知はありません
          </Typography>
          <Typography variant="body2" color="text.secondary">
            価格が変動すると、ここに通知が表示されます
          </Typography>
        </Box>
      ) : (
        <List sx={{ width: '100%', bgcolor: 'background.paper' }}>
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={markAsRead}
            />
          ))}
        </List>
      )}
    </PageContainer>
  );
};

export default NotificationsPage; 