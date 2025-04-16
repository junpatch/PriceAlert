/**
 * エラーハンドリングユーティリティ
 * エラーの記録、無限ループ検出、エラー処理の一元管理などを担当
 */

import { Logger } from './logger';

export class ErrorHandler {
  private static errorCount: Record<string, number> = {};
  private static readonly MAX_ERROR_COUNT = 3;
  private static readonly logger = Logger.getLogger('ErrorHandler');
  
  /**
   * APIエラーを処理する関数
   * 同じエラータイプが短時間に連続発生すると無限ループと判断して処理を中断
   * 
   * @param errorType エラーの種類を識別する文字列
   * @param status HTTPステータスコード
   * @param error エラーオブジェクト
   * @param callback エラー処理のコールバック関数
   * @returns コールバックの実行結果、または無限ループ検出時はundefined
   */
  static handleApiError<T>(
    errorType: string, 
    status: number, 
    error: any, 
    callback: () => T
  ): T | undefined {
    // エラーカウンタの初期化
    if (!this.errorCount[errorType]) {
      this.errorCount[errorType] = 0;
    }
    
    // エラーカウントをインクリメント
    this.errorCount[errorType]++;
    
    this.logger.warn(
      `APIエラー検出 (${this.errorCount[errorType]}回目): タイプ=${errorType}, ステータス=${status}`,
      error
    );
    
    // 無限ループの可能性をチェック
    if (this.errorCount[errorType] > this.MAX_ERROR_COUNT) {
      this.logger.error(
        `エラー '${errorType}' が多すぎます (${this.errorCount[errorType]}回)。無限ループの可能性があるため、処理を中断します`
      );
      this.resetErrorCount(errorType);
      return undefined;
    }
    
    // エラー処理を実行
    return callback();
  }
  
  /**
   * 特定のエラータイプのカウンタをリセット
   */
  static resetErrorCount(errorType: string): void {
    this.errorCount[errorType] = 0;
  }
  
  /**
   * すべてのエラーカウンタをリセット
   */
  static resetAll(): void {
    this.errorCount = {};
    this.logger.debug('すべてのエラーカウンタをリセットしました');
  }
  
  /**
   * エラーメッセージを整形する関数
   * APIエラーやその他の例外から一貫したフォーマットのエラーメッセージを生成
   * 
   * @param error 生のエラーオブジェクト
   * @returns ユーザー向けのエラーメッセージ
   */
  static formatErrorMessage(error: any): string {
    if (!error) {
      return '不明なエラーが発生しました';
    }
    
    // RTK Queryのエラーオブジェクト
    if (error.data?.detail) {
      return error.data.detail;
    }
    
    // 一般的なエラーオブジェクト
    if (error.message) {
      return error.message;
    }
    
    // 文字列の場合
    if (typeof error === 'string') {
      return error;
    }
    
    // その他の場合
    return '予期せぬエラーが発生しました';
  }
} 