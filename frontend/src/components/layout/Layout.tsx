import React from 'react';
import { Box, CssBaseline, Toolbar } from '@mui/material';
import Header from './Header';
import Footer from './Footer';
import { useAppSelector } from '@hooks/index';
import LoadingSpinner from '@components/common/LoadingSpinner';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isLoading } = useAppSelector((state) => state.ui);

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100vh',
      }}
    >
      <CssBaseline />
      <Header />
      <Toolbar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          py: 3,
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