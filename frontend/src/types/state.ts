/**
 * Redux状態管理関連の型定義
 */
import { Notification } from './notification';
import { Product, UserProduct } from './product';
import { PriceHistory } from './ecSite';

export interface ProductsState {
  productList: UserProduct[];
  selectedProduct: Product | null;
  priceHistory: PriceHistory[];
  loading: boolean;
  error: string | null;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

export interface UIState {
  isLoading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
} 