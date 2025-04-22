import { createApi, fetchBaseQuery, BaseQueryFn, FetchArgs, FetchBaseQueryError } from '@reduxjs/toolkit/query/react';
import { RootState } from '@store/index';
import { getCache, setCacheData } from '@/utils/cache';
import {
  User,
  Product,
  UserProduct,
  PriceHistory,
  Notification,
  UserSettings,
  Alert,
  ECSite,
} from '@/types';

// APIエラー監視のためのカスタムイベント名
const API_ERROR_EVENT = 'api-auth-error';

// 認証エラーをインターセプトするベースクエリ関数
const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  // 基本のfetchBaseQueryを設定
  const baseQuery = fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_DJANGO_API_URL}/api/v1`,
    // クレデンシャル（Cookie）を含める設定を追加
    credentials: 'include',
    prepareHeaders: (headers, { getState }) => {
      // CSRFトークンを取得
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('csrftoken='))
        ?.split('=')[1];

      if (csrfToken) {
        headers.set('X-CSRFToken', csrfToken);
      }

      // まずReduxストアからトークンを取得
      const token = (getState() as RootState).auth.token;
      
      // Reduxストアにトークンがなければ、localStorageから直接取得を試みる
      const finalToken = token || localStorage.getItem('token');
      
      if (finalToken) {
        // 認証ヘッダーを設定（Django REST framework用の形式）
        headers.set('Authorization', `Bearer ${finalToken}`);
        
        // 開発環境でのみログを出力
        if (import.meta.env.DEV) {
          console.debug('認証ヘッダーを設定しました');
        }
      } else {
        if (import.meta.env.DEV) {
          console.warn('認証トークンが見つかりません');
        }
      }
      
      // 基本的なヘッダー設定
      headers.set('Content-Type', 'application/json');
      headers.set('Accept', 'application/json');
      headers.set('X-Requested-With', 'XMLHttpRequest');
      
      return headers;
    },
  });

  // キャッシュの処理
  if (typeof args === 'object' && 'url' in args) {
    const { url, method, params } = args;
    const cacheKey = `${method}:${url}${params ? `:${JSON.stringify(params)}` : ''}`;
    
    // GETリクエストの場合のみキャッシュをチェック
    if (method === 'GET') {
      const cache = getCache(api.getState() as RootState, cacheKey);
      if (cache) {
        return { data: cache.data };
      }
    }
  }

  // 通常のリクエストを実行
  const result = await baseQuery(args, api, extraOptions);

  // 401 Unauthorized エラーをチェック
  if (result.error && result.error.status === 401) {
    if (import.meta.env.DEV) {
      console.warn('認証エラー（401）が発生しました。セッションが切れている可能性があります。');
    }

    // ログアウトエンドポイントや特定のエンドポイントでの401エラーは無視する
    const ignoreEndpoints = ['/auth/logout/', '/auth/refresh/'];
    let shouldIgnore = false;
    let url = 'unknown';

    // argsの構造をより詳細にログ出力（デバッグ用）
    if (import.meta.env.DEV) {
      console.debug('401エラー発生時のargs:', JSON.stringify(args));
    }

    // 異なるargsの形式に対応
    if (typeof args === 'object') {
      if ('url' in args) {
        url = args.url;
      } else if (typeof args.endpoint === 'string') {
        url = args.endpoint;
      }
      
      shouldIgnore = ignoreEndpoints.some(endpoint => url.includes(endpoint));
    }
    
    if (shouldIgnore) {
      console.log(`401エラーですが、無視するエンドポイント(${url})のため、イベントをディスパッチしません。`);
    } else {
      // 401エラーのイベントをディスパッチ
      const authErrorEvent = new CustomEvent(API_ERROR_EVENT, {
        detail: {
          status: 401,
          error: result.error,
          url: url
        }
      });
      window.dispatchEvent(authErrorEvent);
      console.log('401エラーを検出し、イベントをディスパッチしました。');
    }
  }

  // 成功したGETリクエストの結果をキャッシュ
  if (result.data && typeof args === 'object' && 'url' in args && args.method === 'GET') {
    const { url, method, params } = args;
    const cacheKey = `${method}:${url}${params ? `:${JSON.stringify(params)}` : ''}`;
    setCacheData(api.dispatch, cacheKey, result.data);
  }

  return result;
};

// API定義
export const api = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: ['Products', 'Product', 'Notifications', 'Settings', 'Cache'],
  endpoints: (builder) => ({
    // 認証関連
    login: builder.mutation<{ access_token: string; refresh_token: string; user: User }, { email: string; password: string }>({
      query: (credentials) => ({
        url: 'auth/login/',
        method: 'POST',
        body: credentials,
      }),
      invalidatesTags: ['Cache'],
    }),
    register: builder.mutation<{ access_token: string; refresh_token: string; user: User }, { email: string; password: string; username: string; confirmPassword: string }>({
      query: (userData) => ({
        url: 'auth/register/',
        method: 'POST',
        body: userData,
      }),
      invalidatesTags: ['Cache'],
    }),
    logout: builder.mutation<void, void>({
      query: () => {
        const token = localStorage.getItem('token');
        return {
          url: 'auth/logout/',
          method: 'POST',
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : undefined
        };
      },
      invalidatesTags: ['Products', 'Notifications', 'Settings', 'Cache'],
    }),
    refreshToken: builder.mutation<{ access_token: string; refresh_token: string }, { refresh: string }>({
      query: (data) => ({
        url: 'auth/refresh/',
        method: 'POST',
        body: data,
      }),
      transformResponse: (response: any) => {
        // バックエンドのレスポンス形式を変換
        // {access, refresh} → {access_token, refresh_token}
        const transformedResponse = {
          access_token: response.access,
          refresh_token: response.refresh
        };
        return transformedResponse;
      },
      invalidatesTags: ['Cache'],
    }),
    getCurrentUser: builder.query<User, void>({
      query: () => 'users/me/',
      providesTags: ['Cache'],
    }),
    
    // パスワードリセット関連
    requestPasswordReset: builder.mutation<{ detail: string }, { email: string }>({
      query: (data) => ({
        url: 'auth/password-reset/request/',
        method: 'POST',
        body: data,
      }),
    }),
    resetPassword: builder.mutation<{ detail: string }, { token: string; password: string; confirmPassword: string }>({
      query: (data) => {
        const { token, ...passwordData } = data;
        return {
          url: `auth/password-reset/confirm/${token}/`,
          method: 'POST',
          body: passwordData,
        };
      },
    }),
    
    // ユーザープロフィール関連
    updateUserProfile: builder.mutation<User, Partial<User>>({
      query: (userData) => ({
        url: 'users/me/',
        method: 'PATCH',
        body: userData,
      }),
    }),
    
    // 商品関連
    getUserProducts: builder.query<UserProduct[], void>({
      query: () => 'user-products/',
      providesTags: ['Products'],
    }),
    getProductById: builder.query<UserProduct, number>({
      query: (id) => `user-products/${id}/`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    getPriceHistory: builder.query<PriceHistory[], { productId: number; ecSiteId?: number; period?: string; }>({
      query: ({ productId, ecSiteId, period }) => ({
        url: `products/${productId}/price-history/`,
        params: { 
          ec_site_id: ecSiteId, 
          period 
        },
      }),
    }),
    registerProduct: builder.mutation<UserProduct, { url?: string; jan_code?: string; price_threshold?: number; }>({
      query: (productData) => ({
        url: 'user-products/',
        method: 'POST',
        body: productData,
      }),
      invalidatesTags: ['Products', 'Cache'],
    }),
    updateUserProduct: builder.mutation<UserProduct, { id: number; price_threshold?: number; notification_enabled?: boolean; memo?: string; }>({
      query: ({ id, ...data }) => ({
        url: `user-products/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Products', 'Cache'],
    }),
    deleteUserProduct: builder.mutation<void, number>({
      query: (id) => ({
        url: `user-products/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products', 'Cache'],
    }),
    
    // アラート関連
    getProductAlerts: builder.query<Alert[], number>({
      query: (productId) => `products/${productId}/alerts/`,
      providesTags: (_result, _error, id) => [{ type: 'Product', id }],
    }),
    addProductAlert: builder.mutation<Alert, { productId: number, alertData: Partial<Alert> }>({
      query: ({ productId, alertData }) => ({
        url: `products/${productId}/alerts/`,
        method: 'POST',
        body: alertData,
      }),
      invalidatesTags: (_result, _error, { productId }) => [{ type: 'Product', id: productId }],
    }),
    getAlertById: builder.query<Alert, number>({
      query: (alertId) => `alerts/${alertId}/`,
      providesTags: (_result, _error, _) => [{ type: 'Product' }],
    }),
    updateAlert: builder.mutation<Alert, { alertId: number, alertData: Partial<Alert> }>({
      query: ({ alertId, alertData }) => ({
        url: `alerts/${alertId}/`,
        method: 'PUT',
        body: alertData,
      }),
      invalidatesTags: ['Products'],
    }),
    deleteAlert: builder.mutation<void, number>({
      query: (alertId) => ({
        url: `alerts/${alertId}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products'],
    }),
    
    // 通知関連
    getNotifications: builder.query<{ count: number; next: string | null; previous: string | null; results: Notification[] }, { page?: number; is_read?: boolean }>({
      query: (params) => {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.is_read !== undefined) queryParams.append('is_read', params.is_read.toString());
        return `notifications/?${queryParams.toString()}`;
      },
      providesTags: ['Notifications'],
    }),
    markNotificationAsRead: builder.mutation<void, number>({
      query: (notification_ids) => ({
        url: `notifications/mark-read/`,
        method: 'POST',
        body: { notification_ids },
      }),
      invalidatesTags: ['Notifications', 'Cache'],
    }),
    markAllNotificationsAsRead: builder.mutation<void, void>({
      query: () => ({
        url: 'notifications/mark-read/',
        method: 'POST',
        body: { all: true }
      }),
      invalidatesTags: ['Notifications'],
    }),
    
    // ECサイト関連
    getECSites: builder.query<ECSite[], void>({
      query: () => 'ec-sites/',
    }),
    
    // 商品検索関連
    searchProducts: builder.query<Product[], string>({
      query: (query) => ({
        url: 'product-search/',
        params: { query },
      }),
    }),
    
    // 設定関連
    getUserSettings: builder.query<UserSettings, void>({
      query: () => 'users/settings/me/',
      providesTags: ['Settings'],
    }),
    updateUserSettings: builder.mutation<UserSettings, Partial<UserSettings>>({
      query: (settings) => ({
        url: 'users/settings/me/',
        method: 'PATCH',
        body: settings,
      }),
      invalidatesTags: ['Settings', 'Cache'],
    }),
  }),
});

// エクスポートするフック
export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useRefreshTokenMutation,
  useGetCurrentUserQuery,
  useRequestPasswordResetMutation,
  useResetPasswordMutation,
  useGetUserProductsQuery,
  useGetProductByIdQuery,
  useGetPriceHistoryQuery,
  useRegisterProductMutation,
  useUpdateUserProductMutation,
  useDeleteUserProductMutation,
  useGetNotificationsQuery,
  useMarkNotificationAsReadMutation,
  useMarkAllNotificationsAsReadMutation,
  useGetUserSettingsQuery,
  useUpdateUserSettingsMutation,
  useUpdateUserProfileMutation,
  useGetProductAlertsQuery,
  useAddProductAlertMutation,
  useGetAlertByIdQuery,
  useUpdateAlertMutation,
  useDeleteAlertMutation,
  useGetECSitesQuery,
  useSearchProductsQuery,
} = api; 