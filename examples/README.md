# EES API サンプル・テスト例

このディレクトリには、EES (Embeddings API Service) をテストするためのサンプルリクエストとクライアント例が含まれています。

## 📋 ファイル一覧

### 🔧 テストスクリプト

- **`api-test.sh`** - 包括的なAPIテストスクリプト（Bash）
- **`sample-requests.md`** - cURLコマンドでのリクエスト例集

## 🚀 使用方法

### 前提条件

EES APIサーバーが起動している必要があります：

```bash
# Nix flakesを使用（推奨）
nix run

# または開発環境で
nix develop
npm run dev
```

### 1. Bashスクリプトでの包括テスト

```bash
# 実行権限を付与（初回のみ）
chmod +x examples/api-test.sh

# テスト実行
./examples/api-test.sh
```

**このスクリプトの機能:**
- ✅ サーバー接続確認
- 📝 基本的な埋め込み作成
- 🔧 カスタムモデル指定
- 🌏 日本語テキスト処理
- 📖 埋め込み取得（全件・個別）
- 🔄 埋め込み更新
- ❌ エラーケースの確認

### 2. 手動テスト（cURL）

詳細なcURLコマンド例は `sample-requests.md` を参照してください。

```bash
# 基本的な例
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "test.txt",
    "text": "Sample text for embedding"
  }'
```

## 📊 テストカバレッジ

各テストスクリプトは以下の機能をカバーしています：

### ✅ 正常ケース
- 埋め込み作成（基本）
- 埋め込み作成（カスタムモデル）
- 日本語テキスト処理
- すべての埋め込み取得
- ファイルパス指定での取得
- 埋め込み更新（上書き）
- 埋め込み削除

### ❌ エラーケース
- 無効なリクエスト形式
- 存在しないファイルパスでの取得
- 無効なIDでの削除
- サーバー接続エラー

## 🔍 レスポンス例

### 成功時の埋め込み作成
```json
{
  "id": 1,
  "file_path": "example.txt",
  "model_name": "embeddinggemma:300m",
  "message": "Embedding created successfully"
}
```

### 埋め込み取得
```json
{
  "id": 1,
  "file_path": "example.txt",
  "model_name": "embeddinggemma:300m",
  "embedding": [0.1, 0.2, 0.3, ...],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### エラー時
```json
{
  "error": "Failed to create embedding"
}
```

## 💡 使用のヒント

### 1. モデルについて
- デフォルト: `embeddinggemma:300m`
- 初回実行時はモデルのダウンロードが発生します（数分かかる場合があります）
- モデル指定は `model_name` パラメータで行います

### 2. ファイルパスについて
- `file_path` は一意である必要があります
- 同じパスで再送信すると既存データが更新されます
- 任意の文字列を指定可能（実際のファイルである必要はありません）

### 3. テキスト制限
- 長いテキストも処理可能です
- 日本語を含む多言語対応
- 特殊文字やUnicode文字も処理されます

### 4. ポート設定
- デフォルト: ポート3001
- 環境変数 `PORT` で変更可能
- 他のアプリケーションとのポート競合に注意

## 🐛 トラブルシューティング

### サーバーに接続できない
```bash
# サーバーが起動しているか確認
curl http://localhost:3001/

# ポートを確認
lsof -i :3001

# EESサーバーを起動
nix run
```

### モデルのダウンロードが遅い
```bash
# Ollamaサービスを手動で確認
ollama list

# モデルを事前ダウンロード
ollama pull embeddinggemma:300m
```

### 権限エラー
```bash
# スクリプトに実行権限を付与
chmod +x examples/*.sh
```

## 📚 参考資料

- [EES API ドキュメント](../README.md)
- [Ollama ドキュメント](https://ollama.ai/)
- [Nix Flakes ガイド](https://nixos.wiki/wiki/Flakes)