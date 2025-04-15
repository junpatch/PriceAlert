/**
 * ECサイト関連の型定義
 */

/**
 * ECサイト自体の情報
 */
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

/**
 * 特定の商品がECサイトで販売されている情報
 */
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

/**
 * 価格履歴の情報
 */
export interface PriceHistory {
  id: number;
  product_on_ec_site: ProductOnECSite;
  price: number;
  points: number;
  effective_price: number;
  captured_at: string;
  created_at: string;
} 