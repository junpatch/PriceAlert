import React, { useState } from "react";
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useResetPasswordMutation } from "@services/api";

// バリデーションスキーマ
const schema = yup.object({
  password: yup
    .string()
    .min(8, "パスワードは8文字以上である必要があります")
    .required("パスワードは必須です"),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref("password")], "パスワードが一致しません")
    .required("パスワード（確認）は必須です"),
});

type ResetPasswordFormData = {
  password: string;
  confirmPassword: string;
};

const ResetPasswordForm: React.FC = () => {
  const { token } = useParams<{ token: string }>();
  const [resetPassword, { isLoading }] = useResetPasswordMutation();
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setErrorMessage(
        "リセットトークンが無効です。もう一度パスワードリセットをお試しください。"
      );
      return;
    }

    try {
      setErrorMessage(null);

      // トークンをログに出力（デバッグ用）
      if (import.meta.env.DEV) {
        console.log("パスワードリセット実行：", { token, ...data });
      }

      await resetPassword({
        token,
        password: data.password,
        confirmPassword: data.confirmPassword,
      }).unwrap();
      setSuccess(true);

      // 3秒後にログインページにリダイレクト
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (err: any) {
      console.error("パスワードリセットエラー:", err);
      setErrorMessage(
        err.data?.detail ||
          err.data?.token?.[0] ||
          err.data?.password?.[0] ||
          err.data?.non_field_errors?.[0] ||
          "パスワードのリセットに失敗しました。もう一度お試しください。"
      );
    }
  };

  if (!token) {
    return (
      <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: "auto" }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          リセットトークンが見つかりません。URLが正しいことを確認するか、もう一度パスワードリセットをリクエストしてください。
        </Alert>
        <Button
          component={Link}
          to="/forgot-password"
          variant="contained"
          fullWidth
          sx={{ mt: 2 }}
        >
          パスワードリセットを再リクエスト
        </Button>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: "auto" }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        新しいパスワードの設定
      </Typography>

      {success ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            パスワードが正常にリセットされました。
          </Alert>
          <Typography variant="body1" gutterBottom>
            新しいパスワードでログインできるようになりました。3秒後にログイン画面に移動します...
          </Typography>
          <Button
            component={Link}
            to="/login"
            variant="contained"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
          >
            ログイン画面へ
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Typography variant="body1" gutterBottom>
            新しいパスワードを入力してください。
          </Typography>

          {errorMessage && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {errorMessage}
            </Alert>
          )}

          <TextField
            margin="normal"
            required
            fullWidth
            label="新しいパスワード"
            type="password"
            id="password"
            autoComplete="new-password"
            {...register("password")}
            error={!!errors.password}
            helperText={errors.password?.message}
          />

          <TextField
            margin="normal"
            required
            fullWidth
            label="新しいパスワード（確認）"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={!!errors.confirmPassword}
            helperText={errors.confirmPassword?.message}
          />

          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? (
              <CircularProgress size={24} color="inherit" />
            ) : (
              "パスワードを変更する"
            )}
          </Button>

          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Typography variant="body2">
              <Link to="/login" style={{ textDecoration: "none" }}>
                ログイン画面に戻る
              </Link>
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default ResetPasswordForm;
