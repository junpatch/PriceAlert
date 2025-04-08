import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@store/index';
import {
  User,
  Product,
  UserProduct,
  PriceHistory,
  Notification,
  UserSettings
} from '../types';

// API定義
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_DJANGO_API_URL}/api/v1`,
    prepareHeaders: (headers, { getState }) => {
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
      
      return headers;
    },
  }),
  tagTypes: ['Products', 'Product', 'Notifications', 'Settings'],
  endpoints: (builder) => ({
    // 認証関連
    login: builder.mutation<{ access_token: string; refresh_token: string; user: User }, { email: string; password: string }>({
      query: (credentials) => ({
        url: 'auth/login/',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<{ access_token: string; refresh_token: string; user: User }, { email: string; password: string; username: string; confirmPassword: string }>({
      query: (userData) => ({
        url: 'auth/register/',
        method: 'POST',
        body: userData,
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => {
        // 明示的に認証ヘッダーを追加（トレース用）
        const token = localStorage.getItem('token');
        
        return {
          url: 'auth/logout/',
          method: 'POST',
          // 明示的にヘッダーを設定
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : undefined
        };
      },
      invalidatesTags: ['Products', 'Notifications', 'Settings'],
    }),
    getCurrentUser: builder.query<User, void>({
      query: () => 'auth/me/',
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
    
    // 商品関連
    getUserProducts: builder.query<UserProduct[], void>({
      query: () => 'user-products/',
      providesTags: ['Products'],
    }),
    getProductById: builder.query<Product, number>({
      query: (id) => `products/${id}/`,
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
    registerProduct: builder.mutation<UserProduct, { url: string; price_threshold?: number; }>({
      query: (productData) => ({
        url: 'user-products/',
        method: 'POST',
        body: productData,
      }),
      invalidatesTags: ['Products'],
    }),
    updateUserProduct: builder.mutation<UserProduct, { id: number; price_threshold?: number; notification_enabled?: boolean; memo?: string; }>({
      query: ({ id, ...data }) => ({
        url: `user-products/${id}/`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['Products'],
    }),
    deleteUserProduct: builder.mutation<void, number>({
      query: (id) => ({
        url: `user-products/${id}/`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Products'],
    }),
    
    // 通知関連
    getNotifications: builder.query<Notification[], void>({
      query: () => 'notifications/',
      providesTags: ['Notifications'],
    }),
    markNotificationAsRead: builder.mutation<void, number>({
      query: (id) => ({
        url: `notifications/${id}/read/`,
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
    markAllNotificationsAsRead: builder.mutation<void, void>({
      query: () => ({
        url: 'notifications/read-all/',
        method: 'POST',
      }),
      invalidatesTags: ['Notifications'],
    }),
    
    // 設定関連
    getUserSettings: builder.query<UserSettings, void>({
      query: () => 'user-settings/',
      providesTags: ['Settings'],
    }),
    updateUserSettings: builder.mutation<UserSettings, Partial<UserSettings>>({
      query: (settings) => ({
        url: 'user-settings/',
        method: 'PATCH',
        body: settings,
      }),
      invalidatesTags: ['Settings'],
    }),
  }),
});

// エクスポートするフック
export const {
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
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
} = api; 