import prisma from '../config/prisma.js';

// Landing-page numbers an admin may override. Happy stays is deliberately absent:
// it always comes from real completed guest stays (see review.service.getPublicStats),
// so it cannot be typed here.
const DEFAULTS: Record<string, string> = {
  starRating: '5.0',
  satisfaction: '0',
};

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? '';
}

export async function getLandingStats(): Promise<{ starRating: number; satisfaction: number }> {
  const [starRating, satisfaction] = await Promise.all([
    getSetting('starRating'),
    getSetting('satisfaction'),
  ]);
  return {
    starRating: Number(starRating) || 5.0,
    satisfaction: Number(satisfaction) || 0,
  };
}

export async function setLandingStats(input: { starRating?: number; satisfaction?: number }) {
  if (input.starRating !== undefined) {
    await prisma.appSetting.upsert({
      where: { key: 'starRating' },
      create: { key: 'starRating', value: String(input.starRating) },
      update: { value: String(input.starRating) },
    });
  }
  if (input.satisfaction !== undefined) {
    await prisma.appSetting.upsert({
      where: { key: 'satisfaction' },
      create: { key: 'satisfaction', value: String(input.satisfaction) },
      update: { value: String(input.satisfaction) },
    });
  }
  return getLandingStats();
}
