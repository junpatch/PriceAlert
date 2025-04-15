import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useLoginMutation, useRegisterMutation, useLogoutMutation, useGetCurrentUserQuery, useRefreshTokenMutation } from '@services/api';
import { loginSuccess, logout, setError, setLoading, setUser, syncTokenFromStorage } from '../slices/authSlice';
import { RootState } from '@store/index';

const REFRESH_TOKEN_INTERVAL = 4 * 60 * 60 * 1000; // 4時間
const TOKEN_EXPIRY_CHECK_INTERVAL = 5 * 60 * 1000; // 5分

export const useAuth = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, token, isAuthenticated, loading, error } = useSelector((state: RootState) => state.auth);
  const [login] = useLoginMutation();
  const [register] = useRegisterMutation();
  const [logoutApi] = useLogoutMutation();
  const [refreshToken] = useRefreshTokenMutation();
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // アプリケーション起動時にlocalStorageとReduxストアのトークンを同期
  useEffect(() => {
    dispatch(syncTokenFromStorage());
  }, [dispatch]);
  
  const { data: currentUser, isLoading: isUserLoading, refetch: refetchUser } = useGetCurrentUserQuery(undefined, {
    skip: !token,
    refetchOnMountOrArgChange: true // コンポーネントマウント時に毎回最新情報を取得
  });

  useEffect(() => {
    if (currentUser) {
      console.log('getCurrentUserから新しいユーザー情報を取得:', currentUser);
      dispatch(setUser(currentUser));
    }
  }, [currentUser, dispatch]);

  useEffect(() => {
    dispatch(setLoading(isUserLoading));
  }, [isUserLoading, dispatch]);

  // リフレッシュトークンの定期更新
  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(async () => {
        try {
          const refreshTokenValue = localStorage.getItem('refresh_token');
          if (refreshTokenValue) {
            const result = await refreshToken({ refresh_token: refreshTokenValue }).unwrap();
            dispatch(loginSuccess({
              user: result.user,
              access_token: result.access_token,
              refresh_token: result.refresh_token
            }));
            if (import.meta.env.DEV) {
              console.log('トークンを更新しました');
            }
          }
        } catch (error) {
          console.error('トークンの更新に失敗しました:', error);
          handleLogout();
        }
      }, REFRESH_TOKEN_INTERVAL);

      setRefreshInterval(interval);
    }

    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isAuthenticated]);

  // トークンの有効期限チェック
  useEffect(() => {
    if (isAuthenticated) {
      const checkTokenExpiry = setInterval(() => {
        const tokenTimestamp = localStorage.getItem('token_timestamp');
        if (tokenTimestamp) {
          const expiryTime = parseInt(tokenTimestamp) + 7 * 24 * 60 * 60 * 1000; // 7日
          const currentTime = Date.now();
          if (currentTime > expiryTime) {
            handleLogout();
          }
        }
      }, TOKEN_EXPIRY_CHECK_INTERVAL);

      return () => clearInterval(checkTokenExpiry);
    }
  }, [isAuthenticated]);

  const handleLogin = async (email: string, password: string) => {
    try {
      dispatch(setLoading(true));
      const result = await login({ email, password }).unwrap();
      dispatch(loginSuccess({
        user: result.user,
        access_token: result.access_token,
        refresh_token: result.refresh_token
      }));

      // ログイン成功後のリダイレクト先を決定
      const from = location.state?.from || '/dashboard';
      navigate(from, { replace: true });
    } catch (error: any) {
      const errorMessage = error.data?.detail || 'ログインに失敗しました';
      dispatch(setError(errorMessage));
      toast.error(errorMessage);
    } finally {
      dispatch(setLoading(false));
    }
  };

  const handleRegister = async (username: string, email: string, password: string, confirmPassword: string) => {
    try {
      // APIからのレスポンスを取得
      const result = await register({ username, email, password, confirmPassword }).unwrap();
      console.log('アカウント登録成功:', {
        user: result.user.username,
        token: result.access_token ? '取得済み' : 'なし'
      });
      
      // loginSuccessアクションをディスパッチして状態を更新
      dispatch(loginSuccess({
        user: result.user,
        access_token: result.access_token,
        refresh_token: result.refresh_token
      }));
      
      // ユーザー情報を最新化するため、getCurrentUserクエリを実行
      // 少し遅延を入れて、トークンがstoreに保存された後に実行する
      setTimeout(() => {
        refetchUser();
      }, 500);
      
      navigate('/dashboard');
    } catch (err) {
      console.error('アカウント登録失敗:', err);
      const errorMessage = err instanceof Error ? err.message : 'アカウント登録に失敗しました';
      dispatch(setError(errorMessage));
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login', { 
      state: { 
        isIntentionalLogout: true,
        sessionExpired: true
      } 
    });
    toast.info('セッションが切れました。再度ログインしてください。');
  };

  return {
    user,
    isAuthenticated,
    loading,
    error,
    login: handleLogin,
    register: handleRegister,
    logout: handleLogout,
  };
}; 