import crypto from 'crypto';
import { z } from 'zod';
import prisma from '../config/prisma.js';
import { company } from '../config/company.js';
import { NotFoundError, ValidationError } from '../types/index.js';

/**
 * Personal-data incident register.
 *
 * Kenyan data protection guidance expects a controller to tell the Office of the
 * Data Protection Commissioner about a breach that risks people's rights within
 * 72 hours of becoming aware of it, and to explain any delay. The clock starts
 * when the company became aware, which only a person can state, so staff enter
 * it. Everything below that is arithmetic and is kept pure so it is tested
 * without a database (tests/incident.test.ts).
 *
 * The register never stores the personal data of the people affected, only a
 * description and a count: a breach record that is itself a second copy of the
 * leaked data would make the incident worse.
 */

export const NOTIFICATION_WINDOW_HOURS = 72;
const HOUR_MS = 60 * 60 * 1000;
/** Clock-skew allowance when a staff member enters "now" from their own device. */
const FUTURE_TOLERANCE_MS = 5 * 60 * 1000;

export const INCIDENT_STATUSES = ['OPEN', 'REGULATOR_NOTIFIED', 'CLOSED'] as const;
export type IncidentStatus = (typeof INCIDENT_STATUSES)[number];

/** What kind of personal data was involved. A fixed list keeps the notice consistent. */
export const INCIDENT_DATA_CATEGORIES = {
  NAMES: 'Names',
  CONTACT_DETAILS: 'Contact details (email, phone)',
  IDENTITY_DOCUMENTS: 'Identity documents and photographs',
  PAYMENT_INFORMATION: 'Payment and payout details',
  ACCOUNT_CREDENTIALS: 'Account credentials',
  BOOKING_DETAILS: 'Booking and stay details',
  MESSAGES: 'Messages',
  LOCATION: 'Location data',
  OTHER: 'Other personal data',
} as const;
export type IncidentDataCategory = keyof typeof INCIDENT_DATA_CATEGORIES;
const CATEGORY_CODES = Object.keys(INCIDENT_DATA_CATEGORIES) as [IncidentDataCategory, ...IncidentDataCategory[]];

// ---------------------------------------------------------------------------
// Request shapes
// ---------------------------------------------------------------------------

const isoDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), 'Enter a valid date and time')
  .transform((value) => new Date(value));

const categoriesSchema = z
  .array(z.enum(CATEGORY_CODES))
  .min(1, 'Choose at least one kind of personal data')
  .max(CATEGORY_CODES.length)
  .refine((list) => new Set(list).size === list.length, 'Each kind of data can be listed once');

export const incidentDeclareSchema = z.object({
  title: z.string().trim().min(3, 'Give the incident a short title').max(140),
  summary: z.string().trim().min(10, 'Describe what happened').max(2000),
  awareAt: isoDate,
  dataCategories: categoriesSchema,
  affectedCount: z.number().int().min(0).max(100_000_000).optional(),
  consequences: z.string().trim().max(2000).optional(),
  measuresTaken: z.string().trim().max(2000).optional(),
});
export type IncidentDeclareInput = z.infer<typeof incidentDeclareSchema>;

export const incidentUpdateSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('EDIT'),
    title: z.string().trim().min(3).max(140).optional(),
    summary: z.string().trim().min(10).max(2000).optional(),
    dataCategories: categoriesSchema.optional(),
    affectedCount: z.number().int().min(0).max(100_000_000).optional(),
    consequences: z.string().trim().max(2000).optional(),
    measuresTaken: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal('REGULATOR_NOTIFIED'),
    notifiedAt: isoDate.optional(),
    regulatorReference: z.string().trim().max(120).optional(),
    delayReason: z.string().trim().max(2000).optional(),
  }),
  z.object({
    action: z.literal('USERS_NOTIFIED'),
    notifiedAt: isoDate.optional(),
  }),
  z.object({
    action: z.literal('CLOSE'),
    closingNote: z.string().trim().min(10, 'Say why the incident is being closed').max(2000),
  }),
]);
export type IncidentUpdateInput = z.infer<typeof incidentUpdateSchema>;

