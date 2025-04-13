import React, { useState, useEffect } from "react";
import {
  Container,
  Typography,
  Box,
  TextField,
  Button,
  Paper,
  Link as MuiLink,
  Alert,
  Grid,
} from "@mui/material";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@features/auth/hooks/useAuth";
import { useForm } from "react-hook-form";
import * as yup from "yup";
import { yupResolver } from "@hookform/resolvers/yup";
import ErrorAlert from "@components/common/ErrorAlert";
import { toast } from "react-toastify";
import { setError } from "@features/auth/slices/authSlice";
import { useAppDispatch } from "@hooks/index";

interface LoginFormData {
  email: string;
  password: string;
}

const schema = yup.object().shape({
  email: yup
    .string()
    .required("メールアドレスは必須です")
    .email("有効なメールアドレスを入力してください"),
  password: yup
    .string()
    .required("パスワードは必須です")
    .min(8, "パスワードは8文字以上で入力してください"),
});

const LoginPage: React.FC = () => {
  const { login, loading, error, isAuthenticated } = useAuth();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  // ロケーション情報を取得して、セッション切れの場合にメッセージを表示
  const location = useLocation();
  const { state } = location;

  // ページ遷移時にエラー状態をクリア
  useEffect(() => {
    return () => {
      // コンポーネントのアンマウント時にエラーをクリア
      dispatch(setError(null));
    };
  }, [dispatch]);

  useEffect(() => {
    // セッション切れのフラグがあればトースト通知を表示
    if (state && state.sessionExpired) {
      toast.warning(
        "セッションの有効期限が切れました。再度ログインしてください。",
        {
          position: "top-center",
          autoClose: 5000,
        }
      );
    }
  }, [state]);

  // 認証状態が変わったときに成功メッセージを表示
  useEffect(() => {
    if (isAuthenticated) {
      setSuccessMessage("ログインに成功しました。リダイレクトします...");
    }
  }, [isAuthenticated]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: yupResolver(schema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setSuccessMessage(null);
    // エラーが出る可能性があるため、前回のエラーをクリア
    dispatch(setError(null));

    try {
      await login(data.email, data.password);
      // 成功メッセージはisAuthenticatedの変更を検知して表示するよう変更
    } catch (err) {
      // エラーはuseAuthフックで処理されるので、ここでは何もしない
      setSuccessMessage(null);
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
          ログイン
        </Typography>

        {successMessage && !error && (
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
            id="email"
            label="メールアドレス"
            autoComplete="email"
            autoFocus
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
            autoComplete="current-password"
            {...register("password")}
            error={Boolean(errors.password)}
            helperText={errors.password?.message}
            disabled={loading}
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={loading}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </Button>
          <Grid container>
            <Grid item xs>
              <Link to="/forgot-password" style={{ textDecoration: "none" }}>
                パスワードをお忘れですか？
              </Link>
            </Grid>
            <Grid item>
              <Link
                to="/register"
                style={{ textDecoration: "none" }}
                onClick={() => dispatch(setError(null))}
              >
                アカウントをお持ちでない方はこちら
              </Link>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default LoginPage;
