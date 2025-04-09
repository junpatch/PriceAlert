# API 設計

## 5. API 設計

### 5.1 API 概要

PriceAlert の API は、React 製フロントエンドと Django REST Framework 製バックエンドの間の通信を担います。本 API は RESTful な設計原則に基づき、JSON フォーマットでデータをやり取りします。

### 5.2 認証・認可方式

#### 5.2.1 認証方式

- **トークンベース認証**: JWT（JSON Web Token）を使用
- **トークン発行**: ログイン時にアクセストークンとリフレッシュトークンを発行
- **トークン有効期限**: アクセストークン：2 時間、リフレッシュトークン：14 日間
- **トークン更新**: リフレッシュトークンを使用してアクセストークンを更新

#### 5.2.2 認可方式

- **権限モデル**: ロールベース（一般ユーザー、管理者）
- **アクセス制御**: ユーザー所有リソースのみアクセス許可
- **管理者権限**: 管理者は全リソースにアクセス可能

### 5.3 エンドポイント一覧

| エンドポイント                             | メソッド | 説明                   | 認証必須                  | アクセス権限     | フロント実装 | バック実装 | 整合性確認 |
| ------------------------------------------ | -------- | ---------------------- | ------------------------- | ---------------- | ------------ | ---------- | ---------- |
| `/api/auth/register/`                      | POST     | ユーザー登録           | No                        | -                | ✅           | ✅         | ✅         |
| `/api/auth/login/`                         | POST     | ユーザーログイン       | No                        | -                | ✅           | ✅         | ✅         |
| `/api/auth/logout/`                        | POST     | ログアウト             | Yes                       | ログインユーザー | ✅           | ✅         | ✅         |
| `/api/auth/refresh/`                       | POST     | トークン更新           | No (リフレッシュトークン) | -                | ✅           | ✅         | ❌         |
| `/api/auth/password-reset/request/`        | POST     | パスワードリセット要求 | No                        | -                | ✅           | ✅         | ✅         |
| `/api/auth/password-reset/confirm/<token>` | POST     | パスワードリセット確認 | No                        | -                | ✅           | ✅         | ✅         |
| `/api/users/me/`                           | GET      | 自分のプロフィール取得 | Yes                       | 本人のみ         | ✅           | ❌         | ❌         |
| `/api/users/me/`                           | PATCH    | プロフィール更新       | Yes                       | 本人のみ         | ✅           | ❌         | ❌         |
| `/api/users/settings/`                     | GET      | ユーザー設定取得       | Yes                       | 本人のみ         | ✅           | ❌         | ❌         |
| `/api/users/settings/`                     | PUT      | ユーザー設定更新       | Yes                       | 本人のみ         | ✅           | ❌         | ❌         |
| `/api/products/`                           | GET      | 登録商品一覧取得       | Yes                       | 本人の商品のみ   | ❌           | ✅         | ❌         |
| `/api/products/`                           | POST     | 商品登録               | Yes                       | ログインユーザー | ❌           | ❌         | ❌         |
| `/api/products/{id}/`                      | GET      | 商品詳細取得           | Yes                       | 本人の商品のみ   | ❌           | ✅         | ❌         |
| `/api/products/{id}/`                      | PUT      | 商品更新               | Yes                       | 本人の商品のみ   | ❌           | ❌         | ❌         |
| `/api/products/{id}/`                      | DELETE   | 商品削除               | Yes                       | 本人の商品のみ   | ❌           | ❌         | ❌         |
| `/api/user-products/`                           | GET      | ユーザー登録商品一覧取得       | Yes                       | 本人の商品のみ   | ✅           | ✅         | ✅         |
| `/api/user-products/`                           | POST     | ユーザー商品登録               | Yes                       | ログインユーザー | ✅           | ✅         | ✅         |
| `/api/user-products/{id}/`                      | GET      | ユーザー商品詳細取得           | Yes                       | 本人の商品のみ   | ✅           | ✅         | ✅         |
| `/api/user-products/{id}/`                      | PUT,PATCH | ユーザー商品更新               | Yes                       | 本人の商品のみ   | ✅           | ✅         | ❌         |
| `/api/user-products/{id}/`                      | DELETE   | ユーザー商品削除               | Yes                       | 本人の商品のみ   | ✅           | ✅         | ✅         |
| `/api/products/{id}/price-history/`        | GET      | 価格履歴取得           | Yes                       | 本人の商品のみ   | ✅           | ❌         | ❌         |
| `/api/products/{id}/alerts/`               | GET      | アラート設定一覧       | Yes                       | 本人の商品のみ   | ✅           | ❌         | ❌         |
| `/api/products/{id}/alerts/`               | POST     | アラート設定追加       | Yes                       | 本人の商品のみ   | ✅           | ❌         | ❌         |
| `/api/alerts/{id}/`                        | GET      | アラート詳細取得       | Yes                       | 本人の設定のみ   | ✅           | ❌         | ❌         |
| `/api/alerts/{id}/`                        | PUT      | アラート更新           | Yes                       | 本人の設定のみ   | ✅           | ❌         | ❌         |
| `/api/alerts/{id}/`                        | DELETE   | アラート削除           | Yes                       | 本人の設定のみ   | ✅           | ❌         | ❌         |
| `/api/notifications/`                      | GET      | 通知一覧取得           | Yes                       | 本人の通知のみ   | ✅           | ❌         | ❌         |
| `/api/notifications/mark-read/`            | POST     | 通知既読化             | Yes                       | 本人の通知のみ   | ✅           | ❌         | ❌         |
| `/api/ec-sites/`                           | GET      | EC サイト一覧          | Yes                       | 全ユーザー       | ✅           | ❌         | ❌         |
| `/api/product-search/`                     | GET      | 商品検索               | Yes                       | 全ユーザー       | ✅           | ❌         | ❌         |
| `/api/product-url/parse/`                  | POST     | 商品 URL 解析          | Yes                       | 全ユーザー       | ✅           | ❌         | ❌         |