// ---------------------------------------------------------------------------
// Pure rules
// ---------------------------------------------------------------------------

/** The moment the 72-hour window closes. */
export function notificationDeadline(awareAt: Date): Date {
  return new Date(awareAt.getTime() + NOTIFICATION_WINDOW_HOURS * HOUR_MS);
}

export type IncidentClockState =
  | 'RUNNING'
  | 'OVERDUE'
  | 'NOTIFIED_ON_TIME'
  | 'NOTIFIED_LATE'
  | 'CLOSED_WITHOUT_NOTICE';

export interface IncidentClockInput {
  awareAt: Date;
  regulatorNotifiedAt: Date | null;
  closedAt: Date | null;
}

/**
 * Where the incident stands against the 72-hour deadline. A notice that was sent
 * counts as on time or late by when it was sent, never by when it is read: the
 * answer must not change as the days go by.
 */
export function incidentClock(incident: IncidentClockInput, now: Date = new Date()) {
  const deadlineAt = notificationDeadline(incident.awareAt);

  if (incident.regulatorNotifiedAt) {
    const state: IncidentClockState = incident.regulatorNotifiedAt <= deadlineAt ? 'NOTIFIED_ON_TIME' : 'NOTIFIED_LATE';
    return { deadlineAt, hoursRemaining: null, state };
  }
  if (incident.closedAt) {
    return { deadlineAt, hoursRemaining: null, state: 'CLOSED_WITHOUT_NOTICE' as IncidentClockState };
  }
  const hoursRemaining = Math.round(((deadlineAt.getTime() - now.getTime()) / HOUR_MS) * 10) / 10;
  const state: IncidentClockState = now > deadlineAt ? 'OVERDUE' : 'RUNNING';
  return { deadlineAt, hoursRemaining, state };
}

