# Usage Examples

Comprehensive examples for using EES (Embeddings API Service) in various scenarios and languages.

## Table of Contents

- [Getting Started](#getting-started)
- [Basic Operations](#basic-operations)
  - [Create Single Embedding](#create-single-embedding)
  - [Create Batch Embeddings](#create-batch-embeddings)
  - [Search Similar Embeddings](#search-similar-embeddings)
  - [List Embeddings](#list-embeddings)
  - [Delete Embedding](#delete-embedding)
- [Advanced Use Cases](#advanced-use-cases)
  - [Semantic Search System](#semantic-search-system)
  - [Document Recommendation](#document-recommendation)
  - [Duplicate Detection](#duplicate-detection)
  - [Multi-language Support](#multi-language-support)
- [Language-Specific Examples](#language-specific-examples)
  - [JavaScript/TypeScript](#javascripttypescript)
  - [Python](#python)
  - [Go](#go)
  - [Rust](#rust)
- [Integration Patterns](#integration-patterns)
  - [Express.js Integration](#expressjs-integration)
  - [FastAPI Integration](#fastapi-integration)
  - [Next.js Integration](#nextjs-integration)
- [CLI Examples](#cli-examples)

---

## Getting Started

### Prerequisites

```bash
# Start EES API server
npm run dev

# Or with Docker
docker-compose up

# Or with Nix
nix run
```

**Verify API is running:**
```bash
curl http://localhost:3000/
# Output: EES - Embeddings API Service
```

---

## Basic Operations

### Create Single Embedding

**cURL:**
```bash
curl -X POST http://localhost:3000/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "uri": "article-123",
    "text": "Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience.",
    "model_name": "nomic-embed-text"
  }'
```

**Response:**
```json
{
  "id": 1,
  "uri": "article-123",
  "model_name": "nomic-embed-text",
  "message": "Embedding created successfully"
}
```

### Create Batch Embeddings

**cURL:**
```bash
curl -X POST http://localhost:3000/embeddings/batch \
  -H "Content-Type: application/json" \
  -d '{
    "items": [
      {
        "uri": "doc1",
        "text": "First document about machine learning"
      },
      {
        "uri": "doc2",
        "text": "Second document about neural networks"
      },
      {
        "uri": "doc3",
        "text": "Third document about deep learning"
      }
    ],
    "model_name": "nomic-embed-text"
  }'
```

**Response:**
```json
{
  "results": [
    {"id": 1, "uri": "doc1", "success": true},
    {"id": 2, "uri": "doc2", "success": true},
    {"id": 3, "uri": "doc3", "success": true}
  ],
  "total": 3,
  "successful": 3,
  "failed": 0
}
```

### Search Similar Embeddings

**cURL:**
```bash
curl -X POST http://localhost:3000/embeddings/search \
  -H "Content-Type: application/json" \
  -d '{
    "query": "artificial intelligence and neural networks",
    "limit": 5,
    "threshold": 0.7,
    "metric": "cosine"
  }'
```

**Response:**
```json
{
  "results": [
    {
      "id": 2,
      "uri": "doc2",
      "text": "Second document about neural networks",
      "similarity": 0.92,
      "model_name": "nomic-embed-text"
    },
    {
      "id": 3,
      "uri": "doc3",
      "text": "Third document about deep learning",
      "similarity": 0.88,
      "model_name": "nomic-embed-text"
    }
  ],
  "count": 2,
  "query_text": "artificial intelligence and neural networks",
  "metric": "cosine"
}
```

### List Embeddings

**cURL:**
```bash
# List all (first page)
curl http://localhost:3000/embeddings

# With pagination
curl "http://localhost:3000/embeddings?page=2&limit=20"

# Filter by URI pattern
curl "http://localhost:3000/embeddings?uri=article-*"

# Filter by model
curl "http://localhost:3000/embeddings?model_name=nomic-embed-text"
```

### Delete Embedding

**cURL:**
```bash
curl -X DELETE http://localhost:3000/embeddings/123
```

---

## Advanced Use Cases

### Semantic Search System

Build a semantic search engine for documentation:

**Step 1: Index Documents**
```bash
# index-docs.sh
#!/bin/bash

# Index multiple documentation files
for file in docs/*.md; do
  filename=$(basename "$file")
  content=$(cat "$file")

  curl -X POST http://localhost:3000/embeddings \
    -H "Content-Type: application/json" \
    -d "{
      \"uri\": \"docs/$filename\",
      \"text\": \"$content\",
      \"model_name\": \"nomic-embed-text\"
    }"
done
```

**Step 2: Search Documents**
```bash
# search.sh
#!/bin/bash

QUERY="How do I configure authentication?"

curl -X POST http://localhost:3000/embeddings/search \
  -H "Content-Type: application/json" \
  -d "{
    \"query\": \"$QUERY\",
    \"limit\": 5,
    \"threshold\": 0.6,
    \"metric\": \"cosine\"
  }" | jq '.results[] | {uri: .uri, similarity: .similarity}'
```

### Document Recommendation

Recommend similar documents based on a given document:

**JavaScript:**
```javascript
async function recommendSimilarDocuments(documentUri) {
  // 1. Get the source document
  const document = await fetch(
    `http://localhost:3000/embeddings/${encodeURIComponent(documentUri)}/nomic-embed-text`
  ).then(r => r.json());

  // 2. Search for similar documents
  const similar = await fetch('http://localhost:3000/embeddings/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: document.text,
      limit: 10,
      threshold: 0.7,
      metric: 'cosine',
    }),
  }).then(r => r.json());

  // 3. Filter out the source document itself
  return similar.results.filter(r => r.uri !== documentUri);
}

// Usage
const recommendations = await recommendSimilarDocuments('article-123');
console.log('Recommended:', recommendations.map(r => r.uri));
```

### Duplicate Detection

Find duplicate or near-duplicate content:

**Python:**
```python
import requests
import json

def find_duplicates(threshold=0.95):
    """Find duplicate documents using high similarity threshold"""

    # Get all embeddings
    response = requests.get('http://localhost:3000/embeddings?limit=1000')
    embeddings = response.json()['embeddings']

    duplicates = []

    # Check each document against all others
    for embedding in embeddings:
        # Search for similar documents
        search_response = requests.post(
            'http://localhost:3000/embeddings/search',
            json={
                'query': embedding['uri'],
                'limit': 5,
                'threshold': threshold,
                'metric': 'cosine',
                'model_name': embedding['model_name']
            }
        )

        similar = search_response.json()['results']

        # Find matches (excluding self)
        matches = [s for s in similar if s['uri'] != embedding['uri']]

        if matches:
            duplicates.append({
                'original': embedding['uri'],
                'duplicates': [m['uri'] for m in matches],
                'similarities': [m['similarity'] for m in matches]
            })

    return duplicates

# Find duplicates with 95% similarity or higher
duplicates = find_duplicates(threshold=0.95)
print(f"Found {len(duplicates)} potential duplicates")
for dup in duplicates:
    print(f"{dup['original']} -> {dup['duplicates']} ({dup['similarities']})")
```

### Multi-language Support

Handle multiple languages with appropriate models:

**TypeScript:**
```typescript
interface Document {
  id: string;
  text: string;
  language: string;
}

async function indexMultilingualDocuments(documents: Document[]) {
  // Group documents by language
  const byLanguage = documents.reduce((acc, doc) => {
    (acc[doc.language] = acc[doc.language] || []).push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  // Use appropriate model for each language
  const results = await Promise.all(
    Object.entries(byLanguage).map(async ([language, docs]) => {
      const modelName = getModelForLanguage(language);

      return fetch('http://localhost:3000/embeddings/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: docs.map(doc => ({
            uri: doc.id,
            text: doc.text,
          })),
          model_name: modelName,
        }),
      });
    })
  );

  return results;
}

function getModelForLanguage(language: string): string {
  // Use multilingual model for non-English
  return language === 'en'
    ? 'nomic-embed-text'
    : 'embed-multilingual-v3.0';
}

// Usage
const documents = [
  { id: 'en-1', text: 'Hello world', language: 'en' },
  { id: 'ja-1', text: 'こんにちは世界', language: 'ja' },
  { id: 'fr-1', text: 'Bonjour le monde', language: 'fr' },
];

await indexMultilingualDocuments(documents);
```

---

## Language-Specific Examples

### JavaScript/TypeScript

**Complete Client Library:**

```typescript
// ees-client.ts
export class EESClient {
  constructor(
    private baseUrl: string = 'http://localhost:3000',
    private apiKey?: string
  ) {}

  private async request(path: string, options: RequestInit = {}) {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['X-API-Key'] = this.apiKey;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async createEmbedding(params: {
    uri: string;
    text: string;
    modelName?: string;
  }) {
    return this.request('/embeddings', {
      method: 'POST',
      body: JSON.stringify({
        uri: params.uri,
        text: params.text,
        model_name: params.modelName,
      }),
    });
  }

  async batchCreateEmbeddings(params: {
    items: Array<{ uri: string; text: string }>;
    modelName?: string;
  }) {
    return this.request('/embeddings/batch', {
      method: 'POST',
      body: JSON.stringify({
        items: params.items,
        model_name: params.modelName,
      }),
    });
  }

  async search(params: {
    query: string;
    limit?: number;
    threshold?: number;
    metric?: 'cosine' | 'euclidean' | 'dot';
    modelName?: string;
  }) {
    return this.request('/embeddings/search', {
      method: 'POST',
      body: JSON.stringify({
        query: params.query,
        limit: params.limit || 10,
        threshold: params.threshold || 0.0,
        metric: params.metric || 'cosine',
        model_name: params.modelName,
      }),
    });
  }

  async listEmbeddings(params?: {
    page?: number;
    limit?: number;
    uri?: string;
    modelName?: string;
  }) {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.uri) query.append('uri', params.uri);
    if (params?.modelName) query.append('model_name', params.modelName);

    return this.request(`/embeddings?${query}`);
  }

  async getEmbedding(uri: string, modelName: string) {
    return this.request(
      `/embeddings/${encodeURIComponent(uri)}/${encodeURIComponent(modelName)}`
    );
  }

  async deleteEmbedding(id: number) {
    return this.request(`/embeddings/${id}`, { method: 'DELETE' });
  }

  async listModels() {
    return this.request('/models');
  }
}

// Usage
const client = new EESClient('http://localhost:3000');

// Create embedding
await client.createEmbedding({
  uri: 'doc-1',
  text: 'Hello world',
  modelName: 'nomic-embed-text',
});

// Search
const results = await client.search({
  query: 'machine learning',
  limit: 5,
  threshold: 0.7,
});

console.log(results);
```

### Python

**Complete Client Library:**

```python
# ees_client.py
import requests
from typing import List, Dict, Optional, Literal

class EESClient:
    """Python client for EES API"""

    def __init__(self, base_url: str = "http://localhost:3000", api_key: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.session = requests.Session()

        if api_key:
            self.session.headers.update({"X-API-Key": api_key})

    def create_embedding(
        self,
        uri: str,
        text: str,
        model_name: Optional[str] = None
    ) -> Dict:
        """Create a single embedding"""
        return self.session.post(
            f"{self.base_url}/embeddings",
            json={
                "uri": uri,
                "text": text,
                "model_name": model_name
            }
        ).json()

    def batch_create_embeddings(
        self,
        items: List[Dict[str, str]],
        model_name: Optional[str] = None
    ) -> Dict:
        """Create multiple embeddings in batch"""
        return self.session.post(
            f"{self.base_url}/embeddings/batch",
            json={
                "items": items,
                "model_name": model_name
            }
        ).json()

    def search(
        self,
        query: str,
        limit: int = 10,
        threshold: float = 0.0,
        metric: Literal["cosine", "euclidean", "dot"] = "cosine",
        model_name: Optional[str] = None
    ) -> Dict:
        """Search for similar embeddings"""
        return self.session.post(
            f"{self.base_url}/embeddings/search",
            json={
                "query": query,
                "limit": limit,
                "threshold": threshold,
                "metric": metric,
                "model_name": model_name
            }
        ).json()

    def list_embeddings(
        self,
        page: int = 1,
        limit: int = 10,
        uri: Optional[str] = None,
        model_name: Optional[str] = None
    ) -> Dict:
        """List embeddings with pagination"""
        params = {"page": page, "limit": limit}
        if uri:
            params["uri"] = uri
        if model_name:
            params["model_name"] = model_name

        return self.session.get(
            f"{self.base_url}/embeddings",
            params=params
        ).json()

    def get_embedding(self, uri: str, model_name: str) -> Dict:
        """Get specific embedding by URI and model"""
        from urllib.parse import quote
        return self.session.get(
            f"{self.base_url}/embeddings/{quote(uri)}/{quote(model_name)}"
        ).json()

    def delete_embedding(self, id: int) -> Dict:
        """Delete embedding by ID"""
        return self.session.delete(
            f"{self.base_url}/embeddings/{id}"
        ).json()

    def list_models(self) -> Dict:
        """List available models"""
        return self.session.get(f"{self.base_url}/models").json()

# Usage example
if __name__ == "__main__":
    client = EESClient("http://localhost:3000")

    # Create embedding
    result = client.create_embedding(
        uri="python-doc-1",
        text="Python is a high-level programming language",
        model_name="nomic-embed-text"
    )
    print(f"Created embedding: {result}")

    # Search
    search_results = client.search(
        query="programming languages",
        limit=5,
        threshold=0.7
    )
    print(f"Search results: {len(search_results['results'])} found")

    # List models
    models = client.list_models()
    print(f"Available models: {models['count']}")
```

### Go

**Complete Client Library:**

```go
// ees_client.go
package ees

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

type Client struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

type CreateEmbeddingRequest struct {
	URI       string `json:"uri"`
	Text      string `json:"text"`
	ModelName string `json:"model_name,omitempty"`
}

type SearchRequest struct {
	Query     string  `json:"query"`
	Limit     int     `json:"limit,omitempty"`
	Threshold float64 `json:"threshold,omitempty"`
	Metric    string  `json:"metric,omitempty"`
	ModelName string  `json:"model_name,omitempty"`
}

type SearchResult struct {
	ID         int     `json:"id"`
	URI        string  `json:"uri"`
	Text       string  `json:"text"`
	Similarity float64 `json:"similarity"`
	ModelName  string  `json:"model_name"`
}

type SearchResponse struct {
	Results   []SearchResult `json:"results"`
	Count     int            `json:"count"`
	QueryText string         `json:"query_text"`
	Metric    string         `json:"metric"`
}

func NewClient(baseURL string, apiKey string) *Client {
	return &Client{
		BaseURL:    baseURL,
		APIKey:     apiKey,
		HTTPClient: &http.Client{},
	}
}

func (c *Client) request(method, path string, body interface{}, result interface{}) error {
	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return err
		}
		reqBody = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, c.BaseURL+path, reqBody)
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	if c.APIKey != "" {
		req.Header.Set("X-API-Key", c.APIKey)
	}

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("HTTP %d: %s", resp.StatusCode, resp.Status)
	}

	if result != nil {
		return json.NewDecoder(resp.Body).Decode(result)
	}

	return nil
}

func (c *Client) CreateEmbedding(req CreateEmbeddingRequest) (map[string]interface{}, error) {
	var result map[string]interface{}
	err := c.request("POST", "/embeddings", req, &result)
	return result, err
}

func (c *Client) Search(req SearchRequest) (*SearchResponse, error) {
	var result SearchResponse
	err := c.request("POST", "/embeddings/search", req, &result)
	return &result, err
}

func (c *Client) ListModels() (map[string]interface{}, error) {
	var result map[string]interface{}
	err := c.request("GET", "/models", nil, &result)
	return result, err
}

// Example usage
func main() {
	client := NewClient("http://localhost:3000", "")

	// Create embedding
	_, err := client.CreateEmbedding(CreateEmbeddingRequest{
		URI:       "go-doc-1",
		Text:      "Go is a statically typed, compiled programming language",
		ModelName: "nomic-embed-text",
	})
	if err != nil {
		panic(err)
	}

	// Search
	results, err := client.Search(SearchRequest{
		Query:     "programming languages",
		Limit:     5,
		Threshold: 0.7,
		Metric:    "cosine",
	})
	if err != nil {
		panic(err)
	}

	fmt.Printf("Found %d results\n", len(results.Results))
}
```

### Rust

**Basic Client Example:**

```rust
// ees_client.rs
use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Serialize)]
struct CreateEmbeddingRequest {
    uri: String,
    text: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    model_name: Option<String>,
}

#[derive(Serialize)]
struct SearchRequest {
    query: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    limit: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    threshold: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    metric: Option<String>,
}

#[derive(Deserialize, Debug)]
struct SearchResult {
    id: i32,
    uri: String,
    text: String,
    similarity: f64,
    model_name: String,
}

#[derive(Deserialize, Debug)]
struct SearchResponse {
    results: Vec<SearchResult>,
    count: i32,
}

struct EESClient {
    base_url: String,
    client: reqwest::Client,
}

impl EESClient {
    fn new(base_url: String) -> Self {
        Self {
            base_url,
            client: reqwest::Client::new(),
        }
    }

    async fn create_embedding(
        &self,
        uri: String,
        text: String,
        model_name: Option<String>,
    ) -> Result<serde_json::Value, reqwest::Error> {
        let req = CreateEmbeddingRequest { uri, text, model_name };

        self.client
            .post(format!("{}/embeddings", self.base_url))
            .json(&req)
            .send()
            .await?
            .json()
            .await
    }

    async fn search(
        &self,
        query: String,
        limit: Option<i32>,
        threshold: Option<f64>,
    ) -> Result<SearchResponse, reqwest::Error> {
        let req = SearchRequest {
            query,
            limit,
            threshold,
            metric: Some("cosine".to_string()),
        };

        self.client
            .post(format!("{}/embeddings/search", self.base_url))
            .json(&req)
            .send()
            .await?
            .json()
            .await
    }
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let client = EESClient::new("http://localhost:3000".to_string());

    // Create embedding
    let result = client
        .create_embedding(
            "rust-doc-1".to_string(),
            "Rust is a systems programming language".to_string(),
            Some("nomic-embed-text".to_string()),
        )
        .await?;

    println!("Created: {:?}", result);

    // Search
    let search_results = client
        .search("programming".to_string(), Some(5), Some(0.7))
        .await?;

    println!("Found {} results", search_results.count);

    Ok(())
}
```

---

## Integration Patterns

### Express.js Integration

```javascript
// server.js
const express = require('express');
const { EESClient } = require('./ees-client');

const app = express();
app.use(express.json());

const ees = new EESClient('http://localhost:3000');

// Index new content
app.post('/api/articles', async (req, res) => {
  const { id, title, content } = req.body;

  try {
    // Store in your database
    await db.articles.create({ id, title, content });

    // Create embedding
    await ees.createEmbedding({
      uri: `article-${id}`,
      text: `${title}\n\n${content}`,
      modelName: 'nomic-embed-text',
    });

    res.json({ success: true, id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Search articles
app.get('/api/search', async (req, res) => {
  const { q } = req.query;

  try {
    const results = await ees.search({
      query: q,
      limit: 10,
      threshold: 0.6,
    });

    // Enrich with full article data
    const articles = await Promise.all(
      results.results.map(async (r) => {
        const id = r.uri.replace('article-', '');
        const article = await db.articles.findById(id);
        return { ...article, similarity: r.similarity };
      })
    );

    res.json({ results: articles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(4000, () => {
  console.log('Server running on port 4000');
});
```

### FastAPI Integration

```python
# main.py
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from ees_client import EESClient

app = FastAPI()
ees = EESClient("http://localhost:3000")

class Article(BaseModel):
    id: str
    title: str
    content: str

@app.post("/api/articles")
async def create_article(article: Article):
    """Create article and index for search"""
    try:
        # Store in database (simplified)
        # db.articles.insert(article.dict())

        # Create embedding
        result = ees.create_embedding(
            uri=f"article-{article.id}",
            text=f"{article.title}\n\n{article.content}",
            model_name="nomic-embed-text"
        )

        return {"success": True, "id": article.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/search")
async def search_articles(q: str, limit: int = 10):
    """Search articles by semantic similarity"""
    try:
        results = ees.search(
            query=q,
            limit=limit,
            threshold=0.6
        )

        # Enrich with full article data
        articles = []
        for result in results["results"]:
            article_id = result["uri"].replace("article-", "")
            # article = db.articles.find_by_id(article_id)
            articles.append({
                "id": article_id,
                "similarity": result["similarity"],
                # **article
            })

        return {"results": articles}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
```

### Next.js Integration

```typescript
// app/api/search/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { EESClient } from '@/lib/ees-client';

const ees = new EESClient(process.env.EES_API_URL || 'http://localhost:3000');

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get('q');

  if (!query) {
    return NextResponse.json({ error: 'Query required' }, { status: 400 });
  }

  try {
    const results = await ees.search({
      query,
      limit: 10,
      threshold: 0.6,
      metric: 'cosine',
    });

    return NextResponse.json(results);
  } catch (error) {
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}

// app/search/page.tsx
'use client';

import { useState } from 'react';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await response.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Semantic Search</h1>

      <form onSubmit={handleSearch} className="mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search..."
          className="border p-2 w-full"
        />
        <button
          type="submit"
          disabled={loading}
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      <div className="space-y-4">
        {results.map((result: any) => (
          <div key={result.id} className="border p-4 rounded">
            <div className="flex justify-between">
              <h3 className="font-bold">{result.uri}</h3>
              <span className="text-sm text-gray-500">
                {(result.similarity * 100).toFixed(1)}% match
              </span>
            </div>
            <p className="mt-2">{result.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## CLI Examples

**Using the EES CLI:**

```bash
# Create embedding from text
ees create "doc1" --text "Sample text content"

# Create from file
ees create "doc2" --file "./sample.txt"

# Create from stdin
echo "Sample text" | ees create "doc3"

# Batch create from JSON
ees batch ./batch.json

# Search
ees search "machine learning" --limit 10 --threshold 0.7

# List embeddings
ees list --limit 20 --model nomic-embed-text

# Upload files
ees upload file1.txt file2.pdf --model nomic-embed-text

# Migrate models
ees migrate "old-model" "new-model" --dry-run

# List models
ees models

# Provider status
ees providers ollama-status
```

---

## Best Practices

1. **Batch Operations**: Use batch endpoints for bulk operations
2. **Error Handling**: Implement retry logic with exponential backoff
3. **Caching**: Cache embedding vectors to reduce API calls
4. **Model Selection**: Choose appropriate model for your use case
5. **URI Naming**: Use consistent, descriptive URI patterns
6. **Search Tuning**: Adjust threshold and metric based on your needs
7. **Rate Limiting**: Respect rate limits and monitor headers

## Support

- **API Reference:** [docs/api-reference.md](./api-reference.md)
- **Provider Configuration:** [docs/provider-configuration.md](./provider-configuration.md)
- **Issues:** https://github.com/SuzumiyaAoba/ees/issues
