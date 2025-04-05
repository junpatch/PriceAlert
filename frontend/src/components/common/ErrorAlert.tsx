import React from 'react';
import { Alert, AlertTitle, Box, Collapse } from '@mui/material';

interface ErrorAlertProps {
  error: string | null;
  onClose?: () => void;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({ error, onClose }) => {
  return (
    <Collapse in={!!error}>
      <Box sx={{ mb: 2 }}>
        <Alert severity="error" onClose={onClose}>
          <AlertTitle>エラーが発生しました</AlertTitle>
          {error}
        </Alert>
      </Box>
    </Collapse>
  );
};

export default ErrorAlert; 