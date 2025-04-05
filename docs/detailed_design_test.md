 # テスト詳細計画書

## 1. テスト戦略の概要

本書では、PriceAlertシステムの品質を確保するための包括的なテスト計画を記述します。テストは異なるレベルとスコープで実施され、全体として品質と機能性を担保します。

### 1.1 テストレベル

テストは以下の4つのレベルで実施します：

1. **単体テスト**: 個々のコンポーネントやクラスの機能テスト
2. **統合テスト**: 複数のコンポーネントの相互作用の検証
3. **システムテスト**: エンドツーエンドの機能検証
4. **受け入れテスト**: ユーザー視点での要件充足の確認

### 1.2 テスト環境

| 環境名 | 目的 | インフラ | データ |
|-------|------|---------|-------|
| 開発環境 | 開発者によるテスト | ローカル/Docker | サンプルデータ |
| テスト環境 | CI/CD自動テスト | GitHub Actions/Docker | テスト用データセット |
| ステージング環境 | 本番リリース前の検証 | AWS/Render.com（本番同等） | 匿名化された本番データのコピー |
| 本番環境 | 実運用 | AWS/Render.com | 実データ |

## 2. 単体テスト

### 2.1 テスト方針

単体テストは各コンポーネントが正しく機能することを検証するために行います。以下の原則に従います：

- テストはコードの全ての機能的な部分をカバーする
- テストは自動化し、CI/CDパイプラインに組み込む
- コードカバレッジ80%以上を目標とする

### 2.2 テストフレームワークと構成

#### 2.2.1 バックエンド（Python）

```python
# pytest.iniの設定例
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = --cov=app --cov-report=term --cov-report=html
```

#### 2.2.2 フロントエンド（React）

```javascript
// jest.config.jsの設定例
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleNameMapper: {
    '\\.(css|less|scss)$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
  ],
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 80,
      functions: 80,
      lines: 80,
    },
  },
};
```

### 2.3 モック戦略

外部依存関係はテスト時にモックし、テストの独立性を確保します：

#### 2.3.1 バックエンドのモック例

```python
# データベースモックの例
@pytest.fixture
def mock_db_session():
    """SQLAlchemyセッションのモック"""
    mock_session = MagicMock()
    return mock_session

# APIコネクタのモック例
@pytest.fixture
def mock_amazon_connector():
    """AmazonコネクタのAPIレスポンスモック"""
    with patch('app.ec_sites.connectors.AmazonConnector') as mock:
        connector = mock.return_value
        connector.fetch_product_info.return_value = {
            'name': 'テスト商品',
            'description': '商品説明',
            'image_url': 'https://example.com/image.jpg',
            'price': 9800,
            'points': 98,
            'ec_product_id': 'B01ABCDEFG',
            'product_url': 'https://amazon.co.jp/dp/B01ABCDEFG'
        }
        yield connector
```

#### 2.3.2 フロントエンドのモック例

```javascript
// APIクライアントのモック例
jest.mock('../src/api/client', () => ({
  getProducts: jest.fn().mockResolvedValue([
    {
      id: 1,
      name: 'テスト商品',
      price: 9800,
      imageUrl: 'https://example.com/image.jpg'
    }
  ]),
  getProductDetails: jest.fn().mockResolvedValue({
    id: 1,
    name: 'テスト商品',
    description: '商品説明',
    price: 9800,
    points: 98,
    ecSite: 'Amazon'
  })
}));
```

### 2.4 サンプルテストケース

#### 2.4.1 バックエンド単体テスト例

```python
def test_product_service_register_product(mock_db_session, mock_amazon_connector):
    """商品登録サービスのテスト"""
    # リポジトリのモック設定
    product_repo = MagicMock()
    product_repo.get_by_code.return_value = None
    
    user_product_repo = MagicMock()
    user_product_repo.get_by_user_and_product.return_value = None
    
    # テスト対象のサービス作成
    product_service = ProductService(
        product_repo=product_repo,
        user_product_repo=user_product_repo,
        ec_connector_factory=MagicMock(get_connector=MagicMock(return_value=mock_amazon_connector))
    )
    
    # サービスメソッド実行
    user_id = 1
    url = "https://amazon.co.jp/dp/B01ABCDEFG"
    result = product_service.register_product_from_url(user_id, url)
    
    # 検証
    product_repo.get_by_code.assert_called_once()
    product_repo.create.assert_called_once()
    user_product_repo.create.assert_called_once_with({
        'user_id': user_id,
        'product_id': product_repo.create.return_value.id,
        'notification_enabled': True
    })
    assert result == user_product_repo.create.return_value
```

