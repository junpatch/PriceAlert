import React from "react";
import {
  Container,
  Typography,
  Box,
  Paper,
  useTheme,
  useMediaQuery,
} from "@mui/material";

interface PageContainerProps {
  title: string;
  children: React.ReactNode;
  maxWidth?: "xs" | "sm" | "md" | "lg" | "xl";
  subTitle?: string;
}

const PageContainer: React.FC<PageContainerProps> = ({
  title,
  children,
  maxWidth = "lg",
  subTitle,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Container
      maxWidth={maxWidth}
      sx={{
        py: { xs: 1, sm: 2, md: 3 },
        px: { xs: 1, sm: 2, md: 3 },
      }}
      disableGutters={isMobile}
    >
      <Paper
        sx={{
          p: { xs: 1.5, sm: 2, md: 3 },
          mb: { xs: 2, sm: 3, md: 4 },
          boxShadow: { xs: 0, sm: 1 }, // モバイル表示時はシャドウを消して余白減少
        }}
      >
        <Typography
          variant={isMobile ? "h5" : "h4"}
          component="h1"
          gutterBottom
        >
          {title}
        </Typography>
        {subTitle && (
          <Typography variant="subtitle1" color="text.secondary" gutterBottom>
            {subTitle}
          </Typography>
        )}
        <Box sx={{ mt: isMobile ? 1.5 : 3 }}>{children}</Box>
      </Paper>
    </Container>
  );
};

export default PageContainer;
