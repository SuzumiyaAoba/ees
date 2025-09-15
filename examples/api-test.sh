#!/bin/bash

# EES API テスト用サンプルリクエスト
# 使用方法: ./examples/api-test.sh

# カラー出力用の設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# APIエンドポイントの設定
API_BASE="http://localhost:3001"

echo -e "${BLUE}🚀 EES API テストスクリプト${NC}"
echo "=================================="
echo -e "API エンドポイント: ${YELLOW}${API_BASE}${NC}"
echo ""

# サーバーが起動しているかチェック
echo -e "${YELLOW}📡 サーバー接続確認...${NC}"
if ! curl -s "${API_BASE}/" > /dev/null 2>&1; then
    echo -e "${RED}❌ サーバーに接続できません。${NC}"
    echo -e "${YELLOW}💡 サーバーを起動してください: nix run${NC}"
    exit 1
fi
echo -e "${GREEN}✅ サーバー接続OK${NC}"
echo ""

# 1. 基本的な埋め込み作成
echo -e "${BLUE}1. 基本的な埋め込み作成${NC}"
echo "----------------------------"
echo "リクエスト: POST /embeddings"
RESPONSE1=$(curl -s -X POST "${API_BASE}/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://example.txt",
    "text": "This is a sample text for embedding generation."
  }')

echo -e "レスポンス: ${GREEN}${RESPONSE1}${NC}"
echo ""

# 2. カスタムモデルでの埋め込み作成
echo -e "${BLUE}2. カスタムモデルでの埋め込み作成${NC}"
echo "----------------------------"
echo "リクエスト: POST /embeddings (with custom model)"
RESPONSE2=$(curl -s -X POST "${API_BASE}/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://custom-model-example.txt",
    "text": "Advanced text processing with custom embedding model.",
    "model_name": "embeddinggemma:300m"
  }')

echo -e "レスポンス: ${GREEN}${RESPONSE2}${NC}"
echo ""

# 3. 日本語テキストの埋め込み作成
echo -e "${BLUE}3. 日本語テキストの埋め込み作成${NC}"
echo "----------------------------"
echo "リクエスト: POST /embeddings (Japanese text)"
RESPONSE3=$(curl -s -X POST "${API_BASE}/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://japanese-example.txt",
    "text": "これは日本語のテキストをベクトル化するためのサンプルです。自然言語処理の技術を使用しています。"
  }')

echo -e "レスポンス: ${GREEN}${RESPONSE3}${NC}"
echo ""

# 4. すべての埋め込みを取得
echo -e "${BLUE}4. すべての埋め込みを取得${NC}"
echo "----------------------------"
echo "リクエスト: GET /embeddings"
RESPONSE4=$(curl -s "${API_BASE}/embeddings")

echo -e "レスポンス: ${GREEN}${RESPONSE4}${NC}"
echo ""

# 5. 特定のファイルパスで埋め込みを取得
echo -e "${BLUE}5. 特定のファイルパスで埋め込みを取得${NC}"
echo "----------------------------"
echo "リクエスト: GET /embeddings/file://example.txt"
RESPONSE5=$(curl -s "${API_BASE}/embeddings/$(echo 'file://example.txt' | sed 's|://|%3A%2F%2F|g')")

echo -e "レスポンス: ${GREEN}${RESPONSE5}${NC}"
echo ""

# 6. 埋め込みの更新（同じファイルパスで異なるテキスト）
echo -e "${BLUE}6. 埋め込みの更新${NC}"
echo "----------------------------"
echo "リクエスト: POST /embeddings (update existing)"
RESPONSE6=$(curl -s -X POST "${API_BASE}/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://example.txt",
    "text": "This is an updated version of the sample text with new content."
  }')

echo -e "レスポンス: ${GREEN}${RESPONSE6}${NC}"
echo ""

# 7. エラーケース: 無効なリクエスト
echo -e "${BLUE}7. エラーケース: 無効なリクエスト${NC}"
echo "----------------------------"
echo "リクエスト: POST /embeddings (invalid data)"
RESPONSE7=$(curl -s -X POST "${API_BASE}/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "invalid_field": "This should cause an error"
  }')

echo -e "レスポンス: ${RED}${RESPONSE7}${NC}"
echo ""

# 8. 埋め込みの削除（IDが必要）
echo -e "${BLUE}8. 埋め込みの削除${NC}"
echo "----------------------------"
echo -e "${YELLOW}💡 削除するにはまず埋め込みのIDを確認してください${NC}"
echo "リクエスト例: DELETE /embeddings/1"
echo -e "${YELLOW}⚠️  実際の削除はIDを確認してから手動で実行してください${NC}"
echo ""

echo -e "${GREEN}🎉 テスト完了！${NC}"
echo "=================================="
echo ""
echo -e "${YELLOW}📋 利用可能なAPIエンドポイント:${NC}"
echo "• POST   /embeddings          - 新しい埋め込みを作成"
echo "• GET    /embeddings          - すべての埋め込みを取得"
echo "• GET    /embeddings/:uri     - 特定URIの埋め込みを取得"
echo "• DELETE /embeddings/:id      - IDで埋め込みを削除"
echo ""
echo -e "${YELLOW}📖 詳細なドキュメント: README.md を参照${NC}"