#### 2.4.2 フロントエンド単体テスト例

```javascript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductRegistration } from '../src/components/ProductRegistration';
import { registerProduct } from '../src/api/client';

// APIクライアントのモック
jest.mock('../src/api/client', () => ({
  registerProduct: jest.fn()
}));

describe('ProductRegistration', () => {
  test('URLを入力して商品を登録できること', async () => {
    // モックレスポンスの設定
    registerProduct.mockResolvedValueOnce({
      id: 1,
      name: 'テスト商品',
      price: 9800
    });
    
    // コンポーネントのレンダリング
    render(<ProductRegistration />);
    
    // URL入力
    const urlInput = screen.getByLabelText(/商品URL/i);
    fireEvent.change(urlInput, { target: { value: 'https://amazon.co.jp/dp/B01ABCDEFG' } });
    
    // 登録ボタンのクリック
    const submitButton = screen.getByRole('button', { name: /登録/i });
    fireEvent.click(submitButton);
    
    // APIが呼ばれることを確認
    expect(registerProduct).toHaveBeenCalledWith('https://amazon.co.jp/dp/B01ABCDEFG');
    
    // 結果の表示を確認
    await waitFor(() => {
      expect(screen.getByText('テスト商品')).toBeInTheDocument();
    });
  });
});
```

## 3. 統合テスト

### 3.1 テスト方針

統合テストは複数のコンポーネントが連携して正しく動作することを検証します。以下の領域に焦点を当てます：

- API エンドポイントの機能検証
- データベースアクセス層と業務ロジック層の連携
- 外部サービス連携の検証

### 3.2 API 統合テスト

#### 3.2.1 テスト構成

```python
@pytest.fixture
def api_client():
    """APIテスト用のクライアント"""
    from rest_framework.test import APIClient
    client = APIClient()
    return client

@pytest.fixture
def authenticated_client(api_client):
    """認証済みAPIクライアント"""
    # テストユーザー作成
    from app.users.models import User
    user = User.objects.create(
        email='test@example.com',
        username='testuser'
    )
    user.set_password('password123')
    user.save()
    
    # 認証
    response = api_client.post('/api/auth/login/', {
        'email': 'test@example.com',
        'password': 'password123'
    })
    
    # トークン取得
    token = response.data['access_token']
    api_client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    # ユーザーとクライアントを返却
    return api_client, user
```

#### 3.2.2 API統合テスト例

```python
def test_product_registration_api(authenticated_client):
    """商品登録APIの統合テスト"""
    client, user = authenticated_client
    
    # APIリクエスト
    response = client.post('/api/products/', {
        'url': 'https://amazon.co.jp/dp/B01ABCDEFG'
    })
    
    # レスポンス検証
    assert response.status_code == 201
    assert 'id' in response.data
    assert 'name' in response.data
    assert 'price' in response.data
    
    # データベースに登録されていることを確認
    from app.products.models import UserProduct
    assert UserProduct.objects.filter(user_id=user.id).exists()
```

### 3.3 サービス連携テスト

実際の外部サービスと連携するテストの例です：

```python
@pytest.mark.integration
def test_amazon_api_integration():
    """Amazon PA-API との実際の連携テスト"""
    # 本物のAPIキーを使用
    from app.ec_sites.connectors import AmazonConnector
    connector = AmazonConnector(
        access_key=os.environ.get('AMAZON_ACCESS_KEY'),
        secret_key=os.environ.get('AMAZON_SECRET_KEY'),
        partner_tag=os.environ.get('AMAZON_PARTNER_TAG')
    )
    
    # 実際のAPIコール
    product_info = connector.fetch_product_info('B01ABCDEFG')
    
    # 結果検証
    assert product_info is not None
    assert 'name' in product_info
    assert 'price' in product_info
    assert 'image_url' in product_info
```

## 4. システムテスト

### 4.1 エンドツーエンドテスト

#### 4.1.1 Cypress によるE2Eテスト構成

```javascript
// cypress.json
{
  "baseUrl": "http://localhost:3000",
  "videoRecording": true,
  "viewportWidth": 1280,
  "viewportHeight": 720,
  "testFiles": "**/*.spec.js",
  "defaultCommandTimeout": 5000,
  "env": {
    "apiUrl": "http://localhost:8000/api"
  }
}
```

#### 4.1.2 E2Eテスト例

