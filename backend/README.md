# OpsMind AI Backend v2.0

> **Enterprise SOP Knowledge Agent** — Node.js · Express · MongoDB Atlas Vector Search · Gemini / Groq

[![Node](https://img.shields.io/badge/node-≥18-green)](https://nodejs.org) [![License](https://img.shields.io/badge/license-MIT-blue)](LICENSE)

---

## Table of Contents

1. [Architecture](#architecture)
2. [Quick Start](#quick-start)
3. [Environment Variables](#environment-variables)
4. [MongoDB Atlas Setup](#mongodb-atlas-setup)
5. [API Reference](#api-reference)
6. [Scripts](#scripts)
7. [Docker](#docker)
8. [Deploy to Render](#deploy-to-render)
9. [RAG Pipeline](#rag-pipeline)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

```
PDF Upload
    │
    ▼
pdfService       ← text extraction + page-aware chunking
    │
    ▼
embeddingService ← Gemini text-embedding-004 (768-dim vectors)
    │
    ▼
MongoDB Atlas    ← chunks stored with embedding + text + metadata
    │
    ▼
Query Request
    │
    ├─ sanitizer      ← prompt injection prevention
    ├─ cache check    ← 30-min LRU cache
    ├─ rewriteQuery   ← LLM query expansion
    ├─ embeddingService ← query embedding
    ├─ retrievalService ← hybrid search (vector + keyword → RRF)
    ├─ llmService     ← reranking + answer generation / streaming
    └─ analyticsService ← async telemetry logging
```

---

## Quick Start

```bash
# 1. Clone / unzip and enter the directory
cd opsmind-ai

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# → Fill in MONGODB_URI, JWT_SECRET, GEMINI_API_KEY

# 4. Create MongoDB Atlas indexes (run ONCE)
npm run setup

# 5. (Optional) Create first admin user
npm run seed
# or: ADMIN_EMAIL=you@co.com ADMIN_PASSWORD=Secure123 npm run seed

# 6. Start dev server
npm run dev
# → http://localhost:5000
# → http://localhost:5000/health
```

---

## Environment Variables

Copy `.env.example` → `.env`. All variables with `*` are **required**.

| Variable | Default | Description |
|----------|---------|-------------|
| `MONGODB_URI` * | — | MongoDB Atlas connection string |
| `JWT_SECRET` * | — | Min 32 chars (`openssl rand -base64 48`) |
| `GEMINI_API_KEY` * | — | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `PORT` | `5000` | HTTP port |
| `NODE_ENV` | `development` | `development` or `production` |
| `ALLOWED_ORIGINS` | `http://localhost:3000` | Comma-separated CORS origins |
| `LLM_PROVIDER` | `gemini` | `gemini` or `groq` |
| `GROQ_API_KEY` | — | Required only if `LLM_PROVIDER=groq` |
| `SIMILARITY_THRESHOLD` | `0.70` | Anti-hallucination gate (0–1) |
| `TOP_K_RESULTS` | `5` | Final chunks sent to LLM |
| `RERANK_ENABLED` | `true` | LLM reranking pass |
| `CHUNK_SIZE` | `1000` | Characters per chunk |
| `CHUNK_OVERLAP` | `200` | Overlap between chunks |
| `CACHE_TTL` | `3600` | Query cache TTL (seconds) |
| `MAX_FILE_SIZE_MB` | `50` | Max PDF upload size |
| `LOG_LEVEL` | `debug` (dev) / `warn` (prod) | Winston log level |

---

## MongoDB Atlas Setup

### 1. Create a Free Cluster

1. [mongodb.com/atlas](https://www.mongodb.com/atlas) → New Project → Free M0 cluster
2. Create a database user with `readWriteAnyDatabase` role
3. Add your IP to **Network Access** (or `0.0.0.0/0` for Render/cloud)
4. Copy the connection string → `MONGODB_URI` in `.env`

### 2. Create Vector Search Index (automated)

```bash
npm run setup
```

This creates:
- `vector_index` — Atlas Vector Search on `chunks.embedding` (768-dim cosine)
- Text index on `chunks.text + documentName` for keyword search
- Supporting filter indexes

**Manual fallback** (if automated fails on free tier):

Atlas UI → Search → Create Search Index → JSON Editor:
```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    { "type": "filter", "path": "documentId" },
    { "type": "filter", "path": "tags" }
  ]
}
```
Index name: `vector_index`, Collection: `chunks`

---

## API Reference

All endpoints return `{ success, message, data, timestamp }`.  
Protected routes require `Authorization: Bearer <token>`.

### Auth

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/auth/register` | — | Register (first user = admin) |
| `POST` | `/api/auth/login` | — | Login → JWT token |
| `GET`  | `/api/auth/me` | ✅ | Current user profile |
| `POST` | `/api/auth/admin/create` | Admin | Create admin user |

### Documents

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/documents/upload` | ✅ | Upload PDF (multipart, field: `file`) |
| `GET`  | `/api/documents` | ✅ | List documents (users see own) |
| `GET`  | `/api/documents/:id` | ✅ | Document details + status |
| `DELETE` | `/api/documents/:id` | Admin | Delete doc + all embeddings |
| `POST` | `/api/documents/:id/reindex` | Admin | Re-embed document |
| `PATCH` | `/api/documents/:id/tags` | Admin | Update tags `{ tags: string[] }` |

### Query (RAG)

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/query` | ✅ | Standard JSON response |
| `POST` | `/api/query/stream` | ✅ | SSE streaming (always streams) |

Request body:
```json
{
  "query": "What is the onboarding process?",
  "documentId": "optional-doc-id",
  "tags": ["hr", "onboarding"],
  "stream": false,
  "rewriteQuery": true
}
```

SSE event types: `metadata` → `sources` → `chunk` (×N) → `done` | `error`

### Chats

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/chats/save` | ✅ | Save chat (see formats below) |
| `GET`  | `/api/chats` | ✅ | List user's chats |
| `GET`  | `/api/chats/:id` | ✅ | Full chat with messages |
| `DELETE` | `/api/chats/:id` | ✅ | Delete chat |
| `DELETE` | `/api/chats` | ✅ | Clear all chats |

**Save format A** (full messages):
```json
{
  "title": "Onboarding questions",
  "messages": [
    { "role": "user", "content": "What is the process?" },
    { "role": "assistant", "content": "The process is...", "sources": [] }
  ],
  "_id": "optional-existing-id"
}
```

**Save format B** (legacy pair):
```json
{
  "chatId": "optional-existing-id",
  "userMessage": "What is the process?",
  "assistantMessage": "The process is..."
}
```

### Admin (Admin role only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/admin/stats` | System stats |
| `GET`  | `/api/admin/analytics?days=30` | Full analytics report |
| `GET`  | `/api/admin/users` | All users |
| `PATCH` | `/api/admin/users/:id/toggle` | Toggle user active status |
| `POST` | `/api/admin/reindex` | Reindex all documents |
| `DELETE` | `/api/admin/cache` | Clear query cache |
| `GET`  | `/api/admin/failed-queries?days=7` | Unanswered queries |
| `GET`  | `/api/admin/documents` | All documents (all users) |

### Health

```
GET /health   → 200 { status: "healthy", database: "connected", ... }
```

---

## Scripts

```bash
npm run dev          # Start with nodemon hot-reload
npm run start        # Production start
npm run setup        # Create Atlas indexes (run once after deployment)
npm run seed         # Create admin user
npm run test         # Run Jest test suite
npm run test:ci      # CI mode with coverage
npm run docker:up    # docker compose up -d
npm run docker:logs  # Tail container logs
```

---

## Docker

```bash
# Build and start
cp .env.example .env    # Fill in secrets
docker compose up -d

# Logs
docker compose logs -f opsmind-ai-backend

# Run setup inside container
docker compose exec opsmind-ai-backend node scripts/create-vector-index.js

# Stop
docker compose down
```

---

## Deploy to Render

1. Push code to GitHub
2. Render Dashboard → New → Web Service → Connect repo
3. Build: `npm install`, Start: `node src/server.js`
4. Set env vars (see `render.yaml` for full list)
5. Add a **Disk** mount: `/app/uploads` (min 1GB)
6. After first deploy: run setup in Render shell:
   ```
   node scripts/create-vector-index.js
   ```

---

## RAG Pipeline

```
User query
  → sanitizeQuery()          Prompt injection prevention
  → cache.get()              Skip pipeline if cached
  → rewriteQuery()           LLM query expansion (optional)
  → generateQueryEmbedding() Gemini text-embedding-004
  → retrieveRelevantChunks()
      ├─ Vector search       Atlas $vectorSearch (cosine)
      ├─ Keyword search      MongoDB $text search
      ├─ RRF fusion          Reciprocal Rank Fusion (k=60)
      ├─ LLM reranking       Score 0-10, keep top-N
      └─ Threshold gate      Reject < SIMILARITY_THRESHOLD
  → buildCitations()         Deduplicate, sort by score
  → generateAnswer()         Anti-hallucination system prompt
  → logQuery()               Analytics (fire-and-forget)
  → cache.set()              Store for 30 min
```

### Tuning the pipeline

| Goal | Variable |
|------|----------|
| More permissive retrieval | Lower `SIMILARITY_THRESHOLD` (e.g. 0.60) |
| Fewer hallucinations | Raise `SIMILARITY_THRESHOLD` (e.g. 0.80) |
| More context to LLM | Raise `TOP_K_RESULTS` |
| Better semantic search | Keep `HYBRID_VECTOR_WEIGHT` high (0.70+) |
| Better exact-match | Raise `HYBRID_KEYWORD_WEIGHT` |

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| `MONGODB_URI is not set` | Missing env var | Fill `.env` |
| `MongoServerSelectionError` | IP not whitelisted | Atlas → Network Access → Add IP |
| `vector_index not found` | Index not created | Run `npm run setup` |
| `GEMINI_API_KEY invalid` | Wrong key | Check AI Studio |
| PDF `No text extracted` | Scanned/image PDF | Use OCR pre-processing |
| `Token expired` | JWT expired | Re-login |
| `429 Too Many Requests` | Rate limit hit | Slow down or adjust `RATE_LIMIT_MAX` |
