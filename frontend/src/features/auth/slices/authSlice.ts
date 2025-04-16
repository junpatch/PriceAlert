import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AuthState, User } from '@/types';
import { TokenManager } from '@/utils/tokenManager';
import { Logger } from '@/utils/logger';
import { AUTH_CONSTANTS } from '@/constants/auth';

// Logger初期化
const logger = Logger.getLogger('AuthSlice');

const initialState: AuthState = {
  user: null,
  token: TokenManager.isTokenValid() ? TokenManager.getToken() : null,
  isAuthenticated: TokenManager.isTokenValid(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess: (state, action: PayloadAction<{ user: User; access_token: string; refresh_token?: string }>) => {
      const token = action.payload.access_token;
      
      // ユーザー情報をチェック
      if (!action.payload.user || Object.keys(action.payload.user).length === 0) {
        logger.warn('loginSuccessに空のユーザー情報が渡されました。既存のユーザー情報を維持します。');
        // 空オブジェクトの場合は既存のユーザー情報を維持
        // state.userはそのまま
      } else {
        // 有効なユーザー情報があれば更新
        logger.debug('loginSuccessで新しいユーザー情報を設定:', action.payload.user);
        state.user = action.payload.user;
      }
      
      state.token = token;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;
      
      // トークンをTokenManagerを使って保存
      if (action.payload.refresh_token && action.payload.refresh_token.trim() !== '') {
        TokenManager.saveTokens(token, action.payload.refresh_token);
        logger.debug('新しいリフレッシュトークンを保存しました');
      } else {
        // リフレッシュトークンがない場合は警告
        logger.warn('リフレッシュトークンがレスポンスに含まれていないか空です');
        // アクセストークンだけを保存
        localStorage.setItem(AUTH_CONSTANTS.TOKEN_STORAGE_KEY, token);
        localStorage.setItem(AUTH_CONSTANTS.TOKEN_TIMESTAMP_KEY, Date.now().toString());
      }
    },
    setUser: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
      state.isAuthenticated = true;
      state.loading = false;
      logger.debug('ユーザー情報を更新しました', { userId: action.payload.id });
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.loading = false;
      if (action.payload) {
        logger.error('認証エラー:', action.payload);
      }
    },
    syncTokenFromStorage: (state) => {
      if (TokenManager.isTokenValid()) {
        const token = TokenManager.getToken();
        if (token && (!state.token || state.token !== token)) {
          state.token = token;
          state.isAuthenticated = true;
          logger.debug('トークンをlocalStorageから同期しました');
        }
      } else {
        // トークンが無効な場合はクリア
        logger.warn('保存されたトークンの有効期限切れ、クリアします');
        state.token = null;
        state.isAuthenticated = false;
        TokenManager.clearTokens();
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
      
      // すべてのトークン関連データを削除
      TokenManager.clearTokens();
      logger.debug('ログアウト処理が完了しました');
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