export interface IncidentRow {
  id: string;
  reference: string;
  title: string;
  summary: string;
  status: string;
  awareAt: Date;
  dataCategories: string;
  affectedCount: number | null;
  consequences: string | null;
  measuresTaken: string | null;
  regulatorNotifiedAt: Date | null;
  regulatorReference: string | null;
  delayReason: string | null;
  usersNotifiedAt: Date | null;
  closedAt: Date | null;
  closingNote: string | null;
  declaredById: string;
  declaredByEmail: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The columns a staff update may write. */
export type IncidentUpdateData = Partial<
  Pick<
    IncidentRow,
    | 'title'
    | 'summary'
    | 'dataCategories'
    | 'affectedCount'
    | 'consequences'
    | 'measuresTaken'
    | 'status'
    | 'regulatorNotifiedAt'
    | 'regulatorReference'
    | 'delayReason'
    | 'usersNotifiedAt'
    | 'closedAt'
    | 'closingNote'
  >
>;

function assertPlausibleTime(label: string, when: Date, awareAt: Date, now: Date): void {
  if (when.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    throw new ValidationError(`${label} cannot be in the future.`);
  }
  if (when < awareAt) {
    throw new ValidationError(`${label} cannot be before the company became aware of the incident.`);
  }
}

/**
 * Turns a staff request into the columns to write, or refuses it. Each step may
 * happen once: overwriting the recorded notification time would let the record
 * be tidied after the fact, which defeats its purpose as evidence.
 */
export function planIncidentUpdate(
  current: Pick<IncidentRow, 'status' | 'awareAt' | 'regulatorNotifiedAt' | 'usersNotifiedAt'>,
  input: IncidentUpdateInput,
  now: Date = new Date(),
): IncidentUpdateData {
  if (current.status === 'CLOSED') {
    throw new ValidationError('This incident is closed and can no longer be changed.');
  }

  switch (input.action) {
    case 'EDIT': {
      const data: IncidentUpdateData = {};
      if (input.title !== undefined) data.title = input.title;
      if (input.summary !== undefined) data.summary = input.summary;
      if (input.dataCategories !== undefined) data.dataCategories = JSON.stringify(input.dataCategories);
      if (input.affectedCount !== undefined) data.affectedCount = input.affectedCount;
      if (input.consequences !== undefined) data.consequences = input.consequences;
      if (input.measuresTaken !== undefined) data.measuresTaken = input.measuresTaken;
      if (Object.keys(data).length === 0) throw new ValidationError('Nothing to change.');
      return data;
    }

    case 'REGULATOR_NOTIFIED': {
      if (current.regulatorNotifiedAt) {
        throw new ValidationError('The notice to the regulator is already recorded and cannot be changed.');
      }
      const notifiedAt = input.notifiedAt ?? now;
      assertPlausibleTime('The notification time', notifiedAt, current.awareAt, now);

      const late = notifiedAt > notificationDeadline(current.awareAt);
      const delayReason = input.delayReason?.trim() || null;
      // The regulator asks why, so a late notice without a reason is an incomplete record.
      if (late && !delayReason) {
        throw new ValidationError(
          `This notice is more than ${NOTIFICATION_WINDOW_HOURS} hours after the company became aware. Give the reason for the delay.`,
        );
      }
      return {
        status: 'REGULATOR_NOTIFIED',
        regulatorNotifiedAt: notifiedAt,
        regulatorReference: input.regulatorReference?.trim() || null,
        delayReason: late ? delayReason : null,
      };
    }

    case 'USERS_NOTIFIED': {
      if (current.usersNotifiedAt) {
        throw new ValidationError('The notice to affected people is already recorded and cannot be changed.');
      }
      const notifiedAt = input.notifiedAt ?? now;
      assertPlausibleTime('The notification time', notifiedAt, current.awareAt, now);
      return { usersNotifiedAt: notifiedAt };
    }

    case 'CLOSE':
      return { status: 'CLOSED', closedAt: now, closingNote: input.closingNote };
  }
}

// ---------------------------------------------------------------------------
// Views and the regulator notice
// ---------------------------------------------------------------------------

function parseCategories(raw: string): IncidentDataCategory[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((code): code is IncidentDataCategory => typeof code === 'string' && code in INCIDENT_DATA_CATEGORIES);
  } catch {
    return [];
  }
}

export function toIncidentView(row: IncidentRow, now: Date = new Date()) {
  const clock = incidentClock(row, now);
  return {
    id: row.id,
    reference: row.reference,
    title: row.title,
    summary: row.summary,
    status: row.status,
    awareAt: row.awareAt,
    dataCategories: parseCategories(row.dataCategories),
    affectedCount: row.affectedCount,
    consequences: row.consequences,
    measuresTaken: row.measuresTaken,
    regulatorNotifiedAt: row.regulatorNotifiedAt,
    regulatorReference: row.regulatorReference,
    delayReason: row.delayReason,
    usersNotifiedAt: row.usersNotifiedAt,
    closedAt: row.closedAt,
    closingNote: row.closingNote,
    declaredByEmail: row.declaredByEmail,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    deadlineAt: clock.deadlineAt,
    hoursRemaining: clock.hoursRemaining,
    clockState: clock.state,
  };
}
export type IncidentView = ReturnType<typeof toIncidentView>;

/** Times in the notice are Nairobi time, the zone the regulator works in. */
function nairobiTime(value: Date): string {
  return `${value.toLocaleString('en-GB', { timeZone: 'Africa/Nairobi', dateStyle: 'long', timeStyle: 'short' })} EAT`;
}

/**
 * Plain-text notice for the Office of the Data Protection Commissioner, filled
 * from the record. Anything not yet known says so instead of being left out or
 * guessed: the regulator accepts a notice that is honest about gaps, and a
 * missing field would read as one the company never considered.
 */
