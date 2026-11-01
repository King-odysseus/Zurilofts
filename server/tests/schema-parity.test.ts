/**
 * Run from server/:
 *   node --import tsx --test tests/schema-parity.test.ts
 *
 * The repository keeps two Prisma schemas: schema.prisma for the local SQLite
 * database and schema.postgresql.prisma for the deployed Postgres one. Only the
 * Postgres file is used to generate the client that production actually runs, so
 * a field added to the SQLite schema alone compiles here and then throws
 * "Unknown argument" at runtime on every query that sends it. That is exactly how
 * the host application payout fields stopped saving in production.
 *
 * Field NAMES must match. Field TYPES may differ on purpose: Postgres uses real
 * enums where SQLite can only store strings.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const prismaDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'prisma');

function readModels(fileName: string) {
  const text = readFileSync(join(prismaDir, fileName), 'utf8');
  const models = new Map<string, string[]>();
  for (const match of text.matchAll(/^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm)) {
    const [, name, body] = match;
    const fields: string[] = [];
    for (const rawLine of body.split('\n')) {
      // Drop trailing comments, block attributes (@@index) and blank lines.
      const line = (rawLine.split('//')[0] ?? '').trim();
      if (!line || line.startsWith('@@')) continue;
      const [field] = line.split(/\s+/);
      if (field) fields.push(field);
    }
    models.set(name, fields);
  }
  return models;
}

test('every model in the SQLite schema also exists in the Postgres schema', () => {
  const sqlite = readModels('schema.prisma');
  const postgres = readModels('schema.postgresql.prisma');

  const missingModels = [...sqlite.keys()].filter((model) => !postgres.has(model));
  assert.deepEqual(missingModels, [], `models missing from schema.postgresql.prisma: ${missingModels.join(', ')}`);
});

test('every model field in the SQLite schema exists in the Postgres schema', () => {
  const sqlite = readModels('schema.prisma');
  const postgres = readModels('schema.postgresql.prisma');

  const missingFields: string[] = [];
  for (const [model, sqliteFields] of sqlite) {
    const postgresFields = new Set(postgres.get(model) ?? []);
    for (const field of sqliteFields) {
      if (!postgresFields.has(field)) missingFields.push(`${model}.${field}`);
    }
  }

  assert.deepEqual(
    missingFields,
    [],
    `add these to schema.postgresql.prisma or production fails at runtime: ${missingFields.join(', ')}`,
  );
});

test('the Postgres schema adds no field the SQLite one lacks', () => {
  const sqlite = readModels('schema.prisma');
  const postgres = readModels('schema.postgresql.prisma');

  const extraFields: string[] = [];
  for (const [model, postgresFields] of postgres) {
    const sqliteFields = new Set(sqlite.get(model) ?? []);
    for (const field of postgresFields) {
      if (!sqliteFields.has(field)) extraFields.push(`${model}.${field}`);
    }
  }

  assert.deepEqual(
    extraFields,
    [],
    `these exist only for Postgres, so local tests never see them: ${extraFields.join(', ')}`,
  );
});