#### 5.3.1 実装メモ

フロントエンド側では、すべての API エンドポイントの実装が完了しています。以下の修正を行いました：

1. エンドポイントパスの修正

   - 仕様書に合わせて以下のエンドポイントパスを修正：
     - `auth/me/` → `users/me/`
     - `user-products/` → `products/`
     - `user-products/{id}/` → `products/{id}/`
     - `notifications/{id}/read/` → `notifications/mark-read/`
     - `notifications/read-all/` → `notifications/mark-read/`
     - `user-settings/` → `users/settings/`
     - `auth/password-reset/confirm/${token}/` → `auth/password-reset/confirm/`

2. 次のステップ：

   - バックエンド側 API エンドポイントの実装

     - Django REST Framework を使用した各エンドポイントの実装
     - 認証・認可ロジックの実装
     - バリデーションの実装

   - フロントエンドとバックエンドの整合性確認
     - 各エンドポイントのリクエスト・レスポンス形式の確認
     - エラーハンドリングの確認
     - パフォーマンステスト

3. 優先実装順序
   - 認証系 API（ログイン、登録、トークン更新）
   - 商品管理 API
   - アラート設定 API
   - 通知系 API

### 5.4 主要 API エンドポイント詳細

#### 5.4.1 認証系 API

##### ユーザー登録 (POST /api/auth/register/)

**リクエスト：**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "username": "username"
}
```

**レスポンス (201 Created)：**

```json
{
  "id": 123,
  "email": "user@example.com",
  "username": "username",
  "created_at": "2023-06-10T12:00:00Z"
}
```

##### ログイン (POST /api/auth/login/)

**リクエスト：**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123"
}
```

