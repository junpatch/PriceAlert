import React from "react";
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
import { useAppSelector } from "@hooks/index";
import { AuthProvider } from "@contexts/AuthContext";

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
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
        },
      },
    },
  },
});

// 認証が必要なルートのラッパーコンポーネント
const ProtectedRoute: React.FC = () => {
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const location = useLocation();

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
