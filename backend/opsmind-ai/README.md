# OpsMind AI — Enterprise SOP Knowledge Agent

A production-ready RAG (Retrieval Augmented Generation) backend for querying Standard Operating Procedure documents using natural language.

---

## Architecture

```
PDF Upload → Text Extraction → Chunking → Embedding → MongoDB Atlas (Vector Store)
                                                              ↓
User Query → Query Rewriting → Embedding → Vector + Keyword Search → Top-K Chunks
                                                              ↓
                                              LLM (Gemini / Llama3) → Structured Answer + Citations
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20 + Express.js |
| Database | MongoDB Atlas (Vector Search) |
| Embeddings | Google Gemini `text-embedding-004` (768d) |
| LLM | Gemini 1.5 Flash or Groq Llama-3 70B |
| Auth | JWT (RS256) |
| File Upload | Multer |
| PDF Parsing | pdf-parse |
| Caching | node-cache (in-memory) |
| Logging | Winston |
| Validation | Joi |
| Testing | Jest + Supertest |
| Deployment | Docker / Render / Railway |

---

## Project Structure

```
opsmind-ai/
├── src/
│   ├── config/
│   │   ├── database.js          # MongoDB Atlas connection
│   │   └── appConfig.js         # App-wide settings & system prompt
│   ├── controllers/
│   │   ├── authController.js    # Register / Login / Me
│   │   ├── documentController.js # Upload / List / Delete / Reindex
│   │   ├── queryController.js   # RAG query + SSE streaming
│   │   ├── chatController.js    # Chat session management
│   │   └── adminController.js   # Analytics / User mgmt / Cache
│   ├── middlewares/
│   │   ├── auth.js              # JWT authenticate + RBAC authorize
│   │   ├── upload.js            # Multer PDF-only upload
│   │   ├── validate.js          # Joi request validation
│   │   └── errorHandler.js      # Global error + 404 handler
│   ├── models/
│   │   ├── User.js              # User schema (bcrypt password)
│   │   ├── Document.js          # SOP file metadata
│   │   ├── Chunk.js             # Text chunks + vector embeddings
│   │   ├── Chat.js              # Chat session + messages
│   │   └── Analytics.js         # Query / usage events
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── documentRoutes.js
│   │   ├── queryRoutes.js
│   │   ├── chatRoutes.js
│   │   └── adminRoutes.js
│   ├── services/
│   │   ├── pdfService.js        # PDF text extraction
│   │   ├── embeddingService.js  # Gemini embedding generation
│   │   ├── llmService.js        # Gemini Flash / Groq Llama3
│   │   ├── retrievalService.js  # Hybrid vector + keyword search
│   │   └── analyticsService.js  # Event logging + metrics
│   ├── utils/
│   │   ├── chunker.js           # Text chunking with overlap
│   │   ├── sanitizer.js         # Prompt injection prevention
│   │   ├── cache.js             # Query result caching
│   │   ├── apiResponse.js       # Standardized response helpers
│   │   └── logger.js            # Winston logger
│   ├── app.js                   # Express app setup
│   └── server.js                # Entry point + graceful shutdown
├── __tests__/
│   ├── chunker.test.js
│   ├── sanitizer.test.js
│   └── api.test.js
├── uploads/                     # Uploaded PDFs (gitignored)
├── logs/                        # Log files (gitignored)
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── render.yaml
└── package.json
```

---

## Quick Start

### 1. Clone & Install

```bash
git clone <repo>
cd opsmind-ai
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your keys
```

### 3. Set Up MongoDB Atlas Vector Index

In MongoDB Atlas UI → your cluster → **Search** → **Create Search Index** → **JSON Editor**:

- **Index Name**: `vector_index`
- **Collection**: `chunks`
- **Definition**:

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

### 4. Run Development Server

```bash
npm run dev
```

### 5. Run with Docker

```bash
docker-compose up --build
```

---

## API Reference

### Authentication

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/auth/register` | Register new user | Public |
| POST | `/api/auth/login` | Login → JWT token | Public |
| GET | `/api/auth/me` | Get current user | User |
| POST | `/api/auth/admin/create` | Create admin user | Admin |

