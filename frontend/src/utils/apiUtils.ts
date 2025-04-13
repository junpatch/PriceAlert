/**
 * API関連のユーティリティ関数
 */
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';
import { SerializedError } from '@reduxjs/toolkit';
import { logout } from '@features/auth/slices/authSlice';
import { store } from '@store/index';

/**
 * APIエラーの種類を判別する
 */
export const isFetchBaseQueryError = (
  error: unknown
): error is FetchBaseQueryError => {
  return typeof error === 'object' && error != null && 'status' in error;
};

export const isErrorWithMessage = (
  error: unknown
): error is { message: string } => {
  return (
    typeof error === 'object' &&
    error != null &&
    'message' in error &&
    typeof (error as any).message === 'string'
  );
};

/**
 * エラーメッセージを抽出する
 */
export const getErrorMessage = (error: FetchBaseQueryError | SerializedError | undefined): string => {
  if (!error) return '不明なエラーが発生しました。';

  // FetchBaseQueryErrorの場合
  if (isFetchBaseQueryError(error)) {
    // サーバーからのエラーメッセージがある場合
    const errorData = error.data as any;
    if (errorData?.detail) {
      return errorData.detail;
    }
    if (errorData?.message) {
      return errorData.message;
    }
    
    // ステータスコードに基づいたメッセージ
    if (typeof error.status === 'number') {
      switch (error.status) {
        case 400: return 'リクエストが不正です。';
        case 401: return 'セッションの有効期限が切れました。再度ログインしてください。';
        case 403: return 'アクセス権限がありません。';
        case 404: return 'リソースが見つかりません。';
        case 429: return 'リクエスト回数が制限を超えています。しばらく時間をおいてください。';
        case 500: return 'サーバーエラーが発生しました。しばらく時間をおいてから再度お試しください。';
        default: return `エラーが発生しました (${error.status})`;
      }
    }
    
    return '不明なエラーが発生しました。';
  }
  
  // SerializedErrorの場合
  if (isErrorWithMessage(error)) {
    return error.message;
  }
  
  return '不明なエラーが発生しました。';
};

/**
 * 認証エラー（401）を処理する
 */
export const handleAuthError = (error: any): void => {
  if (isFetchBaseQueryError(error) && error.status === 401) {
    // ログアウト処理を実行
    store.dispatch(logout());
    
    // ログインページへのリダイレクトはApp.tsxのProtectedRouteコンポーネントが処理
  }
};

// APIエラーを文字列に変換するヘルパー関数
export const formatErrorMessage = (error: any): string | null => {
  if (!error) return null;

  // すでに文字列の場合はそのまま返す
  if (typeof error === 'string') return error;

  // FetchBaseQueryErrorの場合
  if (isFetchBaseQueryError(error)) {
    return getErrorMessage(error);
  }

  // SerializedErrorの場合
  if (isErrorWithMessage(error)) {
    return error.message;
  }

  // その他のオブジェクトの場合
  if (error instanceof Error) {
    return error.message;
  }

  // どれにも当てはまらない場合
  return '不明なエラーが発生しました。';
}; 