```javascript
// cypress/integration/product_registration.spec.js
describe('商品登録フロー', () => {
  beforeEach(() => {
    // ログイン
    cy.visit('/login');
    cy.get('input[name=email]').type('test@example.com');
    cy.get('input[name=password]').type('password123');
    cy.get('button[type=submit]').click();
    
    // ダッシュボードに遷移することを確認
    cy.url().should('include', '/dashboard');
  });
  
  it('商品を登録し、価格履歴が表示されることを確認', () => {
    // 商品登録ページに移動
    cy.get('a[href="/product/register"]').click();
    cy.url().should('include', '/product/register');
    
    // 商品URL入力
    cy.get('input[name=productUrl]').type('https://amazon.co.jp/dp/B01ABCDEFG');
    cy.get('button[type=submit]').click();
    
    // 商品プレビュー表示確認
    cy.get('.product-preview').should('be.visible');
    cy.get('.product-name').should('contain', 'テスト商品');
    
    // 登録確定
    cy.get('button:contains("登録する")').click();
    
    // 商品詳細ページに遷移することを確認
    cy.url().should('match', /\/product\/\d+/);
    
    // 価格履歴グラフが表示されることを確認
    cy.get('.price-chart').should('be.visible');
    
    // アラート設定が可能なことを確認
    cy.get('.alert-settings').should('be.visible');
    cy.get('input[name=priceThreshold]').type('8000');
    cy.get('button:contains("アラート設定")').click();
    
    // 設定完了メッセージの確認
    cy.get('.alert-success').should('contain', 'アラートを設定しました');
  });
});
```

### 4.2 パフォーマンステスト

#### 4.2.1 負荷テスト

```python
# locustfile.py
from locust import HttpUser, task, between

class WebsiteUser(HttpUser):
    wait_time = between(1, 5)
    
    def on_start(self):
        # ログイン
        response = self.client.post("/api/auth/login/", {
            "email": "test@example.com",
            "password": "password123"
        })
        self.token = response.json()["access_token"]
        self.client.headers = {"Authorization": f"Bearer {self.token}"}
    
    @task(3)
    def view_dashboard(self):
        self.client.get("/api/products/")
    
    @task(1)
    def view_product_details(self):
        # ランダムな商品を選択（本番テストではIDを適切に設定）
        product_id = 1
        self.client.get(f"/api/products/{product_id}/")
        self.client.get(f"/api/products/{product_id}/price-history/")
    
    @task(1)
    def register_product(self):
        self.client.post("/api/products/", {
            "url": "https://amazon.co.jp/dp/B01ABCDEFG"
        })
```

#### 4.2.2 レスポンスタイム測定

```bash
# 負荷テスト実行コマンド
locust -f locustfile.py --host=http://localhost:8000 --users=100 --spawn-rate=10
```

## 5. 受け入れテスト

### 5.1 ユーザー受け入れテスト（UAT）シナリオ

| テストシナリオID | 名称 | 前提条件 | 手順 | 期待結果 |
|----------------|------|---------|-----|---------|
| UAT-001 | ユーザー登録 | アプリにアクセス可能 | 1. トップページから「新規登録」をクリック<br>2. メールアドレス、パスワードを入力<br>3. 規約に同意にチェック<br>4. 「登録」ボタンをクリック | 登録完了し、ダッシュボードに遷移する |
| UAT-002 | 商品URL登録 | ログイン済み | 1. 「商品登録」ページに移動<br>2. AmazonのURLを入力<br>3. 「検索」ボタンをクリック<br>4. 「登録」ボタンをクリック | 商品情報が表示され、「登録しました」と表示される |
| UAT-003 | 価格アラート設定 | 商品登録済み | 1. 商品詳細ページに移動<br>2. アラート設定欄に希望価格を入力<br>3. 「設定」ボタンをクリック | 「アラートを設定しました」と表示される |
| UAT-004 | 価格履歴確認 | 商品登録済み | 1. 商品詳細ページに移動<br>2. 価格履歴タブを選択 | 価格の推移グラフが表示される |
| UAT-005 | 複数ECサイト比較 | 商品登録済み | 1. 商品詳細ページに移動<br>2. 「比較」タブを選択 | 複数のECサイトの価格比較表が表示される |

### 5.2 受け入れ基準

受け入れテストの合格基準は以下の通りです：

1. すべてのUATシナリオが成功すること
2. クリティカルなバグが存在しないこと
3. 非機能要件が満たされていること
   - ページの読み込み時間が2秒以内であること
   - モバイルデバイスでの表示が適切であること
   - 主要ブラウザ（Chrome、Safari、Firefox、Edge）で動作すること

## 6. 継続的インテグレーション

### 6.1 CIパイプライン

GitHub Actionsを使用したCIパイプラインの設定例：

