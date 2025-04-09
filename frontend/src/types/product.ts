/**
 * 商品関連の型定義
 */
import { ProductOnECSite } from './ecSite';

/**
 * 商品の基本情報
 */
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
//   product_on_ec_sites?: ProductOnECSite[]; // バックエンド互換性のための代替フィールド
}

/**
 * ユーザーと紐づいた商品情報
 */
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