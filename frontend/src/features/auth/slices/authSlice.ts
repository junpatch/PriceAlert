import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '../../../types';

// localStorageからトークンを取得
const getTokenFromStorage = (): string | null => {
  try {
    return localStorage.getItem('token');
  } catch (error) {
    console.error('localStorage is not available:', error);
    return null;
  }
};

// localStorageに最後に保存されたトークンの時刻を取得
const getTokenTimestamp = (): number | null => {
  try {
    const timestamp = localStorage.getItem('token_timestamp');
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch (error) {
    console.error('localStorage is not available:', error);
    return null;
  }
};

// トークンの有効期限をチェック
const isTokenValid = (): boolean => {
  const timestamp = getTokenTimestamp();
  if (!timestamp) return false;
  
  // トークンのタイムスタンプが7日以内かどうかをチェック
  const now = Date.now();
  const isValid = now - timestamp < 7 * 24 * 60 * 60 * 1000; // 7日間
  return isValid;
};

const initialState: AuthState = {
  user: null,
  token: isTokenValid() ? getTokenFromStorage() : null,
  isAuthenticated: isTokenValid() && !!getTokenFromStorage(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ user: User; access_token: string; refresh_token?: string }>) => {
      const token = action.payload.access_token;
      
      state.user = action.payload.user;
      state.token = token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      
      // トークンとタイムスタンプを保存
      localStorage.setItem('token', token);
      localStorage.setItem('token_timestamp', Date.now().toString());
      
      // リフレッシュトークンが存在する場合は保存
      if (action.payload.refresh_token) {
        localStorage.setItem('refresh_token', action.payload.refresh_token);
      }
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
    },
    syncTokenFromStorage: (state) => {
      if (isTokenValid()) {
        const token = getTokenFromStorage();
        if (token && (!state.token || state.token !== token)) {
          state.token = token;
          state.isAuthenticated = true;
          console.log('トークンをlocalStorageから同期しました');
        }
      } else {
        // トークンが無効な場合はクリア
        console.log('保存されたトークンの有効期限切れ、クリアします');
        state.token = null;
        state.isAuthenticated = false;
        localStorage.removeItem('token');
        localStorage.removeItem('token_timestamp');
        localStorage.removeItem('refresh_token');
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      
      // すべてのトークン関連データを削除
      localStorage.removeItem('token');
      localStorage.removeItem('token_timestamp');
      localStorage.removeItem('refresh_token');
    },
  },
});

export const {
  loginSuccess,
  setUser,
  setLoading,
  setError,
  syncTokenFromStorage,
  logout,
} = authSlice.actions;

export default authSlice.reducer; 