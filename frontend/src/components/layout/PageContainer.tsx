import React from 'react';
import { Container, Typography, Box, Paper } from '@mui/material';

interface PageContainerProps {
  title: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  subTitle?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  children,
  maxWidth = 'lg',
  subTitle,
}) => {
  return (
    <Container maxWidth={maxWidth} sx={{ py: 3 }}>
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {title}
        </Typography>
        {subTitle && (
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {subTitle}
          </Typography>
        )}
        <Box sx={{ mt: 3 }}>{children}</Box>
      </Paper>
    </Container>
  );
};

export default PageContainer; 