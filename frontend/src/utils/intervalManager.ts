/**
 * インターバル管理ユーティリティ
 * 名前付きインターバルの管理、一括クリアなどの機能を提供
 */

import { Logger } from "@/utils/logger";
// Logger初期化
const logger = Logger.getLogger("IntervalManager");

export class IntervalManager {
  /** 
   * インターバルIDを管理するオブジェクト 
   * キー: インターバルの名前、値: インターバルID
   */
  private static intervals: Record<string, number> = {};
  
  /**
   * インターバルIDを直接追加
   * 古い方式との互換性のため
   * 
   * @param id インターバルID
   */
  static add(id: number): void {
    const key = `auto_${id}`;
    this.intervals[key] = id;
    
    if (import.meta.env.DEV) {
      logger.debug(`インターバル追加: 自動割り当てキー ${key}, ID: ${id}`);
    }
  }
  
  /**
   * 名前付きインターバルを設定
   * 既存の同名インターバルがある場合は先にクリア
   * 
   * @param key インターバルの識別子
   * @param callback 実行する関数
   * @param delay 実行間隔（ミリ秒）
   */
  static setInterval(key: string, callback: () => void, delay: number): void {
    // 既存の同名インターバルがあればクリア
    this.clearInterval(key);
    
    // 新しいインターバルを設定
    const id = window.setInterval(callback, delay);
    this.intervals[key] = id;
    
    if (import.meta.env.DEV) {
      logger.debug(`インターバル設定: ${key}, ID: ${id}, 間隔: ${delay}ms`);
    }
  }
  
  /**
   * 名前付きインターバルをクリア
   * 
   * @param key インターバルの識別子
   */
  static clearInterval(key: string): void {
    if (this.intervals[key]) {
      if (import.meta.env.DEV) {
        logger.debug(`インターバルクリア: ${key}, ID: ${this.intervals[key]}`);
      }
      
      window.clearInterval(this.intervals[key]);
      delete this.intervals[key];
    }
  }
  
  /**
   * すべてのインターバルをクリア
   */
  static clearAll(): void {
    const intervalCount = Object.keys(this.intervals).length;
    
    if (intervalCount > 0) {
      logger.debug(`登録された ${intervalCount} 個のインターバルをクリア`);
      
      Object.entries(this.intervals).forEach(([key, id]) => {
        if (import.meta.env.DEV) {
          logger.debug(`インターバルクリア: ${key}, ID: ${id}`);
        }
        window.clearInterval(id);
      });
      
      this.intervals = {};
    }
  }
  
  /**
   * 登録されているインターバルの一覧を取得
   * デバッグ用
   */
  static getAll(): Record<string, number> {
    return { ...this.intervals };
  }
  
  /**
   * 登録されているインターバルの数を取得
   */
  static getCount(): number {
    return Object.keys(this.intervals).length;
  }
} 