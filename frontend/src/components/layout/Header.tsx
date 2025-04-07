import React, { useState } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Box,
  Menu,
  MenuItem,
  Badge,
  useMediaQuery,
  useTheme,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import {
  Menu as MenuIcon,
  Dashboard as DashboardIcon,
  AddCircle as AddIcon,
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  ExitToApp as LogoutIcon,
  Person as PersonIcon,
} from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@features/auth/hooks/useAuth";
import { useNotifications } from "@features/notifications/hooks/useNotifications";

const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));

  // ユーザー情報が変更されたときにコンソールに出力 (デバッグ用)
  React.useEffect(() => {
    if (user) {
      console.log("Header - 現在のユーザー情報:", user);
    }
  }, [user]);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const handleLogout = () => {
    logout();
    handleMenuClose();
  };

  const menuItems = [
    { text: "ダッシュボード", icon: <DashboardIcon />, path: "/dashboard" },
    { text: "商品登録", icon: <AddIcon />, path: "/products/add" },
    { text: "通知", icon: <NotificationsIcon />, path: "/notifications" },
    { text: "設定", icon: <SettingsIcon />, path: "/settings" },
  ];

  const drawer = (
    <Box>
      <Box sx={{ p: 2 }}>
        <Typography variant="h6" component="div">
          PriceAlert
        </Typography>
      </Box>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem
            button
            key={item.text}
            onClick={() => {
              navigate(item.path);
              setMobileOpen(false);
            }}
          >
            <ListItemIcon>
              {item.text === "通知" ? (
                <Badge badgeContent={unreadCount} color="error">
                  {item.icon}
                </Badge>
              ) : (
                item.icon
              )}
            </ListItemIcon>
            <ListItemText primary={item.text} />
          </ListItem>
        ))}
      </List>
      <Divider />
      <List>
        <ListItem button onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="ログアウト" />
        </ListItem>
      </List>
    </Box>
  );

  return (
    <>
      <AppBar position="sticky">
        <Toolbar>
          {isAuthenticated && isMobile && (
            <IconButton
              color="inherit"
              aria-label="メニューを開く"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Link
              to={isAuthenticated ? "/dashboard" : "/"}
              style={{ textDecoration: "none", color: "inherit" }}
            >
              PriceAlert
            </Link>
          </Typography>

          {isAuthenticated ? (
            <>
              {!isMobile && (
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  {menuItems.map((item) => (
                    <Button
                      key={item.text}
                      color="inherit"
                      component={Link}
                      to={item.path}
                      startIcon={
                        item.text === "通知" ? (
                          <Badge badgeContent={unreadCount} color="error">
                            {item.icon}
                          </Badge>
                        ) : (
                          item.icon
                        )
                      }
                      sx={{ ml: 1 }}
                    >
                      {item.text}
                    </Button>
                  ))}
                </Box>
              )}

              <IconButton
                size="large"
                edge="end"
                aria-label="アカウント"
                aria-haspopup="true"
                onClick={handleProfileMenuOpen}
                color="inherit"
              >
                <PersonIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                keepMounted
              >
                <MenuItem disabled>
                  {user ? `${user.username} (${user.email})` : "ユーザー"}
                </MenuItem>
                <MenuItem onClick={handleLogout}>ログアウト</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                ログイン
              </Button>
              <Button color="inherit" component={Link} to="/register">
                登録
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      {isAuthenticated && (
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={handleDrawerToggle}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: 240 },
          }}
        >
          {drawer}
        </Drawer>
      )}
    </>
  );
};

export default Header;
