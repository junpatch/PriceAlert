import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
} from "@services/api";
import {
  loginSuccess,
  logout,
  setError,
  setLoading,
  setUser,
  syncTokenFromStorage,
} from "@features/auth/slices/authSlice";
import { RootState } from "@store/index";
import { useSelector } from "react-redux";
import { User } from "@/types";
import { TokenManager } from "@/utils/tokenManager";
import { IntervalManager } from "@/utils/intervalManager";
import { Logger } from "@/utils/logger";
import { ErrorHandler } from "@/utils/errorHandler";
import { AUTH_CONSTANTS } from "@/constants/auth";

// Logger初期化
const logger = Logger.getLogger("AuthContext");

// AuthContextの型定義
interface AuthContextType {
  login: (email: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// AuthContextの作成
const AuthContext = createContext<AuthContextType | null>(null);

// 古いグローバル関数のラッパー - 互換性のために残す
export const clearAllAuthIntervals = () => {
  logger.debug("clearAllAuthIntervals: 互換性のために残されている旧関数");
  IntervalManager.clearAll();
};

// AuthContextを使用するためのカスタムフック
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuthはAuthProviderの中で使用する必要があります");
  }
  return context;
};

// AuthProviderコンポーネント
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Reduxストアから認証状態を取得
  const { user, token, isAuthenticated, loading, error } = useSelector(
    (state: RootState) => state.auth
  );

  // APIミューテーションフックの初期化
  const [login] = useLoginMutation();
  const [register] = useRegisterMutation();
  const [logoutApi] = useLogoutMutation();
  const [refreshToken] = useRefreshTokenMutation();

  // ログアウト処理中かどうかを追跡するフラグ
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // ユーザー情報の取得
  const { data: currentUser, refetch: refetchUser } = useGetCurrentUserQuery(
    undefined,
    {
      skip: !token,
      refetchOnMountOrArgChange: true,
    }
  );

  // 初期化時の処理
  useEffect(() => {
    logger.debug("AuthProviderが初期化されました");

    // アプリケーション起動時にlocalStorageとReduxストアのトークンを同期
    dispatch(syncTokenFromStorage());

    // コンポーネントのクリーンアップ
    return () => {
      logger.debug("AuthProviderがクリーンアップ中");
      IntervalManager.clearAll();
    };
  }, [dispatch]);

  // ユーザー情報が取得できたらReduxストアを更新
  useEffect(() => {
    if (currentUser) {
      logger.debug("ユーザー情報を更新", currentUser);
      dispatch(setUser(currentUser));
    } else {
      logger.debug("currentUserがnullまたはundefined", currentUser);
    }
  }, [currentUser, dispatch]);

  // トークンリフレッシュ処理を行う関数
  const handleTokenRefresh = useCallback(async () => {
    try {
      logger.debug("トークンリフレッシュを実行中...");
      const refreshTokenValue = TokenManager.getRefreshToken();

      if (!refreshTokenValue) {
        logger.warn("リフレッシュトークンが存在しません");
        return;
      }

      const result = await refreshToken({
        refresh: refreshTokenValue,
      }).unwrap();

      // 新しいトークンを保存
      TokenManager.saveTokens(result.access_token, result.refresh_token);

      // Reduxストアを更新
      if (user && Object.keys(user).length > 0) {
        logger.debug("既存ユーザー情報あり、維持します:", user);
        dispatch(
          loginSuccess({
            user: user,
            access_token: result.access_token,
            refresh_token: result.refresh_token,
          })
        );
      } else {
        logger.debug("ユーザー情報なし、トークンのみ更新します");
        dispatch({
          type: "auth/syncTokenFromStorage",
        });
      }

      // ユーザー情報を再取得
      logger.debug("ユーザー情報の再取得を開始");
      try {
        const userData = await refetchUser().unwrap();
        logger.debug("ユーザー情報の再取得成功:", userData);

        // 再取得したユーザー情報で明示的に更新
        if (userData) {
          dispatch(setUser(userData));
        }
      } catch (fetchError) {
        logger.error("ユーザー情報の再取得に失敗:", fetchError);
      }

      logger.debug(
        "トークンリフレッシュ成功 - 新しいリフレッシュトークンを保存しました"
      );
    } catch (error) {
      logger.error("トークンリフレッシュ失敗:", error);
      handleLogout(true); // 静かにログアウト
    }
  }, [refreshToken, dispatch, refetchUser, user]);

  // トークンの有効期限チェック
  const checkTokenExpiry = useCallback(() => {
    logger.debug("トークンの有効期限切れをチェック中...");
    if (!TokenManager.isTokenValid()) {
      logger.warn("トークンの有効期限切れを検知");
      handleLogout(true);
    }
  }, []);

  // 認証状態が変更されたときのトークンリフレッシュインターバルの設定
  useEffect(() => {
    logger.debug("認証状態変更検知 - isAuthenticated:", isAuthenticated);

    // 既存のインターバルをすべてクリア
    IntervalManager.clearInterval(AUTH_CONSTANTS.REFRESH_INTERVAL_KEY);
    IntervalManager.clearInterval(AUTH_CONSTANTS.TOKEN_CHECK_INTERVAL_KEY);

    // 認証されている場合のみインターバルを設定
    if (isAuthenticated) {
      logger.debug(
        "トークンリフレッシュおよび有効期限チェックインターバルを設定"
      );

      // 開発環境では短いインターバル、本番環境では長いインターバルを使用
      const refreshInterval = import.meta.env.DEV
        ? AUTH_CONSTANTS.REFRESH_INTERVAL_DEV
        : AUTH_CONSTANTS.REFRESH_INTERVAL;

      // リフレッシュトークンインターバルの設定
      IntervalManager.setInterval(
        AUTH_CONSTANTS.REFRESH_INTERVAL_KEY,
        handleTokenRefresh,
        refreshInterval
      );

      // トークン有効期限チェックインターバルの設定
      IntervalManager.setInterval(
        AUTH_CONSTANTS.TOKEN_CHECK_INTERVAL_KEY,
        checkTokenExpiry,
        AUTH_CONSTANTS.TOKEN_CHECK_INTERVAL
      );
    }
  }, [isAuthenticated, handleTokenRefresh, checkTokenExpiry]);

  // APIエラー監視処理
  useEffect(() => {
    // 401エラーを検知するためのイベントハンドラー
    const handleApiError = (event: CustomEvent) => {
      const { status, error } = event.detail;

      // すでにログアウト処理中なら何もしない
      if (isLoggingOut) {
        logger.debug("すでにログアウト処理中のため、イベントを無視します");
        return;
      }

      // エラーハンドラーを使って401エラーを処理
      ErrorHandler.handleApiError("auth_401", status, error, () => {
        if (status === 401) {
          logger.debug("401エラーを検知したため、ログアウト処理を実行");
          handleLogout(true); // 静かにログアウト（APIリクエストなし）
        }
      });
    };

    // カスタムイベントのリスナー登録
    window.addEventListener(
      AUTH_CONSTANTS.API_ERROR_EVENT as any,
      handleApiError as EventListener
    );

    // クリーンアップ関数
    return () => {
      window.removeEventListener(
        AUTH_CONSTANTS.API_ERROR_EVENT as any,
        handleApiError as EventListener
      );
    };
  }, [isLoggingOut]);

  // ログアウト処理
  const handleLogout = async (silentMode: boolean = false) => {
    logger.debug(`ログアウト処理開始 (サイレントモード: ${silentMode})`);

    // 二重実行を防止
    if (isLoggingOut) {
      logger.warn(
        "すでにログアウト処理中です、重複を防止するためスキップします"
      );
      return;
    }

    setIsLoggingOut(true);

    try {
      // すべてのインターバルをクリア
      IntervalManager.clearAll();

      // バックエンドにログアウトリクエストを送信（サイレントモードでない場合のみ）
      if (!silentMode) {
        try {
          await logoutApi().unwrap();
        } catch (apiError) {
          // ログアウトAPIの失敗は無視して続行
          logger.warn(
            "ログアウトAPIでエラーが発生しましたが、処理を続行します",
            apiError
          );
        }
      }

      // ReduxストアとlocalStorageをクリア
      dispatch(logout());

      // ログイン画面へリダイレクト
      navigate(AUTH_CONSTANTS.LOGIN_ROUTE);
    } catch (error) {
      logger.error("ログアウト中にエラー発生:", error);

      // エラー時にもインターバルとステートをクリア
      IntervalManager.clearAll();
      dispatch(logout());
      navigate(AUTH_CONSTANTS.LOGIN_ROUTE);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // ログイン処理
  const handleLogin = async (email: string, password: string) => {
    try {
      dispatch(setLoading(true));
      const result = await login({ email, password }).unwrap();

      dispatch(
        loginSuccess({
          user: result.user,
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        })
      );

      // ログイン成功時のリダイレクト処理
      navigate(AUTH_CONSTANTS.DASHBOARD_ROUTE, { replace: true });
    } catch (error: any) {
      const errorMessage = ErrorHandler.formatErrorMessage(error);
      dispatch(setError(errorMessage));
      toast.error(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  };

  // アカウント登録処理
  const handleRegister = async (
    username: string,
    email: string,
    password: string,
    confirmPassword: string
  ) => {
    try {
      dispatch(setLoading(true));

      // パスワード一致確認
      if (password !== confirmPassword) {
        const errorMessage = "パスワードが一致しません";
        dispatch(setError(errorMessage));
        toast.error(errorMessage);
        return;
      }

      const result = await register({
        username,
        email,
        password,
        confirmPassword,
      }).unwrap();

      dispatch(
        loginSuccess({
          user: result.user,
          access_token: result.access_token,
          refresh_token: result.refresh_token,
        })
      );

      // 登録成功時のリダイレクト処理
      navigate(AUTH_CONSTANTS.DASHBOARD_ROUTE, { replace: true });
      toast.success("アカウント登録が完了しました");
    } catch (error: any) {
      const errorMessage = ErrorHandler.formatErrorMessage(error);
      dispatch(setError(errorMessage));
      toast.error(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  };

  // AuthContextに提供する値
  const value = {
    login: handleLogin,
    register: handleRegister,
    logout: () => handleLogout(false), // 通常のログアウト（APIリクエストあり）
    user,
    isAuthenticated,
    loading,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
