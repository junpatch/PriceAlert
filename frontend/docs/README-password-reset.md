# パスワードリセット機能実装ガイド

## 1. 機能概要

パスワードリセット機能は、ユーザーが自分のパスワードを忘れた場合に新しいパスワードを設定できるようにするものです。
この機能は以下のステップで実装されています：

1. ユーザーがログイン画面から「パスワードをお忘れですか？」リンクをクリック
2. メールアドレス入力フォームでリセットリンクをリクエスト
3. バックエンドがユーザーのメールアドレスに一時的なトークン付きリンクを送信
4. ユーザーがメール内のリンクをクリックして新しいパスワード設定画面に移動
5. 新しいパスワードを入力・送信して完了

## 2. フロントエンド実装

### 2.1 コンポーネント

- **ForgotPasswordForm**: メールアドレス入力フォーム

  - 場所: `src/features/auth/components/ForgotPasswordForm.tsx`
  - 機能: メールアドレス検証、リセットリクエスト送信、エラー・成功メッセージ表示

- **ResetPasswordForm**: 新パスワード設定フォーム
  - 場所: `src/features/auth/components/ResetPasswordForm.tsx`
  - 機能: パスワード入力・確認、パスワード強度検証、リセット処理実行、結果表示

### 2.2 ページ

- **ForgotPasswordPage**: パスワードリセットリクエストページ

  - ルート: `/forgot-password`
  - コンポーネント: `src/pages/ForgotPasswordPage.tsx`

- **ResetPasswordPage**: 新パスワード設定ページ
  - ルート: `/reset-password/:token`
  - コンポーネント: `src/pages/ResetPasswordPage.tsx`
  - 注意: URL パラメータからトークンを取得して検証

### 2.3 API 連携

- **パスワードリセットリクエスト**:

  - エンドポイント: `/api/v1/auth/password-reset/request/`
  - メソッド: `POST`
  - リクエストボディ: `{ "email": "user@example.com" }`
  - レスポンス: `{ "detail": "パスワードリセットリンクが送信されました" }`

- **パスワードリセット実行**:
  - エンドポイント: `/api/v1/auth/password-reset/confirm/`
  - メソッド: `POST`
  - リクエストボディ: `{ "token": "reset_token", "password": "new_password", "confirmPassword": "new_password" }`
  - レスポンス: `{ "detail": "パスワードが正常にリセットされました" }`

## 3. バックエンド実装

### 3.1 データモデル

- **PasswordResetToken**:
  - ユーザーとの関連付け (ForeignKey)
  - トークン (一意の文字列)
  - 有効期限 (通常 24 時間)
  - 使用済みフラグ (重複使用防止)

### 3.2 セキュリティ要件

- トークンは十分な長さと複雑さを持つこと (UUID 推奨)
- トークンの有効期限は 24 時間程度に制限
- トークンは 1 回限りの使用とし、使用後は無効化
- パスワードリセットリクエストのレート制限を実装
- リセット成功後は必ず関連するトークンを無効化
- リセット成功後はユーザーに確認メールを送信

## 4. テスト項目

- [x] パスワードリセットリクエストフォームの検証
- [x] 無効なメールアドレスのエラーハンドリング
- [x] リセットトークンの検証
- [x] 期限切れ/無効なトークンのエラー処理
- [x] パスワード強度要件の検証
- [x] パスワード設定成功時のリダイレクト

## 5. 運用上の注意点

- パスワードリセットメールが迷惑メールフォルダに入ることがある旨をユーザーに通知
- 大量のリセットリクエストを監視し、不正アクセスの可能性を検知
- パスワードリセット成功後のログインページへのリダイレクトは適切な時間差を設ける
- バックエンドでのメール送信機能が正常に動作していることを定期的に確認
