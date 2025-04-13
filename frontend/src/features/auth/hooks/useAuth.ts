import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@hooks/index';
import { useLoginMutation, useRegisterMutation, useLogoutMutation, useGetCurrentUserQuery } from '@services/api';
import { loginSuccess, logout, setError, setLoading, setUser, syncTokenFromStorage } from '../slices/authSlice';

export const useAuth = () => {
  const { user, token, isAuthenticated, loading, error } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();
  const [logoutApi, { isLoading: isLogoutLoading }] = useLogoutMutation();
  
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
    dispatch(setLoading(isLoginLoading || isRegisterLoading || isLogoutLoading || isUserLoading));
  }, [isLoginLoading, isRegisterLoading, isLogoutLoading, isUserLoading, dispatch]);

  const handleLogin = async (email: string, password: string) => {
    try {
      // APIからのレスポンスを取得
      const result = await login({ email, password }).unwrap();
      console.log('ログイン成功:', {
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
    } catch (err: any) {
      console.error('ログイン失敗:', err);
      
      // より詳細なエラー情報を表示
      let errorMessage = 'ログインに失敗しました';
      
      // FetchErrorなど具体的なエラー情報がある場合
      if (err.status === 'FETCH_ERROR') {
        errorMessage = 'サーバーに接続できませんでした。ネットワーク接続を確認してください。';
      } else if (err.status === 401) {
        errorMessage = 'メールアドレスまたはパスワードが正しくありません。';
      } else if (err.data && err.data.detail) {
        errorMessage = err.data.detail;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      dispatch(setError(errorMessage));
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

  const handleLogout = async () => {
    const storedToken = localStorage.getItem('token');
    
    // トークンが存在しない場合は、APIリクエストをスキップ
    if (!token && !storedToken) {
      console.warn('トークンが見つからないため、クライアント側のみでログアウトします');
      dispatch(logout());
      navigate('/login', { state: { isIntentionalLogout: true } });
      return;
    }
    
    try {
      // APIを呼び出してサーバー側でログアウト処理を行う
      await logoutApi().unwrap();
      console.log('ログアウト成功');
    } catch (err) {
      console.error('ログアウト処理中にエラーが発生しましたが、クライアント側でログアウトを続行します');
    } finally {
      // Reduxストアとローカルストレージからトークンをクリア
      dispatch(logout());
      navigate('/login', { state: { isIntentionalLogout: true } });
    }
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