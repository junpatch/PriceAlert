import React from "react";
import { Alert, AlertTitle, Box, Collapse } from "@mui/material";

interface ErrorAlertProps {
  error: string | null;
  onClose?: () => void;
  severity?: "error" | "warning" | "info";
  title?: string;
}

const ErrorAlert: React.FC<ErrorAlertProps> = ({
  error,
  onClose,
  severity = "error",
  title,
}) => {
  // エラーメッセージに基づいてタイトルを自動決定
  const getErrorTitle = () => {
    if (title) return title;

    if (!error) return "エラーが発生しました";

    if (error.includes("見つかりません")) {
      return "商品が見つかりませんでした";
    } else if (error.includes("接続に失敗")) {
      return "接続エラー";
    } else if (error.includes("URL")) {
      return "URLが無効です";
    } else if (error.includes("外部サービス")) {
      return "サービスエラー";
    } else if (error.includes("予期せぬエラー")) {
      return "システムエラー";
    }

    return "エラーが発生しました";
  };

  // エラーメッセージの詳細を表示するかどうかを判断する
  const shouldShowErrorDetail = () => {
    if (!error) return true;

    // 特定のエラーケースでは詳細を表示しない
    if (error.includes("見つかりません")) return false;
    if (error.includes("外部サービス")) return false;
    if (error.includes("接続に失敗")) return false;
    if (error.includes("予期せぬエラー")) return false;

    return true;
  };

  return (
    <Collapse in={!!error}>
      <Box sx={{ mb: 2 }}>
        <Alert severity={severity} onClose={onClose}>
          <AlertTitle>{getErrorTitle()}</AlertTitle>
          {shouldShowErrorDetail() ? error : null}
        </Alert>
      </Box>
    </Collapse>
  );
};

export default ErrorAlert;
