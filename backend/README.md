# OpsMind AI v2 — Enterprise SOP Knowledge Agent

> Production-grade RAG backend with advanced hybrid retrieval, LLM re-ranking, multi-stage anti-hallucination, and real-time SSE streaming.

---

## Architecture — Advanced RAG Pipeline

```
╔══════════════════════════════════════════════════════════════════╗
║                    INGESTION PIPELINE                            ║
║                                                                  ║
║  PDF Upload → Page Extraction → Sentence-Aware Chunking         ║
║            → Deduplication → Gemini Embeddings (768d)           ║
║            → MongoDB Atlas (Vector + Text Index)                 ║
╠══════════════════════════════════════════════════════════════════╣
║                    QUERY PIPELINE (9 stages)                     ║
║                                                                  ║
║  1. Sanitize    → Prompt injection detection (20+ patterns)      ║
║  2. Rewrite     → LLM rewrites query for retrieval               ║
║  3. Embed       → RETRIEVAL_QUERY task type embedding            ║
║  4. Vector      → Atlas $vectorSearch (ANN, 100 candidates)      ║
║  5. Keyword     → MongoDB $text (BM25-style)                     ║
║  6. RRF Fusion  → Reciprocal Rank Fusion (70/30 weight)          ║
║  7. LLM Rerank  → Cross-encoder-style relevance scoring          ║
║  8. Threshold   → Cosine similarity gate (default: 0.70)         ║
║  9. Generate    → Gemini Flash / Groq Llama3 + strict prompt     ║
╠══════════════════════════════════════════════════════════════════╣
║                    ANTI-HALLUCINATION SYSTEM                     ║
║                                                                  ║
║  • Temperature 0.05 — near-deterministic output                  ║
║  • 6-rule system prompt — context-only enforcement               ║
║  • Similarity threshold gate — "I don't know" fallback           ║
║  • Mandatory inline citations [Source: doc, Page N]              ║
║  • Confidence scoring: HIGH / MEDIUM / LOW                       ║
║  • Prompt injection prevention at input layer                    ║
╚══════════════════════════════════════════════════════════════════╝
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 + Express.js |
| Database | MongoDB Atlas (Vector Search + Text Index) |
| Embeddings | Gemini `text-embedding-004` (768 dims, RETRIEVAL_QUERY/DOCUMENT) |
| LLM | Gemini 1.5 Flash **or** Groq Llama-3 70B |
| Auth | JWT (bcrypt passwords, RBAC) |
| Upload | Multer + magic-bytes PDF validation |
| PDF | pdf-parse with position-aware multi-column extraction |
| Cache | node-cache (30-min query result cache) |
| Logging | Winston (file + console, structured JSON) |
| Validation | Joi schemas + custom sanitizer |
| Testing | Jest + Supertest (89 tests) |
| Deploy | Docker + Render/Railway configs |

---

## Project Structure

```
opsmind-ai/
├── src/
│   ├── config/
│   │   ├── appConfig.js          ← All RAG params + 4 prompt templates
│   │   └── database.js           ← MongoDB Atlas connection
│   ├── controllers/
│   │   ├── authController.js     ← Register / Login / Me
│   │   ├── documentController.js ← Upload / List / Delete / Reindex
│   │   ├── queryController.js    ← 9-stage RAG orchestrator + SSE
│   │   ├── chatController.js     ← Chat session CRUD
│   │   └── adminController.js    ← Analytics / Users / Cache / ReindexAll
│   ├── middlewares/
│   │   ├── auth.js               ← JWT authenticate + RBAC authorize
│   │   ├── upload.js             ← Multer + magic-bytes validator
│   │   ├── validate.js           ← Joi request schemas
│   │   └── errorHandler.js       ← Global error + 404
│   ├── models/
│   │   ├── User.js               ← bcrypt hashed passwords, roles
│   │   ├── Document.js           ← PDF metadata + processing status
│   │   ├── Chunk.js              ← Text + 768-dim embedding vectors
│   │   ├── Chat.js               ← Session + messages with citations
│   │   └── Analytics.js          ← Full pipeline telemetry per query
│   ├── routes/
│   │   └── [auth|document|query|chat|admin]Routes.js
│   ├── services/
│   │   ├── pdfService.js         ← Position-aware extraction, dedup
│   │   ├── embeddingService.js   ← Gemini embeddings + retry logic
│   │   ├── retrievalService.js   ← Vector + Keyword + RRF + LLM rerank
│   │   ├── llmService.js         ← Gemini/Groq + 4-template prompts
│   │   └── analyticsService.js   ← 6 aggregation pipelines
│   ├── utils/
│   │   ├── chunker.js            ← Sentence-aware chunking + dedup
│   │   ├── sanitizer.js          ← 20+ injection patterns + XSS
│   │   ├── cache.js              ← Query result cache
│   │   ├── apiResponse.js        ← Standardized responses
│   │   └── logger.js             ← Winston structured logger
│   ├── app.js                    ← Express + security middleware
│   └── server.js                 ← Entry + graceful shutdown
├── __tests__/
│   ├── chunker.test.js           ← 25 tests
│   ├── sanitizer.test.js         ← 40 tests (all injection patterns)
│   ├── retrieval.test.js         ← 16 tests (RRF + threshold)
│   └── api.test.js               ← 28 integration tests
├── .env.example                  ← All variables documented
├── Dockerfile                    ← Multi-stage, non-root user
├── docker-compose.yml
└── render.yaml
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo-url>
cd opsmind-ai
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set at minimum:
- `MONGODB_URI` — your Atlas connection string
- `GEMINI_API_KEY` — from [Google AI Studio](https://aistudio.google.com/app/apikey)
- `JWT_SECRET` — minimum 32 characters

### 3. Create MongoDB Atlas Vector Index

In Atlas UI → your cluster → **Atlas Search** → **Create Search Index** → **JSON Editor**:

**Index Name:** `vector_index`  
**Collection:** `chunks`

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "documentId"
    },
    {
      "type": "filter",
      "path": "tags"
    }
  ]
}
```

Also create the text index for keyword search (run in Atlas shell or Compass):

```js
db.chunks.createIndex({ text: "text", documentName: "text" })
```

### 4. Run

```bash
# Development
npm run dev

