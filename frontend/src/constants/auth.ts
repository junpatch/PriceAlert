/**
 * 認証関連の定数
 */

export const AUTH_CONSTANTS = {
  // トークン関連
  TOKEN_STORAGE_KEY: 'token',
  REFRESH_TOKEN_STORAGE_KEY: 'refresh_token',
  TOKEN_TIMESTAMP_KEY: 'token_timestamp',
  
  // トークンの有効期限（ミリ秒）
  TOKEN_EXPIRY_DAYS: 7,
  TOKEN_EXPIRY_MS: 7 * 24 * 60 * 60 * 1000,  // 7日間
  
  // リフレッシュインターバル（ミリ秒）
  REFRESH_INTERVAL: 15 * 60 * 1000,  // 15分間隔（本番環境用）
  REFRESH_INTERVAL_DEV: 15 * 60 * 1000,  // 15分間隔（開発環境用）
  
  // トークン有効期限チェックインターバル（ミリ秒）
  TOKEN_CHECK_INTERVAL: 30 * 60 * 1000,  // 30分間隔
  
  // リフレッシュ関連インターバル識別子
  REFRESH_INTERVAL_KEY: 'auth_refresh_token',
  TOKEN_CHECK_INTERVAL_KEY: 'auth_token_expiry_check',
  
  // APIエラーイベント
  API_ERROR_EVENT: 'api-auth-error',
  
  // ルーティング
  LOGIN_ROUTE: '/login',
  REGISTER_ROUTE: '/register',
  DASHBOARD_ROUTE: '/dashboard',
}; 