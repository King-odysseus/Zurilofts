// Adds the shared database fields and settings for the four host growth
// features (fee calculator, founding hosts, referrals, signup nudges).
// String edits are done by replacement rather than by hand so Windows CRLF
// files are not rewritten wholesale.
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

function patch(relPath, edits) {
  const file = path.join(root, relPath);
  let text = fs.readFileSync(file, 'utf8');
  for (const [label, find, replace] of edits) {
    if (!text.includes(find)) {
      throw new Error(`${relPath}: anchor not found for ${label}`);
    }
    if (text.includes(replace)) {
      console.log(`  ${relPath}: ${label} already applied`);
      continue;
    }
    text = text.replace(find, replace);
    console.log(`  ${relPath}: ${label} applied`);
  }
  fs.writeFileSync(file, text);
}

// The two schemas align the same table with different column padding, so each
// gets its own anchor.
const applicationAnchors = {
  'server/prisma/schema.prisma': `  agreedTerms           Boolean                   @default(false)`,
  'server/prisma/schema.postgresql.prisma': `  agreedTerms   Boolean   @default(false)`,
};

const newApplicationFields = (anchor) => `${anchor}
  // Founding-host programme. Enrolled at approval while places remain; a
  // founding host pays a lower commission for as long as they host.
  foundingHost          Boolean                   @default(false)
  // Referrals. ownReferralCode is assigned at approval and shared by the host;
  // referredByCode is what this applicant typed, resolved to referredByHostId.
  ownReferralCode       String?                   @unique
  referredByCode        String?
  referredByHostId      String?
  // Signup nudges for an application left half-finished. Counted so a host is
  // reminded at most HOST_NUDGE_MAX times rather than every sweep.
  nudgeCount            Int                       @default(0)
  lastNudgeAt           DateTime?`;

const referralModel = `
// Bonus owed to a host who referred another host. One row per referred host, so
// the reward can only ever be credited once however many times the sweep runs.
// Referrer and referred are bare ids, like Payout.initiatedBy, to keep the User
// model free of a growing set of back-relations.
model HostReferral {
  id             String    @id @default(cuid())
  referrerHostId String
  referredHostId String    @unique
  amount         Int // KES, snapshotted at credit time
  status         String    @default("PENDING") // PENDING | CREDITED | VOID
  creditedAt     DateTime?
  createdAt      DateTime  @default(now())

  @@index([referrerHostId])
  @@index([status])
}
`;

// Both schemas carry the same application table; the postgres one is the build
// schema, so a field added to only one would fail in production.
for (const schema of ['server/prisma/schema.prisma', 'server/prisma/schema.postgresql.prisma']) {
  const file = path.join(root, schema);
  const text = fs.readFileSync(file, 'utf8');
  patch(schema, [['application fields', applicationAnchors[schema], newApplicationFields(applicationAnchors[schema])]]);
  if (!fs.readFileSync(file, 'utf8').includes('model HostReferral')) {
    fs.appendFileSync(file, referralModel);
    console.log(`  ${schema}: HostReferral model appended`);
  } else {
    console.log(`  ${schema}: HostReferral model already present`);
  }
  void text;
}

patch('server/src/config/env.ts', [
  [
    'growth settings',
    `  PLATFORM_PROMO_FUNDING: z.enum(['host', 'platform']).default('host'),`,
    `  PLATFORM_PROMO_FUNDING: z.enum(['host', 'platform']).default('host'),
  // Founding-host programme. The first FOUNDING_HOST_LIMIT approved hosts pay
  // FOUNDING_HOST_COMMISSION_RATE instead of HOST_COMMISSION_RATE. A limit of 0
  // switches the programme off, which is the default: a real cap only creates
  // urgency once someone has decided how many places to give away.
  FOUNDING_HOST_LIMIT: z.string().default('0'),
  FOUNDING_HOST_COMMISSION_RATE: z.string().default('0.05'),
  // KES credited to a host whose referred host completes a first stay. 0
  // switches the referral bonus off.
  REFERRAL_REWARD_KES: z.string().default('0'),
  // Nudge an application left mid-way after this many idle days, at most
  // HOST_NUDGE_MAX times. The nudges go out as push notifications; the server
  // has no email provider, so a host without push is not reached this way.
  HOST_NUDGE_AFTER_DAYS: z.string().default('2'),
  HOST_NUDGE_MAX: z.string().default('2'),`,
  ],
]);

console.log('done');
