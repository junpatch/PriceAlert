import React from "react";
import { Container, Box } from "@mui/material";
import ResetPasswordForm from "@features/auth/components/ResetPasswordForm";

const ResetPasswordPage: React.FC = () => {
  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <ResetPasswordForm />
      </Box>
    </Container>
  );
};

export default ResetPasswordPage;
