import React from "react";
import { Container, Box } from "@mui/material";
import ForgotPasswordForm from "@features/auth/components/ForgotPasswordForm";

const ForgotPasswordPage: React.FC = () => {
  return (
    <Container component="main" maxWidth="sm">
      <Box sx={{ my: 4 }}>
        <ForgotPasswordForm />
      </Box>
    </Container>
  );
};

export default ForgotPasswordPage;
