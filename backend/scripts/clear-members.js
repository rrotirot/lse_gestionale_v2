/**
 * Clear members data from MongoDB.
 *
 * Safe by default: requires --yes to actually delete.
 *
 * Usage:
 *   node scripts/clear-members.js --yes
 *   node scripts/clear-members.js --yes --include-deleted
 *
 * Options:
 *   --yes              Required. Without it, runs in dry-run mode.
 *   --include-deleted  Also clears DeletedMember collection.
 *
 * Requires:
 *   MONGODB_URI in environment or backend/.env
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Member = require('../models/Member');
const DeletedMember = require('../models/DeletedMember');

function hasFlag(flag) {
  return process.argv.includes(flag);
}

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/lse-members';
  const doIt = hasFlag('--yes');
  const includeDeleted = hasFlag('--include-deleted');

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });

  const membersCount = await Member.countDocuments({});
  const deletedCount = includeDeleted ? await DeletedMember.countDocuments({}) : 0;

  console.log(`🔎 MongoDB: ${uri}`);
  console.log(`📦 Member documents: ${membersCount}`);
  if (includeDeleted) console.log(`🗑️  DeletedMember documents: ${deletedCount}`);

  if (!doIt) {
    console.log('ℹ️ Dry-run. Re-run with --yes to actually delete.');
    await mongoose.disconnect();
    return;
  }

  const r1 = await Member.deleteMany({});
  console.log(`✅ Cleared Member: deleted ${r1.deletedCount}`);

  if (includeDeleted) {
    const r2 = await DeletedMember.deleteMany({});
    console.log(`✅ Cleared DeletedMember: deleted ${r2.deletedCount}`);
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('❌ clear-members failed:', err);
  process.exit(1);
});

