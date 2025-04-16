import React, { useState } from "react";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Link as MuiLink,
  Alert,
} from "@mui/material";
import { Link } from "react-router-dom";
import { useAuth } from "@contexts/AuthContext";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import ErrorAlert from "@components/common/ErrorAlert";

interface RegisterFormData {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const schema = yup.object().shape({
  username: yup
    .string()
    .required("ユーザー名は必須です")
    .min(2, "ユーザー名は2文字以上で入力してください")
    .max(50, "ユーザー名は50文字以内で入力してください"),
  email: yup
    .string()
    .required("メールアドレスは必須です")
    .email("有効なメールアドレスを入力してください"),
  password: yup
    .string()
    .required("パスワードは必須です")
    .min(8, "パスワードは8文字以上で入力してください")
    .matches(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])/,
      "パスワードには英字の大文字、小文字、数字を含めてください"
    ),
  confirmPassword: yup
    .string()
    .required("パスワード（確認）は必須です")
    .oneOf([yup.ref("password")], "パスワードが一致しません"),
});

const RegisterPage: React.FC = () => {
  const { register: registerUser, loading, error } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setSuccessMessage(null);
    try {
      await registerUser(
        data.username,
        data.email,
        data.password,
        data.confirmPassword
      );
      setSuccessMessage("アカウント登録に成功しました。リダイレクトします...");
    } catch (err) {
      // エラーはuseAuthフックで処理されるので、ここでは何もしない
    }
  };

  return (
    <Container component="main" maxWidth="xs">
      <Paper
        elevation={3}
        sx={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          p: 4,
        }}
      >
        <Typography component="h1" variant="h5" gutterBottom>
          アカウント登録
        </Typography>

        {successMessage && (
          <Alert severity="success" sx={{ width: "100%", mb: 2 }}>
            {successMessage}
          </Alert>
        )}

        <ErrorAlert error={error} />

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ mt: 1, width: "100%" }}
        >
          <TextField
            margin="normal"
            required
            fullWidth
            id="username"
            label="ユーザー名"
            autoComplete="username"
            autoFocus
            {...register("username")}
            error={Boolean(errors.username)}
            helperText={errors.username?.message}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            id="email"
            label="メールアドレス"
            autoComplete="email"
            {...register("email")}
            error={Boolean(errors.email)}
            helperText={errors.email?.message}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="パスワード"
            type="password"
            id="password"
            autoComplete="new-password"
            {...register("password")}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            disabled={loading}
          />
          <TextField
            margin="normal"
            required
            fullWidth
            label="パスワード（確認）"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            {...register("confirmPassword")}
            error={Boolean(errors.confirmPassword)}
            helperText={errors.confirmPassword?.message}
            disabled={loading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? "登録中..." : "アカウント登録"}
          </Button>
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <MuiLink component={Link} to="/login" variant="body2">
              すでにアカウントをお持ちの方はこちら
            </MuiLink>
          </Box>
        </Box>
      </Paper>
    </Container>
  );
};

export default RegisterPage;