# Production
npm start

# Docker
docker-compose up --build
```

---

## API Reference

### Authentication

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Register user |
| POST | `/api/auth/login` | Public | Login → JWT |
| GET | `/api/auth/me` | User | Current user info |
| POST | `/api/auth/admin/create` | Admin | Create admin user |

### Documents

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/documents/upload` | User | Upload PDF (async pipeline) |
| GET | `/api/documents` | User | List documents |
| GET | `/api/documents/:id` | User | Document details + status |
| DELETE | `/api/documents/:id` | Admin | Delete doc + ALL embeddings |
| POST | `/api/documents/:id/reindex` | Admin | Re-embed without re-upload |
| PATCH | `/api/documents/:id/tags` | Admin | Update tags + propagate to chunks |

**Upload example:**
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -H "Authorization: Bearer <token>" \
  -F "file=@/path/to/sop.pdf" \
  -F "tags=hr,policy,2024"
```

**Response (202):**
```json
{
  "data": {
    "documentId": "abc123",
    "status": "processing",
    "statusEndpoint": "/api/documents/abc123"
  }
}
```

### Query (RAG)

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/query` | User | Full 9-stage RAG query |
| POST | `/api/query/stream` | User | Same but SSE streaming |

**Request:**
```json
{
  "query": "What is the employee annual leave entitlement?",
  "documentId": "optional-filter-by-doc",
  "tags": ["hr"],
  "stream": false,
  "rewriteQuery": true
}
```

**Standard Response:**
```json
{
  "data": {
    "answer": "Employees are entitled to 20 days annual leave per year [Source: HR Policy 2024, Page 12].\n\nConfidence: HIGH — Directly stated in the policy document.",
    "sources": [
      {
        "documentName": "HR-Policy-2024.pdf",
        "pageNumber": 12,
        "snippet": "All full-time employees are entitled to 20 working days of annual leave...",
        "relevanceScore": 0.9231,
        "confidence": "HIGH",
        "rerankReason": "directly answers leave entitlement"
      }
    ],
    "answered": true,
    "chunksRetrieved": 4,
    "queryRewritten": "employee annual leave entitlement days HR policy",
    "responseTimeMs": 1842,
    "tokenUsage": { "promptTokens": 1240, "completionTokens": 87, "totalTokens": 1327 },
    "retrievalDebug": {
      "stages": { "vector": 10, "keyword": 8, "afterRRF": 10, "afterRerank": 5, "afterThreshold": 4 },
      "threshold": 0.70
    }
  }
}
```

**Anti-Hallucination Response (no relevant docs):**
```json
{
  "data": {
    "answer": "I don't know based on the provided SOP documents.",
    "sources": [],
    "answered": false,
    "chunksRetrieved": 0
  }
}
```

**SSE Streaming events (in order):**
```
data: {"type":"metadata","queryRewritten":"...","chunksRetrieved":4}

data: {"type":"sources","sources":[{"documentName":"...","pageNumber":12,...}]}

data: {"type":"chunk","content":"Employees are "}
data: {"type":"chunk","content":"entitled to 20 "}
data: {"type":"chunk","content":"days annual leave..."}

data: {"type":"done","answer":"Full answer here...","answered":true,"responseTimeMs":1240}
```

