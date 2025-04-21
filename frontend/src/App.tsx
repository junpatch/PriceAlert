import React, { useEffect } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";
import { CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import Layout from "@components/layout/Layout";
import LandingPage from "@pages/LandingPage";
import LoginPage from "@pages/LoginPage";
import RegisterPage from "@pages/RegisterPage";
import DashboardPage from "@pages/DashboardPage";
import AddProductPage from "@pages/AddProductPage";
import ProductDetailPage from "@pages/ProductDetailPage";
import NotificationsPage from "@pages/NotificationsPage";
import SettingsPage from "@pages/SettingsPage";
import ForgotPasswordPage from "@pages/ForgotPasswordPage";
import ResetPasswordPage from "@pages/ResetPasswordPage";
import GlobalErrorHandler from "@components/common/GlobalErrorHandler";
import { useAppSelector, useAppDispatch } from "@hooks/index";
import { AuthProvider } from "@contexts/AuthContext";
import { api } from "@services/api";
import { resetNotifications } from "@features/notifications/slices/notificationsSlice";
import { clearAllCache } from "@store/slices/cacheSlice";

// テーマ設定
const theme = createTheme({
  palette: {
    primary: {
      main: "#1976d2",
    },
    secondary: {
      main: "#f50057",
    },
  },
  typography: {
    fontFamily: [
      "-apple-system",
      "BlinkMacSystemFont",
      '"Segoe UI"',
      "Roboto",
      '"Helvetica Neue"',
      "Arial",
      "sans-serif",
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(","),
    // モバイル向けにフォントサイズを調整
    h4: {
      fontSize: "1.75rem",
      "@media (max-width:600px)": {
        fontSize: "1.4rem",
      },
    },
    h5: {
      fontSize: "1.5rem",
      "@media (max-width:600px)": {
        fontSize: "1.25rem",
      },
    },
    h6: {
      fontSize: "1.25rem",
      "@media (max-width:600px)": {
        fontSize: "1.1rem",
      },
    },
    body1: {
      "@media (max-width:600px)": {
        fontSize: "0.95rem",
      },
    },
    body2: {
      "@media (max-width:600px)": {
        fontSize: "0.85rem",
      },
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
        // モバイル向けにボタンサイズ最適化
        sizeSmall: {
          padding: "4px 10px",
          fontSize: "0.8125rem",
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          "@media (max-width:600px)": {
            boxShadow: "0px 2px 4px -1px rgba(0,0,0,0.1)",
          },
        },
      },
    },
    MuiCardContent: {
      styleOverrides: {
        root: {
          "@media (max-width:600px)": {
            padding: "12px",
            "&:last-child": {
              paddingBottom: "12px",
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          "@media (max-width:600px)": {
            padding: "8px 6px",
          },
        },
        sizeSmall: {
          "@media (max-width:600px)": {
            padding: "6px 4px",
          },
        },
      },
    },
  },
});

// 認証が必要なルートのラッパーコンポーネント
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const location = useLocation();
  const dispatch = useAppDispatch();

  // ユーザーIDが変更されたかどうかを追跡する
  useEffect(() => {
    // ユーザーIDをlocalStorageに保存し、ユーザー切り替えを検出する
    const prevUserId = localStorage.getItem("lastUserId");
    const currentUserId = user?.id.toString();

    if (currentUserId && prevUserId && prevUserId !== currentUserId) {
      console.log("ユーザーが切り替わりました。キャッシュをクリアします。");
      // ユーザー切り替え検出時、APIキャッシュをリセット
      dispatch(api.util.resetApiState());
      dispatch(resetNotifications());
      dispatch(clearAllCache());
    }

    // 現在のユーザーIDを保存
    if (currentUserId) {
      localStorage.setItem("lastUserId", currentUserId);
    }
  }, [user, dispatch]);

  // セッション切れでログインページに戻される場合、state経由でメッセージを渡す
  if (!isAuthenticated) {
    // ログインページ以外からのリダイレクトであれば、元のパスを保存
    // ただし、意図的なログアウトの場合はsessionExpiredフラグを設定しない
    const isIntentionalLogout = location.state?.isIntentionalLogout;
    const isPageReload = !location.state && location.pathname !== "/login";

    return (
      <Navigate
        to="/login"
        state={{
          from: location.pathname,
          sessionExpired: !isIntentionalLogout && !isPageReload,
        }}
        replace
      />
    );
  }

  return <Outlet />;
};

const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AuthProvider>
          <GlobalErrorHandler />
          <Layout>
            <Routes>
              {/* パブリックルート */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route
                path="/reset-password/:token"
                element={<ResetPasswordPage />}
              />

              {/* 認証が必要なルート */}
              <Route element={<ProtectedRoute />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/products/add" element={<AddProductPage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* 不明なルートはダッシュボードか未ログインならトップページへリダイレクト */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
          <ToastContainer position="bottom-right" />
        </AuthProvider>
      </Router>
    </ThemeProvider>
  );
};

export default App;
