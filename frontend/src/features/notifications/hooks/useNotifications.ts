import { useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@hooks/index';
import {
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation
} from '@services/api';
import {
  setNotifications,
  markAsRead,
  markAllAsRead,
  setLoading,
  setError
} from '../slices/notificationsSlice';

export const useNotifications = () => {
  const { notifications, unreadCount, loading, error } = useAppSelector(state => state.notifications);
  const { isAuthenticated } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();

  const { data: notificationsData, isLoading: isNotificationsLoading } = useGetNotificationsQuery(undefined, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true
  });
  const [markNotificationAsReadMutation, { isLoading: isMarkReadLoading }] = useMarkNotificationAsReadMutation();
  const [markAllNotificationsAsReadMutation, { isLoading: isMarkAllReadLoading }] = useMarkAllNotificationsAsReadMutation();

  useEffect(() => {
    if (notificationsData) {
      dispatch(setNotifications(notificationsData));
    }
  }, [notificationsData, dispatch]);

  useEffect(() => {
    dispatch(setLoading(
      isNotificationsLoading || 
      isMarkReadLoading || 
      isMarkAllReadLoading
    ));
  }, [isNotificationsLoading, isMarkReadLoading, isMarkAllReadLoading, dispatch]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsReadMutation(id).unwrap();
      dispatch(markAsRead(id));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '通知の既読設定に失敗しました';
      dispatch(setError(errorMessage));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsReadMutation().unwrap();
      dispatch(markAllAsRead());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '全通知の既読設定に失敗しました';
      dispatch(setError(errorMessage));
    }
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
  };
}; 