### Chat

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| POST | `/api/chats/save` | User | Save message pair to session |
| GET | `/api/chats` | User | List sessions (paginated) |
| GET | `/api/chats/:id` | User | Full chat with messages |
| DELETE | `/api/chats/:id` | User | Soft-delete session |
| DELETE | `/api/chats` | User | Clear all sessions |

### Admin

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/api/admin/stats` | Admin | System-wide counts |
| GET | `/api/admin/analytics?days=30` | Admin | Full metrics report |
| GET | `/api/admin/failed-queries` | Admin | Unanswered / errored queries |
| GET | `/api/admin/users` | Admin | All users |
| GET | `/api/admin/documents` | Admin | All documents |
| PATCH | `/api/admin/users/:id/toggle` | Admin | Activate/deactivate user |
| POST | `/api/admin/reindex` | Admin | Re-embed all documents |
| DELETE | `/api/admin/cache` | Admin | Flush query cache |

**Analytics response includes:**
- Answer rate (answered / total queries)
- P95 response time
- Per-stage retrieval pipeline averages
- Token usage summary
- Daily volume breakdown
- Top unanswered queries (corpus gaps)

---

## RAG Pipeline Deep Dive

### Stage 4 — Vector Search
Uses MongoDB Atlas `$vectorSearch` with `RETRIEVAL_QUERY`-typed embeddings (asymmetric retrieval). `numCandidates: 100` ensures high recall before re-ranking.

### Stage 5 — Keyword Search
MongoDB `$text` index provides BM25-style exact keyword matching. Catches product codes, names, and abbreviations that semantic search may miss.

### Stage 6 — RRF Fusion
```
score(chunk) = (1/(k + vector_rank)) × 0.70 + (1/(k + keyword_rank)) × 0.30
```
`k=60` (standard constant). Chunks appearing in both lists get score from both terms. Results deduplicated by chunk ID.

### Stage 7 — LLM Re-Ranking
Each candidate is scored 0–10 by the LLM via a compact relevance prompt. Normalized to 0–1. This is equivalent to a cross-encoder and significantly improves precision.

### Stage 8 — Threshold Gate
```
accepted = vectorScore >= SIMILARITY_THRESHOLD (default 0.70)
```
If **zero** chunks pass → returns `"I don't know based on the provided SOP documents."` — never hallucinates.

---

## Anti-Hallucination Mechanisms

| Mechanism | Where | Effect |
|---|---|---|
| Temperature = 0.05 | LLM generation | Near-deterministic, minimal creativity |
| 6-rule system prompt | Every query | Context-only enforcement at prompt level |
| Similarity threshold gate | Stage 8 | Hard block when no relevant context found |
| Mandatory citations | System prompt Rule 4 | Every claim must cite source + page |
| Confidence scoring | System prompt Rule 5 | HIGH / MEDIUM / LOW with reason |
| Prompt injection detection | Stage 1 | 20+ patterns blocked before embedding |
| RETRIEVAL_QUERY embedding | Stage 3 | Asymmetric search (better query-doc matching) |

---

## Running Tests

```bash
# All unit tests (no DB or API keys needed)
npm test -- --testPathPattern="chunker|sanitizer|retrieval"

# Full suite with integration tests
TEST_MONGODB_URI=mongodb://... npm test

# With coverage
npm test -- --coverage
```

**Test breakdown:**
- `chunker.test.js` — 25 tests: sentence splitting, overlap, deduplication, edge cases
- `sanitizer.test.js` — 40 tests: all 20 injection patterns + XSS, filenames, tags
- `retrieval.test.js` — 16 tests: RRF logic, threshold gate, empty-list handling
- `api.test.js` — 28 integration tests: auth, RBAC, upload validation, anti-hallucination

---

## Deployment

### Render
```bash
# 1. Push to GitHub
# 2. New Web Service → connect repo → use render.yaml
# 3. Set env vars in Render dashboard
```

### Docker
```bash
docker-compose up --build -d
docker logs opsmind-ai-backend -f
```

### Railway
```bash
railway login && railway init && railway up
```

---

## Environment Variables (Key Ones)

| Variable | Description | Default |
|---|---|---|
| `MONGODB_URI` | Atlas connection string | **required** |
| `GEMINI_API_KEY` | Google AI Studio key | **required** |
| `JWT_SECRET` | Min 32 chars | **required** |
| `LLM_PROVIDER` | `gemini` or `groq` | `gemini` |
| `SIMILARITY_THRESHOLD` | Anti-hallucination gate | `0.70` |
| `RERANK_ENABLED` | LLM re-ranking toggle | `true` |
| `CHUNK_SIZE` | Chars per chunk | `1000` |
| `CHUNK_OVERLAP` | Overlap chars | `200` |
| `LLM_TEMPERATURE` | Generation temperature | `0.05` |
| `HYBRID_VECTOR_WEIGHT` | Vector weight in RRF | `0.70` |

See `.env.example` for the full list with descriptions.