### Documents

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/documents/upload` | Upload PDF (multipart/form-data: `file`) | User |
| GET | `/api/documents` | List documents | User |
| GET | `/api/documents/:id` | Get document details | User |
| DELETE | `/api/documents/:id` | Delete document + chunks | Admin |
| POST | `/api/documents/:id/reindex` | Re-embed document | Admin |
| PATCH | `/api/documents/:id/tags` | Update document tags | Admin |

### Query (RAG)

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/query` | Standard RAG query | User |
| POST | `/api/query/stream` | Streaming SSE query | User |

**Request body:**
```json
{
  "query": "What is the employee leave policy?",
  "documentId": "optional-doc-id",
  "tags": ["hr", "policy"],
  "stream": false,
  "rewriteQuery": true
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "answer": "Employees are entitled to 20 days of annual leave...",
    "sources": [
      { "documentName": "HR-Policy-2024.pdf", "pageNumber": 7, "relevanceScore": 0.9231 }
    ],
    "chunksRetrieved": 4,
    "responseTimeMs": 1240
  }
}
```

### Chat

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/chats/save` | Save/continue chat session | User |
| GET | `/api/chats` | List all chat sessions | User |
| GET | `/api/chats/:id` | Get chat with messages | User |
| DELETE | `/api/chats/:id` | Delete chat session | User |
| DELETE | `/api/chats` | Clear all chats | User |

### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/stats` | System stats | Admin |
| GET | `/api/admin/analytics` | Query analytics | Admin |
| GET | `/api/admin/users` | List all users | Admin |
| PATCH | `/api/admin/users/:id/toggle` | Activate/deactivate user | Admin |
| POST | `/api/admin/reindex` | Reindex all documents | Admin |
| DELETE | `/api/admin/cache` | Clear query cache | Admin |
| GET | `/api/admin/failed-queries` | View unanswered queries | Admin |

---

## Key Design Decisions

### Anti-Hallucination
- **Similarity threshold** (default 0.75): if no chunk scores above this, returns `"I don't know based on the provided documents."`
- **Strict system prompt**: LLM is instructed to answer ONLY from provided context
- **Temperature 0.1**: minimizes creative/fabricated responses

### Hybrid Search
Combines **vector similarity** (semantic meaning) + **MongoDB text search** (keyword matching) using **Reciprocal Rank Fusion (RRF)**, giving 70% weight to vector and 30% to keyword results.

### Query Rewriting
Before embedding, the user query is rewritten by the LLM to be more specific and retrieval-friendly (can be disabled per request with `"rewriteQuery": false`).

### Async Upload Pipeline
PDF uploads return `202 Accepted` immediately. Embedding generation runs in the background, updating document `status` from `processing` → `ready` (or `failed`).

### Streaming (SSE)
Query responses support Server-Sent Events. The client receives:
1. `{ type: "sources", sources: [...] }` — citations first
2. `{ type: "chunk", content: "..." }` — LLM tokens as they stream
3. `{ type: "done", answer: "..." }` — full answer on completion

---

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB Atlas connection string | — |
| `JWT_SECRET` | JWT signing secret (min 32 chars) | — |
| `LLM_PROVIDER` | `gemini` or `groq` | `gemini` |
| `GEMINI_API_KEY` | Google AI Studio API key | — |
| `GROQ_API_KEY` | Groq API key (for Llama3) | — |
| `SIMILARITY_THRESHOLD` | Min cosine score for chunks | `0.75` |
| `TOP_K_RESULTS` | Max chunks to retrieve | `5` |
| `CHUNK_SIZE` | Chars per chunk | `1000` |
| `CHUNK_OVERLAP` | Overlap between chunks | `200` |
| `MAX_FILE_SIZE_MB` | Max PDF upload size | `50` |
| `CACHE_TTL` | Cache TTL in seconds | `3600` |

---

## Running Tests

```bash
# Unit tests only (no DB needed)
npm test -- --testPathPattern="chunker|sanitizer"

# All tests (requires TEST_MONGODB_URI in env)
TEST_MONGODB_URI=mongodb://... npm test
```

---

## Deployment

### Render
1. Push to GitHub
2. New Web Service → connect repo
3. Set all env vars from `.env.example`
4. Deploy

### Railway
```bash
railway login
railway init
railway up
```

### Docker
```bash
docker build -t opsmind-ai .
docker run -p 5000:5000 --env-file .env opsmind-ai
```
