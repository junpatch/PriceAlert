import { configureStore } from '@reduxjs/toolkit';
import { api } from '@services/api';
import authReducer from '@features/auth/slices/authSlice';
import productsReducer from '@features/products/slices/productsSlice';
import notificationsReducer from '@features/notifications/slices/notificationsSlice';
import uiReducer from './slices/uiSlice';
import settingsReducer from './slices/settingsSlice';

export const store = configureStore({
  reducer: {
    [api.reducerPath]: api.reducer,
    auth: authReducer,
    products: productsReducer,
    notifications: notificationsReducer,
    ui: uiReducer,
    settings: settingsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(api.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 