export function buildRegulatorNotice(incident: IncidentView, now: Date = new Date()): string {
  const categories = incident.dataCategories.map((code) => `- ${INCIDENT_DATA_CATEGORIES[code]}`);
  const lines: string[] = [
    'NOTIFICATION OF A PERSONAL DATA BREACH',
    'Data Protection Act, 2019 (Kenya)',
    '',
    'To: The Office of the Data Protection Commissioner',
    `From: ${company.legalName}, trading as ${company.tradingName}`,
  ];
  if (company.registrationNumber) lines.push(`Company registration number: ${company.registrationNumber}`);
  lines.push(
    `Our reference: ${incident.reference}`,
    `Contact for this notice: ${company.privacyEmail}`,
    `Notice prepared: ${nairobiTime(now)}`,
    '',
    '1. When we became aware',
    nairobiTime(incident.awareAt),
  );
  if (incident.delayReason) {
    lines.push('', `This notice is later than ${NOTIFICATION_WINDOW_HOURS} hours after we became aware. Reason for the delay:`, incident.delayReason);
  }
  lines.push(
    '',
    '2. Nature of the breach',
    incident.summary,
    '',
    '3. Personal data involved',
    ...(categories.length > 0 ? categories : ['Not yet established']),
    `Number of people affected: ${incident.affectedCount ?? 'not yet known'}`,
    '',
    '4. Likely consequences for the people affected',
    incident.consequences || 'Not yet assessed.',
    '',
    '5. Measures taken or proposed',
    incident.measuresTaken || 'Not yet recorded.',
    '',
    '6. Communication to the people affected',
    incident.usersNotifiedAt
      ? `The people affected were told on ${nairobiTime(incident.usersNotifiedAt)}.`
      : 'The people affected have not yet been told.',
  );
  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Database access
// ---------------------------------------------------------------------------

function newReference(now: Date): string {
  const day = now.toISOString().slice(0, 10).replace(/-/g, '');
  return `DI-${day}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

export async function declareIncident(
  input: IncidentDeclareInput,
  actor: { id: string; email: string | null },
  now: Date = new Date(),
) {
  if (input.awareAt.getTime() > now.getTime() + FUTURE_TOLERANCE_MS) {
    throw new ValidationError('The time the company became aware cannot be in the future.');
  }

  const row = await prisma.dataIncident.create({
    data: {
      reference: newReference(now),
      title: input.title,
      summary: input.summary,
      status: 'OPEN',
      awareAt: input.awareAt,
      dataCategories: JSON.stringify(input.dataCategories),
      affectedCount: input.affectedCount ?? null,
      consequences: input.consequences ?? null,
      measuresTaken: input.measuresTaken ?? null,
      declaredById: actor.id,
      declaredByEmail: actor.email,
    },
  });
  return toIncidentView(row, now);
}

export async function listIncidents(now: Date = new Date()) {
  // Newest awareness first, because the incident closest to its deadline is
  // almost always the most recent one. Capped: this is a register, not a feed.
  const rows = await prisma.dataIncident.findMany({ orderBy: { awareAt: 'desc' }, take: 200 });
  return rows.map((row) => toIncidentView(row, now));
}

export async function getIncident(id: string, now: Date = new Date()) {
  const row = await prisma.dataIncident.findUnique({ where: { id } });
  if (!row) throw new NotFoundError('Incident');
  const view = toIncidentView(row, now);
  return { ...view, notice: buildRegulatorNotice(view, now) };
}

export async function updateIncident(id: string, input: IncidentUpdateInput, now: Date = new Date()) {
  const current = await prisma.dataIncident.findUnique({ where: { id } });
  if (!current) throw new NotFoundError('Incident');

  const data = planIncidentUpdate(current, input, now);
  const row = await prisma.dataIncident.update({ where: { id }, data });
  const view = toIncidentView(row, now);
  return { ...view, notice: buildRegulatorNotice(view, now) };
}
