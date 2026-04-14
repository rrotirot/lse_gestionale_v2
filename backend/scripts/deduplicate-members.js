/**
 * Deduplicate members collection.
 *
 * Strategy:
 * - Prefer dedupe by non-empty `id` (Discord ID).
 * - If `id` missing, dedupe by `key`.
 * - Keep the newest by `updatedAt` (fallback `createdAt`).
 *
 * Run:
 *   node scripts/deduplicate-members.js
 *
 * Requires:
 *   MONGODB_URI in environment or .env
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('../models/Member');

function sortByRecencyDesc(a, b) {
  const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
  const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
  return bTime - aTime;
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lse-members';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const members = await Member.find({}).lean();
  const byId = new Map();
  const byKey = new Map();

  for (const m of members) {
    const id = String(m.id || '').trim();
    if (id) {
      if (!byId.has(id)) byId.set(id, []);
      byId.get(id).push(m);
      continue;
    }
    const key = m.key;
    if (Number.isFinite(key)) {
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(m);
    }
  }

  const deletions = [];

  for (const [id, group] of byId.entries()) {
    if (group.length <= 1) continue;
    group.sort(sortByRecencyDesc);
    const keep = group[0];
    const drop = group.slice(1);
    drop.forEach(d => deletions.push({ _id: d._id, reason: `duplicate id=${id} keep=${keep._id}` }));
  }

  for (const [key, group] of byKey.entries()) {
    if (group.length <= 1) continue;
    group.sort(sortByRecencyDesc);
    const keep = group[0];
    const drop = group.slice(1);
    drop.forEach(d => deletions.push({ _id: d._id, reason: `duplicate key=${key} keep=${keep._id}` }));
  }

  if (deletions.length === 0) {
    console.log('✅ No duplicates found.');
    await mongoose.disconnect();
    return;
  }

  console.log(`🔎 Found ${deletions.length} duplicate documents to delete...`);
  const idsToDelete = deletions.map(d => d._id);
  const result = await Member.deleteMany({ _id: { $in: idsToDelete } });
  console.log(`🧹 Deleted ${result.deletedCount} duplicate documents.`);

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('❌ Deduplication failed:', err);
  process.exit(1);
});

