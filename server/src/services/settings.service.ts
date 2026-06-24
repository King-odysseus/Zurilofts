import prisma from '../config/prisma.js';

const DEFAULTS: Record<string, string> = {
  happyStays: '10',
  starRating: '5.0',
  satisfaction: '0',
};

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? '';
}

export async function getLandingStats(): Promise<{ happyStays: number; starRating: number; satisfaction: number }> {
  const [happyStays, starRating, satisfaction] = await Promise.all([
    getSetting('happyStays'),
    getSetting('starRating'),
    getSetting('satisfaction'),
  ]);
  return {
    happyStays: Number(happyStays) || 10,
    starRating: Number(starRating) || 5.0,
    satisfaction: Number(satisfaction) || 0,
  };
}

export async function setLandingStats(happyStays?: number, starRating?: number, satisfaction?: number) {
  if (happyStays !== undefined) {
    await prisma.appSetting.upsert({
      where: { key: 'happyStays' },
      create: { key: 'happyStays', value: String(happyStays) },
      update: { value: String(happyStays) },
    });
  }
  if (starRating !== undefined) {
    await prisma.appSetting.upsert({
      where: { key: 'starRating' },
      create: { key: 'starRating', value: String(starRating) },
      update: { value: String(starRating) },
    });
  }
  if (satisfaction !== undefined) {
    await prisma.appSetting.upsert({
      where: { key: 'satisfaction' },
      create: { key: 'satisfaction', value: String(satisfaction) },
      update: { value: String(satisfaction) },
    });
  }
  return getLandingStats();
}
