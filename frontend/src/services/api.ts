import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { RootState } from '@store/index';
import {
  User,
  Product,
  UserProduct,
  PriceHistory,
  Notification,
  UserSettings
} from '@types/index';

// API定義
export const api = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: `${import.meta.env.VITE_DJANGO_API_URL}/api/v1`,
    prepareHeaders: (headers, { getState }) => {
      const token = (getState() as RootState).auth.token;
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Products', 'Product', 'Notifications', 'Settings'],
  endpoints: (builder) => ({
    // 認証関連
    login: builder.mutation<{ token: string; user: User }, { email: string; password: string }>({
      query: (credentials) => ({
        url: 'auth/login/',
        method: 'POST',
        body: credentials,
      }),
    }),
    register: builder.mutation<{ token: string; user: User }, { email: string; password: string; username: string; confirmPassword: string }>({
      query: (userData) => ({
        url: 'auth/register/',
        method: 'POST',
        body: userData,
      }),
    }),
    getCurrentUser: builder.query<User, void>({
      query: () => 'auth/me/',
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
  useGetCurrentUserQuery,
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