/**
 * 通知関連の型定義
 */

export interface Notification {
  id: number;
  user_id: number;
  product_id: number;
  product_on_ec_site_id: number;
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