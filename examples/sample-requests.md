# EES API サンプルリクエスト

## 前提条件

EES APIサーバーが起動している必要があります：

```bash
# Nix flakesを使用
nix run

# または開発環境で
nix develop
npm run dev
```

## 基本的なAPIリクエスト例

### 1. サーバー接続確認

```bash
curl http://localhost:3001/
```

**期待レスポンス:**
```
EES - Embeddings API Service
```

### 2. 埋め込み作成

#### 基本的な埋め込み作成

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://example.txt",
    "text": "This is a sample text for embedding generation."
  }'
```

#### カスタムモデルを指定

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://custom-example.txt",
    "text": "Advanced text processing example.",
    "model_name": "embeddinggemma:300m"
  }'
```

#### 日本語テキストの埋め込み

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://japanese-text.txt",
    "text": "これは日本語のテキストです。自然言語処理の技術を使用してベクトル化されます。"
  }'
```

**期待レスポンス:**
```json
{
  "id": 1,
  "uri": "file://example.txt",
  "model_name": "embeddinggemma:300m",
  "message": "Embedding created successfully"
}
```

### 3. 埋め込み取得

#### すべての埋め込みを取得

```bash
curl http://localhost:3001/embeddings
```

**期待レスポンス:**
```json
{
  "embeddings": [
    {
      "id": 1,
      "uri": "file://example.txt",
      "model_name": "embeddinggemma:300m",
      "embedding": [0.1, 0.2, 0.3, ...],
      "created_at": "2024-01-01T00:00:00.000Z",
      "updated_at": "2024-01-01T00:00:00.000Z"
    }
  ],
  "count": 1
}
```

#### 特定のURIで取得

```bash
curl http://localhost:3001/embeddings/file%3A%2F%2Fexample.txt
```

**期待レスポンス:**
```json
{
  "id": 1,
  "uri": "file://example.txt",
  "model_name": "embeddinggemma:300m",
  "embedding": [0.1, 0.2, 0.3, ...],
  "created_at": "2024-01-01T00:00:00.000Z",
  "updated_at": "2024-01-01T00:00:00.000Z"
}
```

### 4. 埋め込み削除

```bash
curl -X DELETE http://localhost:3001/embeddings/1
```

**期待レスポンス:**
```json
{
  "message": "Embedding deleted successfully"
}
```

## 高度な使用例

### 1. 埋め込みの更新

同じ `file_path` で新しいテキストを送信すると、既存の埋め込みが更新されます：

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "example.txt",
    "text": "This is an updated version of the text with new content."
  }'
```

### 2. 複数のテキストを一括作成

```bash
# ファイル1
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "document1.txt",
    "text": "First document content for vector search."
  }'

# ファイル2
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "document2.txt",
    "text": "Second document with different content for comparison."
  }'

# ファイル3
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "document3.txt",
    "text": "Third document containing technical information about machine learning."
  }'
```

### 3. 長いテキストの処理

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "file_path": "long-document.txt",
    "text": "This is a longer document that contains multiple sentences and paragraphs. It demonstrates how the embedding API handles larger texts and generates comprehensive vector representations. The system uses advanced natural language processing techniques to understand the semantic meaning of the content and create high-quality embeddings suitable for various AI applications including semantic search, content recommendation, and text classification tasks."
  }'
```

## エラーハンドリング例

### 1. 無効なリクエスト形式

```bash
curl -X POST http://localhost:3001/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "invalid_field": "This will cause an error"
  }'
```

**期待レスポンス:**
```json
{
  "error": "Failed to create embedding"
}
```

### 2. 存在しないファイルパスの取得

```bash
curl http://localhost:3001/embeddings/nonexistent.txt
```

**期待レスポンス:**
```json
{
  "error": "Embedding not found"
}
```

### 3. 無効なIDでの削除

```bash
curl -X DELETE http://localhost:3001/embeddings/999
```

**期待レスポンス:**
```json
{
  "error": "Embedding not found"
}
```

## 自動テストスクリプト

完全なテストスイートを実行する場合：

```bash
./examples/api-test.sh
```

このスクリプトは以下を実行します：
- サーバー接続確認
- 基本的な埋め込み作成
- カスタムモデルでの作成
- 日本語テキストの処理
- 埋め込み取得（全件・個別）
- 埋め込み更新
- エラーケースの確認

## 注意事項

1. **初回実行時**: Ollamaモデル（embeddinggemma:300m）のダウンロードが発生するため、時間がかかる場合があります
2. **ポート設定**: デフォルトはポート3001です。環境変数 `PORT` で変更可能
3. **モデル指定**: `model_name` を省略した場合、デフォルトで `embeddinggemma:300m` が使用されます
4. **URI**: `uri` は一意である必要があります。同じURIで再送信すると既存データが更新されます。ファイルパス、URL、任意の識別子など、データのロケーションを表す任意の文字列を指定可能