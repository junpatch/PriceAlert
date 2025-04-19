/**
 * 型定義をまとめてエクスポートするインデックスファイル
 */

// 認証関連
export interface User {
  id: number;
  username: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  last_login?: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

// ECサイト関連
export interface ECSite {
  id: number;
  name: string;
  code?: string;
  api_base_url?: string;
  affiliate_format?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductOnECSite {
  id: number;
  ec_site: ECSite;
  ec_site_id: number;
  product_id: number;
  ec_product_id: string;
  seller_name?: string;
  product_url: string;
  affiliate_url?: string;
  current_price: number | null;
  current_points: number | null;
  shipping_fee: number | null;
  effective_price: number | null;
  condition?: string;
  last_updated: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: number;
  product_on_ec_site: ProductOnECSite;
  price: number;
  points: number;
  effective_price: number;
  captured_at: string;
  created_at: string;
}

// 商品関連
export interface Product {
  id: number;
  name: string;
  description?: string;
  image_url?: string;
  manufacturer?: string;
  model_number?: string;
  jan_code?: string;
  created_at: string;
  updated_at: string;
  ec_sites: ProductOnECSite[];
}

export interface UserProduct {
  id: number;
  user_id: number;
  product_id: number;
  product?: Product;
  price_threshold?: number;
  threshold_type: 'list_price' | 'effective_price';
  threshold_percentage?: number;
  notification_enabled: boolean;
  display_order: number;
  memo?: string;
  created_at: string;
  updated_at: string;
}

// 通知関連
export interface Notification {
  id: number;
  user: User;
  product: Product;
  product_on_ec_site: ProductOnECSite;
  type: string;
  message: string;
  old_price?: number;
  new_price?: number;
  is_read: boolean;
  sent_at: string;
  created_at: string;
}

export interface Alert {
  id: number;
  product_id: number;
  alert_type: 'price_drop' | 'price_increase' | 'availability';
  threshold_value?: number;
  threshold_percentage?: number;
  threshold_type: 'list_price' | 'effective_price';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// 状態管理関連
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
  totalCount: number;
  loading: boolean;
  error: string | null;
}

export interface UIState {
  isLoading: boolean;
  error: string | null;
  theme: 'light' | 'dark';
}

// 設定関連
export interface UserSettings {
  notification_frequency: 'immediately' | 'daily' | 'weekly';
  email_notifications: boolean;
}

export interface SettingsState {
  userSettings: UserSettings | null;
  loading: boolean;
  error: string | null;
}

// キャッシュ関連
export interface CacheConfig {
  key: string;
  ttl: number; // 有効期限（ミリ秒）
  data: any;
  timestamp: number;
}

export interface CacheState {
  [key: string]: CacheConfig;
}

export interface CacheOptions {
  ttl?: number;
  forceRefresh?: boolean;
}
