#!/bin/bash

# EES API Test Sample Requests
# Usage: ./examples/api-test.sh

# Color output settings
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# API endpoint configuration
API_BASE="http://localhost:3001"

echo -e "${BLUE}🚀 EES API Test Script${NC}"
echo "=================================="
echo -e "API Endpoint: ${YELLOW}${API_BASE}${NC}"
echo ""

# Check if server is running
echo -e "${YELLOW}📡 Checking server connection...${NC}"
if ! curl -s "${API_BASE}/" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to server.${NC}"
    echo -e "${YELLOW}💡 Please start the server: nix run${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Server connection OK${NC}"
echo ""

# 1. Basic embedding creation
echo -e "${BLUE}1. Basic Embedding Creation${NC}"
echo "----------------------------"
echo "Request: POST /embeddings"
RESPONSE1=$(curl -s -X POST "${API_BASE}/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://example.txt",
    "text": "This is a sample text for embedding generation."
  }')

echo -e "Response: ${GREEN}${RESPONSE1}${NC}"
echo ""

# 2. Custom model embedding creation
echo -e "${BLUE}2. Custom Model Embedding Creation${NC}"
echo "----------------------------"
echo "Request: POST /embeddings (with custom model)"
RESPONSE2=$(curl -s -X POST "${API_BASE}/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://custom-model-example.txt",
    "text": "Advanced text processing with custom embedding model.",
    "model_name": "embeddinggemma:300m"
  }')

echo -e "Response: ${GREEN}${RESPONSE2}${NC}"
echo ""

# 3. Japanese text embedding creation
echo -e "${BLUE}3. Japanese Text Embedding Creation${NC}"
echo "----------------------------"
echo "Request: POST /embeddings (Japanese text)"
RESPONSE3=$(curl -s -X POST "${API_BASE}/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://japanese-example.txt",
    "text": "これは日本語のテキストをベクトル化するためのサンプルです。自然言語処理の技術を使用しています。"
  }')

echo -e "Response: ${GREEN}${RESPONSE3}${NC}"
echo ""

# 4. Get all embeddings
echo -e "${BLUE}4. Get All Embeddings${NC}"
echo "----------------------------"
echo "Request: GET /embeddings"
RESPONSE4=$(curl -s "${API_BASE}/embeddings")

echo -e "Response: ${GREEN}${RESPONSE4}${NC}"
echo ""

# 5. Get embedding by specific URI
echo -e "${BLUE}5. Get Embedding by Specific URI${NC}"
echo "----------------------------"
echo "Request: GET /embeddings/file://example.txt"
RESPONSE5=$(curl -s "${API_BASE}/embeddings/$(echo 'file://example.txt' | sed 's|://|%3A%2F%2F|g')")

echo -e "Response: ${GREEN}${RESPONSE5}${NC}"
echo ""

# 6. Update embedding (same URI with different text)
echo -e "${BLUE}6. Update Embedding${NC}"
echo "----------------------------"
echo "Request: POST /embeddings (update existing)"
RESPONSE6=$(curl -s -X POST "${API_BASE}/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "file://example.txt",
    "text": "This is an updated version of the sample text with new content."
  }')

echo -e "Response: ${GREEN}${RESPONSE6}${NC}"
echo ""

# 7. Error case: Invalid request
echo -e "${BLUE}7. Error Case: Invalid Request${NC}"
echo "----------------------------"
echo "Request: POST /embeddings (invalid data)"
RESPONSE7=$(curl -s -X POST "${API_BASE}/embeddings" \
  -H "Content-Type: application/json" \
  -d '{
    "invalid_field": "This should cause an error"
  }')

echo -e "Response: ${RED}${RESPONSE7}${NC}"
echo ""

# 8. Embedding deletion (ID required)
echo -e "${BLUE}8. Embedding Deletion${NC}"
echo "----------------------------"
echo -e "${YELLOW}💡 First check the embedding ID for deletion${NC}"
echo "Request example: DELETE /embeddings/1"
echo -e "${YELLOW}⚠️  Please manually execute actual deletion after confirming ID${NC}"
echo ""

echo -e "${GREEN}🎉 Test Complete!${NC}"
echo "=================================="
echo ""
echo -e "${YELLOW}📋 Available API Endpoints:${NC}"
echo "• POST   /embeddings          - Create new embedding"
echo "• GET    /embeddings          - Get all embeddings"
echo "• GET    /embeddings/:uri     - Get embedding by specific URI"
echo "• DELETE /embeddings/:id      - Delete embedding by ID"
echo ""
echo -e "${YELLOW}📖 Detailed Documentation: See README.md${NC}"