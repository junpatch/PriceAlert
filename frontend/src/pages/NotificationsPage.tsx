import React from "react";
import {
  List,
  Button,
  Box,
  Typography,
  Divider,
  Pagination,
  FormControlLabel,
  Switch,
  Stack,
} from "@mui/material";
import {
  NotificationsNone as NotificationsIcon,
  DoneAll as DoneAllIcon,
} from "@mui/icons-material";
import PageContainer from "@components/layout/PageContainer";
import NotificationItem from "@components/notifications/NotificationItem";
import { useNotifications } from "@features/notifications/hooks/useNotifications";
import LoadingSpinner from "@components/common/LoadingSpinner";
import ErrorAlert from "@components/common/ErrorAlert";

// DRFのAPIが返す１ページあたりの通知数
const ITEMS_PER_PAGE = 10;

const NotificationsPage: React.FC = () => {
  const {
    notifications,
    unreadCount,
    loading,
    error,
    markAsRead,
    markAllAsRead,
    totalCount,
    currentPage,
    changePage,
    unreadFilter,
    toggleUnreadFilter,
  } = useNotifications();

  // 総ページ数を計算
  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handlePageChange = (
    _event: React.ChangeEvent<unknown>,
    newPage: number
  ) => {
    changePage(newPage);
  };

  const handleMarkAllAsRead = () => {
    markAllAsRead();
  };

  const handleToggleUnreadFilter = () => {
    toggleUnreadFilter();
  };

  return (
    <PageContainer title="通知" subTitle="価格変動や重要なお知らせ">
      <ErrorAlert error={error} />

      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h6">
          {unreadCount > 0
            ? `未読の通知が${unreadCount}件あります`
            : "すべての通知を既読済みです"}
        </Typography>

        <Stack direction="row" spacing={2} alignItems="center">
          <FormControlLabel
            control={
              <Switch
                checked={unreadFilter}
                onChange={handleToggleUnreadFilter}
                color="primary"
              />
            }
            label="未読のみ表示"
            sx={{ mr: 1 }}
          />

          {unreadCount > 0 && unreadFilter && (
            <Button
              variant="outlined"
              startIcon={<DoneAllIcon />}
              onClick={handleMarkAllAsRead}
              disabled={loading}
              size="small"
            >
              すべて既読にする
            </Button>
          )}
        </Stack>
      </Box>

      <Divider sx={{ mb: 2 }} />

      {loading ? (
        <LoadingSpinner />
      ) : notifications.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 5 }}>
          <NotificationsIcon
            sx={{ fontSize: 60, color: "text.secondary", mb: 2 }}
          />
          <Typography variant="h6" color="text.secondary">
            {unreadFilter ? "未読の通知はありません" : "通知はありません"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {unreadFilter
              ? "すべての通知を表示するには、未読フィルターをオフにしてください"
              : "価格が変動すると、ここに通知が表示されます"}
          </Typography>
        </Box>
      ) : (
        <>
          <List sx={{ width: "100%", bgcolor: "background.paper", mb: 3 }}>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkAsRead={markAsRead}
              />
            ))}
          </List>

          {totalPages > 1 && (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                mt: 2,
                py: 2,
                bgcolor: "background.paper",
                borderRadius: 1,
                boxShadow: 1,
              }}
            >
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={handlePageChange}
                color="primary"
                size="large"
                showFirstButton
                showLastButton
                siblingCount={1}
                boundaryCount={1}
              />
            </Box>
          )}
        </>
      )}
    </PageContainer>
  );
};

export default NotificationsPage;
