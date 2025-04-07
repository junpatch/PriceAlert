import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@hooks/index';
import { useLoginMutation, useRegisterMutation, useGetCurrentUserQuery } from '@services/api';
import { loginSuccess, logout, setError, setLoading, setUser } from '../slices/authSlice';

export const useAuth = () => {
  const { user, token, isAuthenticated, loading, error } = useAppSelector(state => state.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const [login, { isLoading: isLoginLoading }] = useLoginMutation();
  const [register, { isLoading: isRegisterLoading }] = useRegisterMutation();
  
  const { data: currentUser, isLoading: isUserLoading } = useGetCurrentUserQuery(undefined, {
    skip: !token,
  });

  useEffect(() => {
    if (currentUser) {
      dispatch(setUser(currentUser));
    }
  }, [currentUser, dispatch]);

  useEffect(() => {
    dispatch(setLoading(isLoginLoading || isRegisterLoading || isUserLoading));
  }, [isLoginLoading, isRegisterLoading, isUserLoading, dispatch]);

  const handleLogin = async (email: string, password: string) => {
    try {
      const result = await login({ email, password }).unwrap();
      dispatch(loginSuccess(result));
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '認証に失敗しました';
      dispatch(setError(errorMessage));
    }
  };

  const handleRegister = async (username: string, email: string, password: string, confirmPassword: string) => {
    try {
      const result = await register({ username, email, password, confirmPassword }).unwrap();
      dispatch(loginSuccess(result));
      navigate('/dashboard');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'アカウント登録に失敗しました';
      dispatch(setError(errorMessage));
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
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