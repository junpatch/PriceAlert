import React from "react";
import {
  Box,
  Paper,
  Typography,
  Button,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import { Info as InfoIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";

const DemoUserBanner: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  return (
    <Paper
      elevation={0}
      sx={{
        width: "100%",
        backgroundColor: "lightgray",
        py: 1,
        px: 2,
        mb: 2,
        borderRadius: 1,
        display: "flex",
        flexDirection: isMobile ? "column" : "row",
        alignItems: isMobile ? "flex-start" : "center",
        justifyContent: "space-between",
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center" }}>
        <InfoIcon color="info" sx={{ mr: 1 }} />
        <Typography variant="body2" color="info.dark">
          現在デモユーザーでログインしています。すべての機能をお試しいただけます。
        </Typography>
      </Box>
      <Button
        component={Link}
        to="/register"
        size="small"
        variant="outlined"
        color="info"
        sx={{ mt: isMobile ? 1 : 0, whiteSpace: "nowrap" }}
      >
        会員登録する
      </Button>
    </Paper>
  );
};

export default DemoUserBanner;