**レスポンス (200 OK)：**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 123,
    "email": "user@example.com",
    "username": "username"
  }
}
```

##### パスワードリセット要求 (POST /api/auth/password-reset/request/)

**リクエスト：**

```json
{
  "email": "user@example.com"
}
```

**レスポンス (200 OK)：**

```json
{
  "detail": "パスワードリセットのリンクをメールで送信しました。"
}
```

**エラーレスポンス (400 Bad Request)：**

```json
{
  "email": ["このフィールドは必須です。"]
}
```

##### パスワードリセット確認 (POST /api/auth/password-reset/confirm/)

**リクエスト：**

```json
{
  "token": "リセットトークン",
  "password": "新しいパスワード",
  "confirmPassword": "新しいパスワード（確認）"
}
```

**レスポンス (200 OK)：**

```json
{
  "detail": "パスワードが正常にリセットされました。"
}
```

**エラーレスポンス (400 Bad Request)：**

```json
{
  "token": ["トークンが無効または期限切れです。"],
  "password": ["このパスワードは短すぎます。"],
  "non_field_errors": ["パスワードが一致しません。"]
}
```

#### 5.4.2 商品管理 API

##### 商品登録 (POST /api/products/)

**リクエスト：**

```json
{
  "url": "https://www.amazon.co.jp/dp/B07WFPMGQQ/"
}
```

**レスポンス (201 Created)：**

```json
{
  "id": 456,
  "name": "Sony WH-1000XM4 ワイヤレスノイズキャンセリングヘッドホン",
  "description": "ワイヤレスノイズキャンセリングステレオヘッドセット",
  "image_url": "https://images-na.ssl-images-amazon.com/images/I/...",
  "manufacturer": "Sony",
  "model_number": "WH-1000XM4",
  "jan_code": "4548736112254",
  "ec_sites": [
    {
      "id": 1,
      "name": "Amazon",
      "current_price": 29980,
      "current_points": 300,
      "effective_price": 29680,
      "product_url": "https://www.amazon.co.jp/dp/B07WFPMGQQ/",
      "affiliate_url": "https://www.amazon.co.jp/dp/B07WFPMGQQ/?tag=pricealert-22",
      "last_updated": "2023-06-10T12:00:00Z"
    }
  ],
  "alert_settings": {
    "price_threshold": null,
    "threshold_type": "list_price",
    "threshold_percentage": null,
    "notification_enabled": true
  },
  "created_at": "2023-06-10T12:00:00Z"
}
```

##### 価格履歴取得 (GET /api/products/{id}/price-history/)

**クエリパラメータ：**

- `ec_site_id` (オプション): EC サイト ID
- `period` (オプション): 期間 (week, month, 3months, year)
- `price_type` (オプション): 価格タイプ (list_price, effective_price)

**レスポンス (200 OK)：**

```json
{
  "product_id": 456,
  "product_name": "Sony WH-1000XM4 ワイヤレスノイズキャンセリングヘッドホン",
  "ec_site": {
    "id": 1,
    "name": "Amazon"
  },
  "period": "month",
  "price_type": "list_price",
  "min_price": 27800,
  "max_price": 32500,
  "current_price": 29980,
  "price_history": [
    {
      "price": 32500,
      "points": 325,
      "effective_price": 32175,
      "captured_at": "2023-05-10T00:00:00Z"
    },
    {
      "price": 30500,
      "points": 305,
      "effective_price": 30195,
      "captured_at": "2023-05-15T00:00:00Z"
    },
    {
      "price": 29980,
      "points": 300,
      "effective_price": 29680,
      "captured_at": "2023-06-01T00:00:00Z"
    }
  ]
}
```

#### 5.4.3 アラート設定 API

##### アラート設定追加 (POST /api/products/{id}/alerts/)

**リクエスト：**

```json
{
  "alert_type": "price_drop",
  "threshold_value": 25000,
  "threshold_type": "effective_price"
}
```

**レスポンス (201 Created)：**

```json
{
  "id": 789,
  "product_id": 456,
  "alert_type": "price_drop",
  "threshold_value": 25000,
  "threshold_percentage": null,
  "threshold_type": "effective_price",
  "is_active": true,
  "created_at": "2023-06-10T12:30:00Z"
}
```

#### 5.4.4 通知 API

##### 通知一覧取得 (GET /api/notifications/)

**クエリパラメータ：**

- `is_read` (オプション): 既読状態 (true/false)
- `page` (オプション): ページ番号
- `page_size` (オプション): 1 ページあたりの件数

**レスポンス (200 OK)：**

```json
{
  "count": 2,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 101,
      "product": {
        "id": 456,
        "name": "Sony WH-1000XM4 ワイヤレスノイズキャンセリングヘッドホン",
        "image_url": "https://images-na.ssl-images-amazon.com/images/I/..."
      },
      "ec_site": {
        "id": 1,
        "name": "Amazon"
      },
      "type": "price_drop",
      "message": "指定した価格を下回りました！",
      "old_price": 30500,
      "new_price": 27800,
      "affiliate_url": "https://www.amazon.co.jp/dp/B07WFPMGQQ/?tag=pricealert-22",
      "is_read": false,
      "sent_at": "2023-06-09T09:15:00Z"
    },
    {
      "id": 102,
      "product": {
        "id": 457,
        "name": "Apple AirPods Pro",
        "image_url": "https://images-na.ssl-images-amazon.com/images/I/..."
      },
      "ec_site": {
        "id": 1,
        "name": "Amazon"
      },
      "type": "price_drop",
      "message": "過去3ヶ月で最安値です！",
      "old_price": 32800,
      "new_price": 29800,
      "affiliate_url": "https://www.amazon.co.jp/dp/B07ZPS4FSW/?tag=pricealert-22",
      "is_read": false,
      "sent_at": "2023-06-08T15:30:00Z"
    }
  ]
}
```

#### 5.4.5 商品検索・URL 解析 API

##### 商品 URL 解析 (POST /api/product-url/parse/)

**リクエスト：**

```json
{
  "url": "https://www.amazon.co.jp/dp/B07WFPMGQQ/"
}
```

**レスポンス (200 OK)：**

```json
{
  "ec_site": {
    "id": 1,
    "name": "Amazon"
  },
  "product_id": "B07WFPMGQQ",
  "url": "https://www.amazon.co.jp/dp/B07WFPMGQQ/",
  "product_info": {
    "name": "Sony WH-1000XM4 ワイヤレスノイズキャンセリングヘッドホン",
    "price": 29980,
    "points": 300,
    "image_url": "https://images-na.ssl-images-amazon.com/images/I/...",
    "manufacturer": "Sony",
    "model_number": "WH-1000XM4"
  },
  "is_valid": true
}
```

### 5.5 エラーハンドリング

#### 5.5.1 エラーレスポンス形式

API からのエラーレスポンスは以下の形式に統一します：

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "エラーメッセージ",
  "details": {
    "field1": ["エラー詳細1"],
    "field2": ["エラー詳細2"]
  }
}
```

