/**
 * トークン管理ユーティリティ
 * アクセストークン、リフレッシュトークン、タイムスタンプの管理を担当
 */

import { AUTH_CONSTANTS } from '@/constants/auth';
import { Logger } from './logger';

export interface TokenData {
  token: string;
  refreshToken: string;
  timestamp: number;
}

const logger = Logger.getLogger('TokenManager');

export const TokenManager = {
  /**
   * トークンをlocalStorageに保存
   */
  saveTokens(access: string, refresh: string): void {
    localStorage.setItem(AUTH_CONSTANTS.TOKEN_STORAGE_KEY, access);
    localStorage.setItem(AUTH_CONSTANTS.REFRESH_TOKEN_STORAGE_KEY, refresh);
    localStorage.setItem(AUTH_CONSTANTS.TOKEN_TIMESTAMP_KEY, Date.now().toString());
    logger.debug('トークンを保存しました');
  },
  
  /**
   * localStorageからトークン情報を取得
   */
  getTokens(): TokenData | null {
    try {
      const token = localStorage.getItem(AUTH_CONSTANTS.TOKEN_STORAGE_KEY);
      const refreshToken = localStorage.getItem(AUTH_CONSTANTS.REFRESH_TOKEN_STORAGE_KEY);
      const timestamp = localStorage.getItem(AUTH_CONSTANTS.TOKEN_TIMESTAMP_KEY);
      
      if (!token || !refreshToken || !timestamp) return null;
      
      return {
        token,
        refreshToken,
        timestamp: parseInt(timestamp, 10)
      };
    } catch (error) {
      logger.error('localStorageの読み取りに失敗:', error);
      return null;
    }
  },
  
  /**
   * アクセストークンのみを取得
   */
  getToken(): string | null {
    try {
      return localStorage.getItem(AUTH_CONSTANTS.TOKEN_STORAGE_KEY);
    } catch (error) {
      logger.error('localStorageからトークンの読み取りに失敗:', error);
      return null;
    }
  },
  
  /**
   * リフレッシュトークンのみを取得
   */
  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(AUTH_CONSTANTS.REFRESH_TOKEN_STORAGE_KEY);
    } catch (error) {
      logger.error('localStorageからリフレッシュトークンの読み取りに失敗:', error);
      return null;
    }
  },
  
  /**
   * トークンのタイムスタンプを取得
   */
  getTokenTimestamp(): number | null {
    try {
      const timestamp = localStorage.getItem(AUTH_CONSTANTS.TOKEN_TIMESTAMP_KEY);
      return timestamp ? parseInt(timestamp, 10) : null;
    } catch (error) {
      logger.error('localStorageからタイムスタンプの読み取りに失敗:', error);
      return null;
    }
  },
  
  /**
   * すべてのトークン関連データを削除
   */
  clearTokens(): void {
    localStorage.removeItem(AUTH_CONSTANTS.TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_CONSTANTS.REFRESH_TOKEN_STORAGE_KEY);
    localStorage.removeItem(AUTH_CONSTANTS.TOKEN_TIMESTAMP_KEY);
    logger.debug('すべてのトークンをクリアしました');
  },
  
  /**
   * トークンの有効期限をチェック
   */
  isTokenValid(): boolean {
    const timestamp = this.getTokenTimestamp();
    if (!timestamp) return false;
    
    // トークンのタイムスタンプが指定期間内かどうかをチェック
    const now = Date.now();
    const isValid = now - timestamp < AUTH_CONSTANTS.TOKEN_EXPIRY_MS;
    return isValid;
  }
}; 