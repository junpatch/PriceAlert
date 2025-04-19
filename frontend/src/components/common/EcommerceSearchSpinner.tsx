import React from "react";
import { Box, CircularProgress, Typography, Paper } from "@mui/material";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import SearchIcon from "@mui/icons-material/Search";

interface EcommerceSearchSpinnerProps {
  message?: string;
}

const EcommerceSearchSpinner: React.FC<EcommerceSearchSpinnerProps> = ({
  message = "ECサイトから商品情報を取得中...",
}) => {
  return (
    <Paper
      elevation={3}
      sx={{
        p: 3,
        my: 2,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        backgroundColor: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(5px)",
        borderRadius: 2,
      }}
    >
      <Box
        sx={{
          position: "relative",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          mb: 2,
        }}
      >
        <CircularProgress
          size={80}
          thickness={3}
          sx={{
            color: (theme) => theme.palette.primary.main,
          }}
        />
        <Box
          sx={{
            position: "absolute",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <ShoppingCartIcon fontSize="large" />
        </Box>
      </Box>

      <Typography variant="h6" align="center" gutterBottom>
        {message}
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          mt: 1,
        }}
      >
        <SearchIcon color="primary" />
        <Typography variant="body2" color="text.secondary">
          商品情報を検索中...
        </Typography>
      </Box>
    </Paper>
  );
};

export default EcommerceSearchSpinner;