```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
    - uses: actions/checkout@v2
    - name: Set up Python
      uses: actions/setup-python@v2
      with:
        python-version: '3.12'
    
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install -r requirements.txt
        pip install -r requirements-dev.txt
    
    - name: Lint with flake8
      run: |
        flake8 .
    
    - name: Run unit tests
      run: |
        pytest --cov=app tests/unit/
    
    - name: Run integration tests
      run: |
        pytest --cov=app --cov-append tests/integration/
    
    - name: Upload coverage report
      uses: codecov/codecov-action@v1

  test-frontend:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v2
    - name: Set up Node.js
      uses: actions/setup-node@v2
      with:
        node-version: '18'
    
    - name: Install dependencies
      run: |
        cd frontend
        npm ci
    
    - name: Lint with ESLint
      run: |
        cd frontend
        npm run lint
    
    - name: Run unit tests
      run: |
        cd frontend
        npm test -- --coverage
    
    - name: Upload coverage report
      uses: codecov/codecov-action@v1
      with:
        directory: ./frontend/coverage/
    
    - name: Build
      run: |
        cd frontend
        npm run build
```

## 7. テスト自動化計画

### 7.1 自動化対象範囲

| テストレベル | 自動化率目標 | 自動化ツール | 優先度 |
|-------------|-----------|------------|--------|
| 単体テスト | 90% | pytest, Jest | 高 |
| 統合テスト | 80% | pytest | 高 |
| API テスト | 90% | pytest | 高 |
| E2E テスト | 70% | Cypress | 中 |
| 視覚回帰テスト | 60% | Percy | 中 |
| パフォーマンステスト | 50% | Locust | 低 |

### 7.2 自動テスト実行スケジュール

| タイミング | テストタイプ | 環境 |
|-----------|------------|------|
| PR作成時 | 単体テスト、Lint | CI環境 |
| PRマージ時 | 単体テスト、統合テスト、E2Eテスト | CI環境 |
| 毎晩（定期） | 全テスト（パフォーマンステスト含む） | ステージング環境 |
| リリース前 | 全テスト + 受け入れテスト | ステージング環境 |

## 8. バグ管理プロセス

### 8.1 バグ優先度の定義

| 優先度 | 定義 | 対応時間 |
|--------|------|---------|
| P0（クリティカル） | サービス全体が機能しない致命的な問題 | 即時（4時間以内） |
| P1（高） | 主要機能が利用できない重大な問題 | 24時間以内 |
| P2（中） | 一部機能に影響する問題 | 3日以内 |
| P3（低） | 軽微な問題、UIの改善点など | 次回リリースまで |

### 8.2 バグ報告テンプレート

```
## バグ報告

### 概要
[バグの簡潔な説明]

### 再現手順
1. [手順1]
2. [手順2]
3. [手順3]

### 期待される動作
[本来どうあるべきか]

### 実際の動作
[実際に何が起きているか]

### 環境情報
- ブラウザ: [例: Chrome 96.0]
- OS: [例: Windows 10]
- スクリーンショット: [可能なら添付]

### 優先度
[P0/P1/P2/P3]
```

## 9. テスト成果物管理

### 9.1 テスト成果物一覧

| 成果物 | 目的 | 作成者 | レビュアー | 保管場所 |
|-------|------|-------|-----------|---------|
| テスト計画書 | テスト全体の計画を文書化 | テストリード | プロジェクトマネージャー | GitHub Wiki |
| テストケース | テスト実施内容の詳細化 | テストエンジニア | テストリード | TestRail |
| 自動テストコード | テストの自動実行 | 開発者 | テストエンジニア | GitHubリポジトリ |
| テスト結果レポート | テスト結果の共有と分析 | CI/CD | テストリード | GitHub Pages |
| カバレッジレポート | コードカバレッジの可視化 | CI/CD | 開発者 | Codecov |

### 9.2 テスト結果レポートの例

```markdown
# テスト結果サマリー（2023-06-20）

## 実行結果
- 単体テスト: 245/250 成功 (98%)
- 統合テスト: 78/80 成功 (97.5%)
- E2Eテスト: 32/35 成功 (91.4%)

## カバレッジ
- ライン: 87.2%
- 分岐: 82.5%
- 関数: 91.3%

## 失敗したテスト
1. test_price_alert_with_specific_condition (alerts/test_alerts.py:124)
   - 原因: 価格変動率の計算に誤り
   - 対応: #123 で修正対応中

2. test_product_comparison_between_sites (product/test_comparison.py:87)
   - 原因: APIレスポンスのモック構造変更
   - 対応: #124 で修正完了、次回ビルドで解消見込み

## パフォーマンス指標
- API平均応答時間: 125ms (目標: <200ms)
- ダッシュボード読み込み時間: 1.2秒 (目標: <2秒)
```