import React from "react";
import { Box, CssBaseline } from "@mui/material";
import Header from "./Header";
import Footer from "./Footer";
import { useAppSelector } from "@hooks/index";
import LoadingSpinner from "@components/common/LoadingSpinner";
import DemoUserBanner from "../DemoUserBanner";
import { useAuth } from "@contexts/AuthContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoading } = useAppSelector((state) => state.ui);
  const { user, isAuthenticated } = useAuth();

  // デモユーザーかどうかを判定
  const isDemoUser = isAuthenticated && user?.email === "test3146@testtest.com";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
      }}
    >
      <CssBaseline />
      <Header />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: { xs: 1, sm: 2, md: 3 },
          px: { xs: 0, sm: 1, md: 2 },
        }}
      >
        {isLoading && <LoadingSpinner fullPage />}
        {isDemoUser && (
          <Box sx={{ px: { xs: 2, sm: 3, md: 4 } }}>
            <DemoUserBanner />
          </Box>
        )}
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default Layout;
