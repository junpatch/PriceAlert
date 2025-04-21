import React from "react";
import {
  Box,
  CssBaseline,
  Toolbar,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import Header from "./Header";
import Footer from "./Footer";
import { useAppSelector } from "@hooks/index";
import LoadingSpinner from "@components/common/LoadingSpinner";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoading } = useAppSelector((state) => state.ui);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

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
      <Toolbar sx={{ minHeight: { xs: 48, sm: 56, md: 64 } }} />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: { xs: 1, sm: 2, md: 3 },
          px: { xs: 0, sm: 1, md: 2 },
        }}
      >
        {isLoading && <LoadingSpinner fullPage />}
        {children}
      </Box>
      <Footer />
    </Box>
  );
};

export default Layout;
