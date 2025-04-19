import { useEffect, useState } from 'react';
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
  setError,
  setTotalCount,
  setUnreadCount,
  resetNotifications
} from '../slices/notificationsSlice';

export const useNotifications = () => {
  const { notifications, unreadCount, loading, error, totalCount } = useAppSelector(state => state.notifications);
  const { isAuthenticated, user } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadFilter, setUnreadFilter] = useState(false);
  const [prevUserId, setPrevUserId] = useState<number | null>(null);

  useEffect(() => {
    if (user && prevUserId !== null && user.id !== prevUserId) {
      console.log('通知フックでユーザー切り替えを検出: 状態をリセットします');
      dispatch(resetNotifications());
      setCurrentPage(1);
      setUnreadFilter(false);
    }
    
    if (user) {
      setPrevUserId(user.id);
    }
  }, [user, prevUserId, dispatch]);

  useEffect(() => {
    if (!isAuthenticated) {
      console.log('ログアウト状態を検出: 通知状態をリセットします');
      dispatch(resetNotifications());
      setCurrentPage(1);
      setUnreadFilter(false);
    }
  }, [isAuthenticated, dispatch]);

  const { 
    data: notificationsData, 
    isLoading: isNotificationsLoading 
  } = useGetNotificationsQuery({
    page: currentPage,
    is_read: unreadFilter ? false : undefined
  }, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true
  });
  
  const { 
    data: unreadData,
    isLoading: isUnreadLoading
  } = useGetNotificationsQuery({
    is_read: false
  }, {
    skip: !isAuthenticated,
    refetchOnMountOrArgChange: true,
    pollingInterval: 60000
  });
  
  const [markNotificationAsReadMutation, { isLoading: isMarkReadLoading }] = useMarkNotificationAsReadMutation();
  const [markAllNotificationsAsReadMutation, { isLoading: isMarkAllReadLoading }] = useMarkAllNotificationsAsReadMutation();

  useEffect(() => {
    if (notificationsData) {
      dispatch(setNotifications(notificationsData.results));
      dispatch(setTotalCount(notificationsData.count));
    }
  }, [notificationsData, dispatch]);

  useEffect(() => {
    if (unreadData) {
      dispatch(setUnreadCount(unreadData.count));
    }
  }, [unreadData, dispatch]);

  useEffect(() => {
    dispatch(setLoading(
      isNotificationsLoading || 
      isUnreadLoading ||
      isMarkReadLoading || 
      isMarkAllReadLoading
    ));
  }, [isNotificationsLoading, isUnreadLoading, isMarkReadLoading, isMarkAllReadLoading, dispatch]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await markNotificationAsReadMutation(id).unwrap();
      dispatch(markAsRead(id));
      
      if (unreadData) {
        dispatch(setUnreadCount(unreadData.count - 1));
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '通知の既読設定に失敗しました';
      dispatch(setError(errorMessage));
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsReadMutation().unwrap();
      dispatch(markAllAsRead());
      dispatch(setUnreadCount(0));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '全通知の既読設定に失敗しました';
      dispatch(setError(errorMessage));
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const toggleUnreadFilter = () => {
    setUnreadFilter(prev => !prev);
    setCurrentPage(1);
  };

  return {
    notifications,
    unreadCount,
    loading,
    error,
    totalCount,
    currentPage,
    unreadFilter,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    changePage: handlePageChange,
    toggleUnreadFilter,
  };
}; 