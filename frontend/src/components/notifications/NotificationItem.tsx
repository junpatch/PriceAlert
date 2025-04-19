import React from 'react';
import {
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  IconButton,
  Box,
  Chip,
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  NavigateNext as NavigateNextIcon,
  PriceChange as PriceChangeIcon,
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { Notification } from '@/types';

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: number) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onMarkAsRead,
}) => {
  const {
    id,
    type,
    message,
    product,
    old_price,
    new_price,
    is_read,
    sent_at,
  } = notification;

  const formatPrice = (price?: number) => {
    return price ? `¥${price.toLocaleString()}` : '情報なし';
  };

  const getNotificationTypeInfo = () => {
    switch (type) {
      case 'price_drop':
        return {
          icon: <PriceChangeIcon />,
          color: 'success.main',
          label: '価格下落',
        };
      case 'price_rise':
        return {
          icon: <PriceChangeIcon />,
          color: 'error.main',
          label: '価格上昇',
        };
      default:
        return {
          icon: <NotificationsIcon />,
          color: 'primary.main',
          label: 'お知らせ',
        };
    }
  };

  const { icon, color, label } = getNotificationTypeInfo();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleClick = () => {
    if (!is_read) {
      onMarkAsRead(id);
    }
  };

  return (
    <ListItem
      alignItems="flex-start"
      sx={{
        backgroundColor: is_read ? 'transparent' : 'action.hover',
        borderRadius: 1,
        mb: 1,
      }}
      secondaryAction={
        <IconButton
          component={Link}
          to={`/products/${product.id}`}
          edge="end"
          aria-label="詳細"
        >
          <NavigateNextIcon />
        </IconButton>
      }
      onClick={handleClick}
    >
      <ListItemAvatar>
        <Avatar sx={{ bgcolor: color }}>{icon}</Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" component="span">
              {message}
            </Typography>
            <Chip size="small" label={label} color="primary" variant="outlined" />
            {!is_read && (
              <Chip size="small" label="未読" color="error" sx={{ ml: 1 }} />
            )}
          </Box>
        }
        secondary={
          <>
            <Typography component="span" variant="body2" color="text.primary">
              {old_price && new_price && (
                <Box component="span" sx={{ mr: 1 }}>
                  {formatPrice(old_price)} → {formatPrice(new_price)}
                </Box>
              )}
            </Typography>
            <Typography component="span" variant="body2" color="text.secondary">
              {formatDate(sent_at)}
            </Typography>
          </>
        }
      />
    </ListItem>
  );
};

export default NotificationItem; 