#### 5.5.2 主要エラーコード

| HTTP ステータス | エラーコード            | 説明                   |
| --------------- | ----------------------- | ---------------------- |
| 400             | INVALID_REQUEST         | リクエスト形式が不正   |
| 400             | VALIDATION_ERROR        | バリデーションエラー   |
| 401             | AUTHENTICATION_REQUIRED | 認証が必要             |
| 401             | INVALID_CREDENTIALS     | 認証情報が不正         |
| 403             | PERMISSION_DENIED       | 権限がない             |
| 404             | RESOURCE_NOT_FOUND      | リソースが見つからない |
| 409             | RESOURCE_CONFLICT       | リソースの競合         |
| 429             | RATE_LIMIT_EXCEEDED     | レート制限を超過       |
| 500             | SERVER_ERROR            | サーバーエラー         |
| 503             | SERVICE_UNAVAILABLE     | サービス利用不可       |

### 5.6 レート制限

#### 5.6.1 制限値

| エンドポイント | 制限 | 期間 | 認証別       |
| -------------- | ---- | ---- | ------------ |
| 認証系 API     | 10   | 分間 | IP 単位      |
| 商品登録 API   | 10   | 日間 | ユーザー単位 |
| 一般的な API   | 60   | 分間 | ユーザー単位 |
| 商品検索 API   | 30   | 分間 | ユーザー単位 |
| 管理者 API     | 600  | 分間 | ユーザー単位 |

#### 5.6.2 レート制限ヘッダー

API レスポンスには以下のヘッダーを含めます：

- `X-RateLimit-Limit`: 制限値
- `X-RateLimit-Remaining`: 残りリクエスト数
- `X-RateLimit-Reset`: 制限リセットまでの秒数

### 5.7 API ドキュメント

API ドキュメントは以下の方法で提供します：

1. **Swagger UI**: `/api/docs/` で利用可能
2. **ReDoc**: `/api/redoc/` で利用可能
3. **OpenAPI 仕様書**: `/api/schema/` で取得可能な JSON 形式

### 5.8 API 実装方針

#### 5.8.1 バージョニング方針

- URL パスによるバージョニング（例: `/api/v1/`）
- MVP フェーズでは v1 のみを提供
- 後方互換性を維持しながら新機能を追加

#### 5.8.2 ページネーション実装

- オフセットベースのページネーション
- デフォルトページサイズ: 20
- 最大ページサイズ: 100
- クエリパラメータ: `page`、`page_size`

#### 5.8.3 フィルタリング実装

- クエリパラメータによるフィルタリング
- 複数条件指定可能（AND 条件）
- 日付範囲指定可能（例: `created_at__gte=2023-01-01`）

#### 5.8.4 ソート実装

- クエリパラメータ `ordering` によるソート
- 複数フィールドでのソート可能（例: `ordering=price,-created_at`）
- 降順指定は項目名の前に `-` を付加

### 5.9 API セキュリティ対策

#### 5.9.1 入力バリデーション

- 全ての入力パラメータに対する厳格な検証
- パラメータタイプ、長さ、範囲、フォーマットの検証
- 許可リストアプローチの採用（許可されたパラメータのみ受け付け）

#### 5.9.2 クロスサイトリクエストフォージェリ（CSRF）対策

- SPA 向けの CSRF 保護メカニズム実装
- Cookie ベースの CSRF トークン使用
- 認証済み POST/PUT/DELETE リクエストに CSRF トークン必須

#### 5.9.3 JSON インジェクション対策

- コンテンツタイプの強制（`application/json`）
- レスポンスヘッダー `X-Content-Type-Options: nosniff` の設定

#### 5.9.4 センシティブデータ保護

- パスワードなど機密情報の伝送は常に HTTPS
- API レスポンスからの機密情報の除外
- トークンの適切な有効期限設定
