/**
 * Governance log: the rules that make an entry trustworthy.
 *
 * Run from server/:
 *   node --import tsx --test tests/admin-audit.test.ts
 *
 * Two things are being proved here. First, that what gets written is safe and
 * complete: no credential ever lands in the log, and the actor is snapshotted
 * rather than joined. Second, that the log is actually append-only and actually
 * durable, which is checked against the source that would have to change for
 * that to stop being true.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// Resolved from this file, not process.cwd(): a test that only passes when run
// from server/ is a test that fails in CI from the repo root.
const SERVER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// src/config/env.ts exits the process when a required variable is missing, and
// the service imports the Prisma client, which needs a datasource URL.
process.env.DATABASE_URL ??= 'file:./dev.db';
process.env.JWT_ACCESS_SECRET ??= 'test-access-secret-0123456789abcdef';
process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret-0123456789abcdef';

const {
  AUDIT_ACTIONS,
  AUDIT_TARGET_TYPES,
  REDACTION_PLACEHOLDER,
  buildAuditRow,
  clampAuditPaging,
  normaliseAuditReason,
  redactAuditMetadata,
} = await import('../src/services/audit.service.js');

const SERVICE_SOURCE = readFileSync(join(SERVER_ROOT, 'src/services/audit.service.ts'), 'utf8');
const SQLITE_SCHEMA = readFileSync(join(SERVER_ROOT, 'prisma/schema.prisma'), 'utf8');
const POSTGRES_SCHEMA = readFileSync(join(SERVER_ROOT, 'prisma/schema.postgresql.prisma'), 'utf8');

const ACTOR = { id: 'admin_1', email: 'staff@zurilofts.com', role: 'ADMIN' };

// ---------------------------------------------------------------------------
// Redaction
// ---------------------------------------------------------------------------

test('credential-shaped metadata is redacted, not stored', () => {
  const redacted = redactAuditMetadata({
    password: 'hunter2',
    newPassword: 'hunter3',
    passwordHash: '$2a$12$abcdef',
    token: 'abc123',
    authorization: 'Bearer xyz',
    bankAccountNo: '0123456789',
    ipAddress: '127.0.0.1',
    previousStatus: 'PENDING_REVIEW',
  }) as Record<string, unknown>;

  assert.equal(redacted.password, REDACTION_PLACEHOLDER);
  assert.equal(redacted.newPassword, REDACTION_PLACEHOLDER);
  assert.equal(redacted.passwordHash, REDACTION_PLACEHOLDER);
  assert.equal(redacted.token, REDACTION_PLACEHOLDER);
  assert.equal(redacted.authorization, REDACTION_PLACEHOLDER);
  assert.equal(redacted.bankAccountNo, REDACTION_PLACEHOLDER);
  // The facts the log exists for survive untouched.
  assert.equal(redacted.ipAddress, '127.0.0.1');
  assert.equal(redacted.previousStatus, 'PENDING_REVIEW');
});

test('redaction sees through casing and punctuation', () => {
  const redacted = redactAuditMetadata({ 'Bank_Account-No': '1', PASSWORD_HASH: 'x', 'api-Key': 'k' }) as Record<string, unknown>;

  assert.equal(redacted['Bank_Account-No'], REDACTION_PLACEHOLDER);
  assert.equal(redacted.PASSWORD_HASH, REDACTION_PLACEHOLDER);
  assert.equal(redacted['api-Key'], REDACTION_PLACEHOLDER);
});

test('redaction reaches into nested objects and arrays', () => {
  const redacted = redactAuditMetadata({
    body: { user: { newPassword: 'hunter2', email: 'a@b.c' } },
    tags: [{ token: 'abc' }, 'plain'],
  }) as { body: { user: Record<string, unknown> }; tags: unknown[] };

  assert.equal(redacted.body.user.newPassword, REDACTION_PLACEHOLDER);
  assert.equal(redacted.body.user.email, 'a@b.c');
  assert.deepEqual(redacted.tags, [{ token: REDACTION_PLACEHOLDER }, 'plain']);
});

test('a large value is bounded rather than stored whole', () => {
  const long = 'x'.repeat(5000);
  assert.equal((redactAuditMetadata(long) as string).length, 503);
  // Depth stops runaway recursion on a self-referencing object.
  const deep: Record<string, unknown> = {};
  let cursor = deep;
  for (let i = 0; i < 8; i += 1) {
    cursor.next = {};
    cursor = cursor.next as Record<string, unknown>;
  }
  assert.doesNotThrow(() => redactAuditMetadata(deep));
});

test('redaction does not eat innocent keys that merely contain a short fragment', () => {
  // "iv" as a substring would have redacted delivery and activity, quietly
  // destroying the operational detail the log exists to keep.
  const redacted = redactAuditMetadata({
    deliveryStatus: 'sent',
    activity: 'review',
    relativePath: '/a/b',
  }) as Record<string, unknown>;

  assert.equal(redacted.deliveryStatus, 'sent');
  assert.equal(redacted.activity, 'review');
  assert.equal(redacted.relativePath, '/a/b');
});

test('an exact iv key is still redacted', () => {
  const redacted = redactAuditMetadata({ iv: 'aabbcc', tag: 'ff' }) as Record<string, unknown>;

  assert.equal(redacted.iv, REDACTION_PLACEHOLDER);
  assert.equal(redacted.tag, REDACTION_PLACEHOLDER);
});

// ---------------------------------------------------------------------------
// Reason and the row that is written
// ---------------------------------------------------------------------------

test('a reason is collapsed to one line and bounded', () => {
  assert.equal(normaliseAuditReason('  not   allowed \n on site  '), 'not allowed on site');
  assert.equal(normaliseAuditReason('   '), null);
  assert.equal(normaliseAuditReason(undefined), null);
  assert.equal(normaliseAuditReason('y'.repeat(1200))?.length, 1003);
});

test('the written row snapshots the actor instead of pointing at it', () => {
  const row = buildAuditRow({
    actor: ACTOR,
    action: 'LISTING_REJECTED',
    targetType: 'Listing',
    targetId: 'listing_1',
    targetLabel: 'Kilimani two-bed',
    reason: 'Main photo does not match the flat',
    metadata: { previousStatus: 'PENDING_REVIEW', nextStatus: 'REJECTED' },
  });

  // Email and role are copied, so the entry stays readable after the staff
  // account is erased and its id no longer resolves to anything.
  assert.equal(row.actorId, 'admin_1');
  assert.equal(row.actorEmail, 'staff@zurilofts.com');
  assert.equal(row.actorRole, 'ADMIN');
  assert.equal(row.targetLabel, 'Kilimani two-bed');
  assert.deepEqual(JSON.parse(row.metadataJson as string), {
    previousStatus: 'PENDING_REVIEW',
    nextStatus: 'REJECTED',
  });
});

test('a password in metadata never reaches the stored row', () => {
  const row = buildAuditRow({
    actor: ACTOR,
    action: 'USER_PASSWORD_SET',
    targetType: 'User',
    targetId: 'user_1',
    metadata: { newPassword: 'hunter2' },
  });

  assert.ok(!String(row.metadataJson).includes('hunter2'));
});

test('empty metadata is stored as null rather than an empty object', () => {
  const row = buildAuditRow({ actor: ACTOR, action: 'USER_RESTORED', targetType: 'User', targetId: 'u1' });

  assert.equal(row.metadataJson, null);
  assert.equal(row.reason, null);
  assert.equal(row.ipAddress, null);
});

test('a user agent is truncated so one client cannot bloat a row', () => {
  const row = buildAuditRow({
    actor: ACTOR,
    action: 'USER_SUSPENDED',
    targetType: 'User',
    targetId: 'u1',
    userAgent: 'z'.repeat(1000),
  });

  assert.equal(row.userAgent?.length, 300);
});

// ---------------------------------------------------------------------------
// Paging
// ---------------------------------------------------------------------------

test('paging cannot be used to request the whole log', () => {
  assert.deepEqual(clampAuditPaging({}), { page: 1, limit: 25, skip: 0 });
  assert.deepEqual(clampAuditPaging({ page: 3, limit: 10 }), { page: 3, limit: 10, skip: 20 });
  assert.deepEqual(clampAuditPaging({ limit: 100000 }), { page: 1, limit: 100, skip: 0 });
  assert.deepEqual(clampAuditPaging({ page: 0, limit: 0 }), { page: 1, limit: 25, skip: 0 });
  assert.deepEqual(clampAuditPaging({ page: -5, limit: -1 }), { page: 1, limit: 1, skip: 0 });
  assert.deepEqual(clampAuditPaging({ page: '2', limit: '5' }), { page: 2, limit: 5, skip: 5 });
});

// ---------------------------------------------------------------------------
// The vocabulary
// ---------------------------------------------------------------------------

test('the action vocabulary is closed and covers every decision class', () => {
  assert.equal(new Set(AUDIT_ACTIONS).size, AUDIT_ACTIONS.length);
  for (const required of [
    'LISTING_APPROVED',
    'LISTING_REJECTED',
    'LISTING_SUSPENDED',
    'HOST_APPLICATION_APPROVED',
    'HOST_APPLICATION_REJECTED',
    'USER_SUSPENDED',
    'USER_PASSWORD_SET',
    'USER_ERASED',
    'DISPUTE_RESOLVED',
  ]) {
    assert.ok((AUDIT_ACTIONS as readonly string[]).includes(required), `${required} must be in the vocabulary`);
  }
  assert.deepEqual([...AUDIT_TARGET_TYPES].sort(), ['Account', 'Dispute', 'HostApplication', 'Listing', 'User']);
});

// ---------------------------------------------------------------------------
// Append-only
// ---------------------------------------------------------------------------

test('the service exposes no way to rewrite or remove an entry', () => {
  // A governance log that an ordinary code path can edit is not evidence. The
  // guard is on the source, because that is the thing that would have to change.
  const mutating = [
    'adminAuditEvent.update(',
    'adminAuditEvent.updateMany(',
    'adminAuditEvent.delete(',
    'adminAuditEvent.deleteMany(',
    'adminAuditEvent.upsert(',
  ];

  for (const call of mutating) {
    assert.equal(SERVICE_SOURCE.includes(call), false, `audit.service.ts must not call ${call}`);
  }
  assert.ok(SERVICE_SOURCE.includes('adminAuditEvent.create('), 'the log is written with create');
  assert.ok(SERVICE_SOURCE.includes('adminAuditEvent.findMany('), 'the log is read with findMany');
});

// ---------------------------------------------------------------------------
// Durable across deletion
// ---------------------------------------------------------------------------

function modelBlock(schema: string, name: string): string {
  const match = schema.match(new RegExp(`model ${name} \\{[\\s\\S]*?\\n\\}`));
  assert.ok(match, `${name} must exist in the schema`);
  return match![0];
}

test('the log declares no relation, so no cascade can take an entry with it', () => {
  const sqlite = modelBlock(SQLITE_SCHEMA, 'AdminAuditEvent');
  const postgres = modelBlock(POSTGRES_SCHEMA, 'AdminAuditEvent');

  for (const block of [sqlite, postgres]) {
    assert.equal(block.includes('@relation'), false, 'a foreign key would reintroduce a cascade');
    assert.equal(block.includes('onDelete'), false);
    // The columns that make an entry readable on its own.
    for (const column of ['actorId', 'actorEmail', 'actorRole', 'action', 'targetType', 'targetId', 'targetLabel', 'reason', 'metadataJson', 'createdAt']) {
      assert.ok(block.includes(column), `AdminAuditEvent must declare ${column}`);
    }
  }
});

test('both schema files declare the same log fields, in the same order', () => {
  const fields = (schema: string): string[] =>
    modelBlock(schema, 'AdminAuditEvent')
      .split('\n')
      .slice(1)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('//') && !line.startsWith('@@') && line !== '}')
      .map((line) => line.split(/\s+/)[0]);

  assert.deepEqual(fields(SQLITE_SCHEMA), fields(POSTGRES_SCHEMA));
});
