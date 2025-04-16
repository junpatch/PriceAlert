import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
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

// APIエラー監視のためのカスタムイベント名
const API_ERROR_EVENT = "api-auth-error";

// リフレッシュトークンのインターバル時間（分）
const REFRESH_TOKEN_INTERVAL = 0.1 * 60 * 1000; // 6秒（テスト用、本番環境では長くする）
const TOKEN_EXPIRY_CHECK_INTERVAL = 30 * 60 * 1000; // 30分

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
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// AuthContextの作成
const AuthContext = createContext<AuthContextType | null>(null);

// インターバルを追跡するためのグローバル変数
let activeAuthIntervals: number[] = [];

// グローバルなインターバルクリア関数
export const clearAllAuthIntervals = () => {
  console.log(
    `グローバル関数: 登録された ${activeAuthIntervals.length} 個のインターバルをクリア`
  );
  activeAuthIntervals.forEach((id) => {
    console.log(`グローバル関数: インターバル ${id} をクリア`);
    clearInterval(id);
  });
  activeAuthIntervals = [];
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

  // リフレッシュトークンインターバルの状態管理
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(
    null
  );
  const [tokenExpiryInterval, setTokenExpiryInterval] =
    useState<NodeJS.Timeout | null>(null);

  // ログアウト処理中かどうかを追跡するフラグ
  const [isLoggingOut, setIsLoggingOut] = useState<boolean>(false);

  // 401エラーイベントの処理回数を追跡
  const errorEventCountRef = useRef<number>(0);

  // デバッグ用インスタンスID
  const instanceId = React.useMemo(
    () => Math.random().toString(36).substring(2, 9),
    []
  );

  useEffect(() => {
    console.log(`AuthProvider[${instanceId}]: 初期化されました`);

    // アプリケーション起動時にlocalStorageとReduxストアのトークンを同期
    dispatch(syncTokenFromStorage());

    // コンポーネントのクリーンアップ
    return () => {
      console.log(`AuthProvider[${instanceId}]: クリーンアップ中`);
      if (refreshInterval) {
        console.log(
          `AuthProvider[${instanceId}]: リフレッシュインターバルをクリア - ID:`,
          refreshInterval
        );
        clearInterval(refreshInterval);
      }
      if (tokenExpiryInterval) {
        console.log(
          `AuthProvider[${instanceId}]: トークン有効期限チェックインターバルをクリア - ID:`,
          tokenExpiryInterval
        );
        clearInterval(tokenExpiryInterval);
      }

      // グローバルなインターバルクリア関数を使用
      console.log(
        `AuthProvider[${instanceId}]: アンマウント時にすべてのインターバルをクリア`
      );
      clearAllAuthIntervals();
    };
  }, []);

  // ユーザー情報の取得
  const { data: currentUser, refetch: refetchUser } = useGetCurrentUserQuery(
    undefined,
    {
      skip: !token,
      refetchOnMountOrArgChange: true,
    }
  );

  // ユーザー情報が取得できたらReduxストアを更新
  useEffect(() => {
    if (currentUser) {
      console.log(
        `AuthProvider[${instanceId}]: ユーザー情報を更新`,
        currentUser
      );
      dispatch(setUser(currentUser));
    } else {
      console.log(
        `AuthProvider[${instanceId}]: currentUserがnullまたはundefined`,
        currentUser
      );
    }
  }, [currentUser, dispatch]);

  // 認証状態が変更されたときのトークンリフレッシュインターバルの設定
  useEffect(() => {
    console.log(
      `AuthProvider[${instanceId}]: 認証状態変更検知 - isAuthenticated:`,
      isAuthenticated
    );

    // 既存のインターバルをクリア
    if (refreshInterval) {
      console.log(
        `AuthProvider[${instanceId}]: 既存のリフレッシュインターバルをクリア - ID:`,
        refreshInterval
      );
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }

    if (tokenExpiryInterval) {
      console.log(
        `AuthProvider[${instanceId}]: 既存のトークン有効期限チェックインターバルをクリア - ID:`,
        tokenExpiryInterval
      );
      clearInterval(tokenExpiryInterval);
      setTokenExpiryInterval(null);
    }

    // 認証されている場合のみインターバルを設定
    if (isAuthenticated) {
      // 既存のインターバルがある場合は新しく作成しない
      if (refreshInterval) {
        console.log(
          `AuthProvider[${instanceId}]: 既存のリフレッシュインターバルが存在するため、新しいインターバルは作成しません - 既存ID:`,
          refreshInterval
        );
        return;
      }

      console.log(
        `AuthProvider[${instanceId}]: リフレッシュトークンインターバルを設定`
      );

      // リフレッシュトークンインターバルの設定
      const interval = setInterval(async () => {
        try {
          console.log(
            `AuthProvider[${instanceId}]: トークンリフレッシュ実行中...`,
            interval
          );
          const refreshTokenValue = localStorage.getItem("refresh_token");
          if (refreshTokenValue) {
            console.log(
              `AuthProvider[${instanceId}]: リフレッシュトークン処理前のユーザー情報:`,
              user
            );

            const result = await refreshToken({
              refresh: refreshTokenValue,
            }).unwrap();

            // 新しいトークンを明示的に保存
            localStorage.setItem("token", result.access_token);
            localStorage.setItem("token_timestamp", Date.now().toString());
            localStorage.setItem("refresh_token", result.refresh_token);

            // 既存のユーザー情報がある場合のみloginSuccessを使用
            if (user && Object.keys(user).length > 0) {
              console.log(
                `AuthProvider[${instanceId}]: 既存ユーザー情報あり、維持します:`,
                user
              );
              dispatch(
                loginSuccess({
                  user: user,
                  access_token: result.access_token,
                  refresh_token: result.refresh_token,
                })
              );
            } else {
              console.log(
                `AuthProvider[${instanceId}]: ユーザー情報なし、トークンのみ更新します`
              );
              // トークンのみ更新する場合は自作のアクションを使用
              // Redux storeのisAuthenticatedフラグを更新
              dispatch({
                type: "auth/syncTokenFromStorage",
              });
            }

            // ユーザー情報を再取得
            console.log(
              `AuthProvider[${instanceId}]: ユーザー情報の再取得を開始`
            );
            try {
              const userData = await refetchUser().unwrap();
              console.log(
                `AuthProvider[${instanceId}]: ユーザー情報の再取得成功:`,
                userData
              );

              // 再取得したユーザー情報で明示的に更新
              if (userData) {
                dispatch(setUser(userData));
              }
            } catch (fetchError) {
              console.error(
                `AuthProvider[${instanceId}]: ユーザー情報の再取得に失敗:`,
                fetchError
              );
            }

            console.log(
              `AuthProvider[${instanceId}]: トークンリフレッシュ成功 - 新しいリフレッシュトークンを保存しました`
            );
          } else {
            console.warn(
              `AuthProvider[${instanceId}]: リフレッシュトークンが存在しません`
            );
          }
        } catch (error) {
          console.error(
            `AuthProvider[${instanceId}]: トークンリフレッシュ失敗:`,
            error
          );
          handleLogout();
        }
      }, REFRESH_TOKEN_INTERVAL);

      // グローバル配列にインターバルIDを追加
      activeAuthIntervals.push(interval as unknown as number);

      console.log(
        `AuthProvider[${instanceId}]: リフレッシュトークンインターバル設定 - ID:`,
        interval
      );
      setRefreshInterval(interval);

      // 既存の有効期限チェックインターバルがある場合は作成しない
      if (tokenExpiryInterval) {
        console.log(
          `AuthProvider[${instanceId}]: 既存のトークン有効期限チェックインターバルが存在するため、新しいインターバルは作成しません - 既存ID:`,
          tokenExpiryInterval
        );
      } else {
        // トークン有効期限チェックインターバルの設定
        const expiryInterval = setInterval(() => {
          const tokenTimestamp = localStorage.getItem("token_timestamp");
          console.log(
            `AuthProvider[${instanceId}]: トークンの有効期限切れチェック中... ID:`,
            tokenTimestamp
          );
          if (tokenTimestamp) {
            const expiryTime =
              parseInt(tokenTimestamp) + 7 * 60 * 60 * 24 * 1000; // 7日
            const currentTime = Date.now();
            if (currentTime > expiryTime) {
              console.log(
                `AuthProvider[${instanceId}]: トークンの有効期限切れを検知 ID:`,
                expiryInterval
              );
              handleLogout();
            }
          }
        }, TOKEN_EXPIRY_CHECK_INTERVAL);

        // グローバル配列にインターバルIDを追加
        activeAuthIntervals.push(expiryInterval as unknown as number);

        console.log(
          `AuthProvider[${instanceId}]: トークン有効期限チェックインターバル設定 - ID:`,
          expiryInterval
        );
        setTokenExpiryInterval(expiryInterval);
      }
    }
  }, [isAuthenticated]);

  // APIエラー監視処理
  useEffect(() => {
    // 401エラーを検知するためのイベントハンドラー
    const handleApiError = (event: CustomEvent) => {
      const { status, error } = event.detail;

      // すでにログアウト処理中なら何もしない
      if (isLoggingOut) {
        console.log(
          `AuthProvider[${instanceId}]: すでにログアウト処理中のため、イベントを無視します`
        );
        return;
      }

      // エラーカウントをインクリメント（無限ループ検出用）
      errorEventCountRef.current += 1;
      console.log(
        `AuthProvider[${instanceId}]: APIエラーイベント検知 (${errorEventCountRef.current}回目) - ステータス:`,
        status
      );

      // 一定回数以上エラーが発生したら無限ループと判断
      if (errorEventCountRef.current > 3) {
        console.error(
          `AuthProvider[${instanceId}]: エラーイベントが多すぎます。無限ループの可能性があるため、処理を中断します`
        );
        // カウンターをリセット
        errorEventCountRef.current = 0;
        return;
      }

      if (status === 401) {
        console.log(
          `AuthProvider[${instanceId}]: 401エラーを検知したため、ログアウト処理を実行`
        );
        handleLogout(true); // 静かにログアウト（APIリクエストなし）
      }
    };

    // カスタムイベントのリスナー登録
    window.addEventListener(
      API_ERROR_EVENT as any,
      handleApiError as EventListener
    );

    // クリーンアップ関数
    return () => {
      window.removeEventListener(
        API_ERROR_EVENT as any,
        handleApiError as EventListener
      );
    };
  }, [isLoggingOut]);

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
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      const errorMessage = error.data?.detail || "ログインに失敗しました";
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

      // ユーザー情報を最新化するため、少し遅延させてから取得
      setTimeout(() => {
        refetchUser();
      }, 500);

      navigate("/dashboard");
      toast.success("アカウント登録が完了しました。");
    } catch (error: any) {
      const errorMessage = error.data?.detail || "アカウント登録に失敗しました";
      dispatch(setError(errorMessage));
      toast.error(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  };

  // ログアウト処理
  const handleLogout = async (silentMode: boolean = false) => {
    console.log(
      `AuthProvider[${instanceId}]: ログアウト処理開始 (サイレントモード: ${silentMode})`
    );

    // ログアウト中フラグを設定
    setIsLoggingOut(true);

    try {
      // インターバルをクリア - 通常の方法
      if (refreshInterval) {
        console.log(
          `AuthProvider[${instanceId}]: リフレッシュインターバルをクリア - ID:`,
          refreshInterval
        );
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }

      if (tokenExpiryInterval) {
        console.log(
          `AuthProvider[${instanceId}]: トークン有効期限チェックインターバルをクリア - ID:`,
          tokenExpiryInterval
        );
        clearInterval(tokenExpiryInterval);
        setTokenExpiryInterval(null);
      }

      // グローバルなインターバルクリア関数を使用して念のためすべてクリア
      clearAllAuthIntervals();

      // バックエンドにログアウトリクエストを送信（サイレントモードでない場合のみ）
      if (!silentMode) {
        await logoutApi().unwrap();
      }

      // Reduxストアのクリア
      dispatch(logout());

      // エラーカウンターをリセット
      errorEventCountRef.current = 0;

      navigate("/login", {
        state: {
          isIntentionalLogout: true,
          sessionExpired: !silentMode,
        },
      });

      if (!silentMode) {
        toast.info("ログアウトしました。");
      }
    } catch (error) {
      console.error(
        `AuthProvider[${instanceId}]: ログアウト中にエラー発生:`,
        error
      );

      // エラーが発生しても状態をクリア
      dispatch(logout());

      // エラー時にもインターバルを確実にクリア
      clearAllAuthIntervals();

      navigate("/login");
    } finally {
      // ログアウト完了後、フラグをリセット
      setTimeout(() => {
        setIsLoggingOut(false);
      }, 1000); // 1秒の遅延を入れて、再エントリーを防止
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
