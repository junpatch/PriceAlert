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
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import { useRequestPasswordResetMutation } from "@services/api";

// バリデーションスキーマ
const schema = yup.object({
  email: yup
    .string()
    .email("有効なメールアドレスを入力してください")
    .required("メールアドレスは必須です"),
});

type ForgotPasswordFormData = {
  email: string;
};

const ForgotPasswordForm: React.FC = () => {
  const [requestPasswordReset, { isLoading }] =
    useRequestPasswordResetMutation();
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    try {
      setErrorMessage(null);
      await requestPasswordReset(data).unwrap();
      setSuccess(true);
    } catch (err: any) {
      console.error("パスワードリセット要求エラー:", err);
      setErrorMessage(
        err.data?.detail ||
          err.data?.email?.[0] ||
          "パスワードリセットリンクの送信に失敗しました。もう一度お試しください。"
      );
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 4, maxWidth: 500, mx: "auto" }}>
      <Typography variant="h5" component="h1" gutterBottom align="center">
        パスワードをお忘れですか？
      </Typography>

      {success ? (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            パスワードリセットのためのリンクをメールに送信しました。メールをご確認ください。
          </Alert>
          <Typography variant="body1" gutterBottom>
            メールに記載されたリンクをクリックして、新しいパスワードを設定してください。
          </Typography>
          <Button
            component={Link}
            to="/login"
            variant="outlined"
            color="primary"
            fullWidth
            sx={{ mt: 2 }}
          >
            ログイン画面に戻る
          </Button>
        </Box>
      ) : (
        <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <Typography variant="body1" gutterBottom>
            アカウントに登録されているメールアドレスを入力してください。パスワードリセットのためのリンクをメールでお送りします。
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
            id="email"
            label="メールアドレス"
            autoComplete="email"
            autoFocus
            {...register("email")}
            error={!!errors.email}
            helperText={errors.email?.message}
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
              "リセットリンクを送信"
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

export default ForgotPasswordForm;
