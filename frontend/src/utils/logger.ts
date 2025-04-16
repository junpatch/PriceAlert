/**
 * ログ出力ユーティリティ
 * 環境に応じたログ出力の制御、フォーマット統一などを担当
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export class Logger {
  // 開発環境では詳細ログを表示、本番環境では必要最低限
  private static readonly PROD_LEVEL: LogLevel = 'warn';

  /**
   * コンテキスト付きのロガーを作成
   * @param context ログのコンテキスト名（コンポーネント名など）
   */
  static getLogger(context: string) {
    return {
      /**
       * デバッグログ - 開発環境のみ表示
       */
      debug: (message: string, ...data: any[]): void => {
        if (import.meta.env.DEV) {
          console.log(`[${context}] 🔍 ${message}`, ...data);
        }
      },
      
      /**
       * 情報ログ - 開発環境では常に表示、本番環境では制御
       */
      info: (message: string, ...data: any[]): void => {
        if (import.meta.env.DEV || this.PROD_LEVEL === 'info') {
          console.log(`[${context}] ℹ️ ${message}`, ...data);
        }
      },
      
      /**
       * 警告ログ - 常に表示
       */
      warn: (message: string, ...data: any[]): void => {
        console.warn(`[${context}] ⚠️ ${message}`, ...data);
      },
      
      /**
       * エラーログ - 常に表示
       */
      error: (message: string, ...data: any[]): void => {
        console.error(`[${context}] ❌ ${message}`, ...data);
      }
    };
  }
  
  /**
   * コンテキストなしの汎用ロガー
   */
  static debug(message: string, ...data: any[]): void {
    if (import.meta.env.DEV) {
      console.log(`🔍 ${message}`, ...data);
    }
  }
  
  static info(message: string, ...data: any[]): void {
    if (import.meta.env.DEV || this.PROD_LEVEL === 'info') {
      console.log(`ℹ️ ${message}`, ...data);
    }
  }
  
  static warn(message: string, ...data: any[]): void {
    console.warn(`⚠️ ${message}`, ...data);
  }
  
  static error(message: string, ...data: any[]): void {
    console.error(`❌ ${message}`, ...data);
  }
} 