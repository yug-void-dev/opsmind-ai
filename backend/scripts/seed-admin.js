#!/usr/bin/env node
/**
 * OpsMind AI — Admin Seeder
 *
 * Creates the first admin user if none exists.
 * Safe to run multiple times (idempotent).
 *
 * Usage:
 *   ADMIN_EMAIL=admin@company.com ADMIN_PASSWORD=MySecurePass123 node scripts/seed-admin.js
 *   # OR set in .env and run: node scripts/seed-admin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI not set');
  process.exit(1);
}

const adminEmail = process.env.ADMIN_EMAIL || 'admin@opsmind.ai';
const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@12345';
const adminName = process.env.ADMIN_NAME || 'OpsMind Admin';

async function main() {
  console.log('\n🌱 OpsMind AI — Admin Seeder\n');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 10000 });

  const User = require('../src/models/User');

  const existing = await User.findOne({ email: adminEmail });
  if (existing) {
    console.log(`✅ Admin user already exists: ${adminEmail} [role: ${existing.role}]`);
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save({ validateBeforeSave: false });
      console.log('   → Role upgraded to admin');
    }
  } else {
    await User.create({
      name: adminName,
      email: adminEmail,
      password: adminPassword, // Model pre-save hook handles hashing
      role: 'admin',
    });
    console.log(`✅ Admin user created: ${adminEmail}`);
    console.log(`   Password: ${adminPassword}`);
    console.log('   ⚠️  Change this password immediately after first login!');
  }

  await mongoose.disconnect();
  console.log('\nDone.\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err.message);
  process.exit(1);
});
