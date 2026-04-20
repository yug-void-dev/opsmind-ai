#!/usr/bin/env node
/**
 * OpsMind AI — Atlas Vector Search Index Setup Script
 *
 * Run ONCE after your first deployment to create the required
 * MongoDB Atlas Vector Search index and text index on the chunks collection.
 *
 * Usage:
 *   node scripts/create-vector-index.js
 *
 * Prerequisites:
 *   - MONGODB_URI set in .env or environment
 *   - The MongoDB user must have Atlas Search index create permissions
 *
 * What it creates:
 *   1. Vector search index "vector_index" on chunks.embedding (768 dims, cosine)
 *   2. Standard text index on chunks.text + documentName for keyword search
 *   3. Supporting filter indexes (documentId, tags)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI is not set. Copy .env.example → .env and fill it in.');
  process.exit(1);
}

// ─── Vector Index Definition ──────────────────────────────────────────────────
const VECTOR_INDEX_NAME = process.env.VECTOR_INDEX_NAME || 'vector_index';

const vectorIndexDefinition = {
  name: VECTOR_INDEX_NAME,
  type: 'vectorSearch',
  definition: {
    fields: [
      {
        type: 'vector',
        path: 'embedding',
        numDimensions: 3072, // gemini-embedding-001 → 3072 dims
        similarity: 'cosine',
      },
      {
        type: 'filter',
        path: 'documentId',
      },
      {
        type: 'filter',
        path: 'tags',
      },
    ],
  },
};

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   OpsMind AI — Vector Index Setup          ║');
  console.log('╚════════════════════════════════════════════╝\n');

  console.log('🔌 Connecting to MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  console.log('✅ Connected:', mongoose.connection.host);

  const db = mongoose.connection.db;
  const chunksCollection = db.collection('chunks');

  // ─── 1. Vector Search Index ─────────────────────────────────────────────────
  console.log('\n📐 Step 1: Creating Atlas Vector Search index...');
  try {
    const existingIndexes = await chunksCollection.listSearchIndexes().toArray();
    const vectorExists = existingIndexes.some((idx) => idx.name === VECTOR_INDEX_NAME);

    if (vectorExists) {
      console.log(`   ⚠️  Vector index "${VECTOR_INDEX_NAME}" already exists — skipping creation.`);
      console.log(`   ℹ️  If you need to update it, drop it in Atlas UI first.`);
    } else {
      await chunksCollection.createSearchIndex(vectorIndexDefinition);
      console.log(`   ✅ Vector index "${VECTOR_INDEX_NAME}" creation initiated.`);
      console.log(`   ℹ️  Atlas builds indexes asynchronously — it may take 1–5 minutes to become ACTIVE.`);
    }
  } catch (err) {
    if (err.message?.includes('already exists')) {
      console.log(`   ⚠️  Vector index "${VECTOR_INDEX_NAME}" already exists — skipping.`);
    } else if (err.message?.includes('not supported')) {
      // Fallback: Atlas free tier / some configs don't support programmatic index creation
      console.log('   ⚠️  Programmatic index creation not available for this cluster tier.');
      console.log('   📋 Create the index manually in Atlas UI:');
      console.log('      → Atlas → Search → Create Search Index → JSON Editor');
      console.log('      → Collection: chunks');
      console.log('      → Index name: vector_index');
      console.log('      → Definition:');
      console.log(JSON.stringify(vectorIndexDefinition.definition, null, 6));
    } else {
      throw err;
    }
  }

  // ─── 2. Text Index (Keyword Search) ─────────────────────────────────────────
  console.log('\n🔤 Step 2: Creating text index for keyword search...');
  try {
    await chunksCollection.createIndex(
      { text: 'text', documentName: 'text' },
      { name: 'chunks_text_search', background: true }
    );
    console.log('   ✅ Text index "chunks_text_search" created.');
  } catch (err) {
    if (err.code === 85 || err.message?.includes('already exists')) {
      console.log('   ⚠️  Text index already exists — skipping.');
    } else {
      throw err;
    }
  }

  // ─── 3. Supporting Indexes ───────────────────────────────────────────────────
  console.log('\n🗂️  Step 3: Creating supporting indexes...');
  const supportingIndexes = [
    { key: { documentId: 1 }, name: 'idx_documentId' },
    { key: { tags: 1 }, name: 'idx_tags' },
    { key: { documentId: 1, chunkIndex: 1 }, name: 'idx_doc_chunk' },
  ];

  for (const idx of supportingIndexes) {
    try {
      await chunksCollection.createIndex(idx.key, { name: idx.name, background: true });
      console.log(`   ✅ Index "${idx.name}" created.`);
    } catch (err) {
      if (err.code === 85 || err.message?.includes('already exists')) {
        console.log(`   ⚠️  Index "${idx.name}" already exists — skipping.`);
      } else {
        throw err;
      }
    }
  }

  // ─── 4. User Indexes ─────────────────────────────────────────────────────────
  console.log('\n👤 Step 4: Ensuring user collection indexes...');
  const usersCollection = db.collection('users');
  try {
    await usersCollection.createIndex({ email: 1 }, { unique: true, name: 'idx_email_unique' });
    console.log('   ✅ Users email index confirmed.');
  } catch (err) {
    if (err.code === 85 || err.message?.includes('already exists')) {
      console.log('   ⚠️  Users email index already exists — skipping.');
    } else {
      throw err;
    }
  }

  // ─── 5. Analytics Indexes ────────────────────────────────────────────────────
  console.log('\n📊 Step 5: Ensuring analytics collection indexes...');
  const analyticsCollection = db.collection('analytics');
  const analyticsIndexes = [
    { key: { eventType: 1, createdAt: -1 }, name: 'idx_event_time' },
    { key: { userId: 1, createdAt: -1 }, name: 'idx_user_time' },
    { key: { createdAt: -1 }, name: 'idx_created', expireAfterSeconds: 365 * 24 * 3600 }, // Auto-expire after 1 year
  ];
  for (const idx of analyticsIndexes) {
    try {
      const { key, name, ...opts } = idx;
      await analyticsCollection.createIndex(key, { name, background: true, ...opts });
      console.log(`   ✅ Analytics index "${name}" created.`);
    } catch (err) {
      if (err.code === 85 || err.message?.includes('already exists')) {
        console.log(`   ⚠️  Analytics index "${idx.name}" already exists — skipping.`);
      } else {
        throw err;
      }
    }
  }

  // ─── Summary ─────────────────────────────────────────────────────────────────
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   ✅  Index setup complete!                 ║');
  console.log('╠════════════════════════════════════════════╣');
  console.log('║  Next steps:                                ║');
  console.log('║  1. Wait for Atlas to build vector index    ║');
  console.log('║     (1-5 min, check Atlas UI → Search)      ║');
  console.log('║  2. Start the server: npm run dev           ║');
  console.log('║  3. Register first user (auto-admin)        ║');
  console.log('╚════════════════════════════════════════════╝\n');

  await mongoose.disconnect();
  process.exit(0);
}

main().catch((err) => {
  console.error('\n❌ Setup failed:', err.message);
  if (err.message?.includes('ENOTFOUND') || err.message?.includes('connect')) {
    console.error('   → Check your MONGODB_URI in .env');
    console.error('   → Ensure your IP is whitelisted in Atlas Network Access');
  }
  process.exit(1);
});
