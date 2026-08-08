import prisma from "../config/prisma.js";

// SQLite stores arrays as JSON strings; Postgres uses native arrays.
// This helper mirrors the normalisation in property.service.ts so the
// response shape is identical to what PropertyCard already consumes.
function normalizeProperty(property: any) {
  if (property.images !== undefined) {
    return property;
  }
  const { imagesJson, amenitiesJson, nearbyJson, ...rest } = property;
  const parseArray = (value: string | null | undefined) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  return {
    ...rest,
    images: parseArray(imagesJson),
    amenities: parseArray(amenitiesJson),
    nearby: parseArray(nearbyJson),
  };
}

function normalizeProperties(properties: any[]) {
  return properties.map(normalizeProperty);
}

// ---------------------------------------------------------------
// Personalised recommendations
// ---------------------------------------------------------------

/** Returns up to `limit` properties personalised from the caller"s own
 *  booking history. Falls back to popular / highly-rated properties
 *  when the user has no booking history. */
export async function getPersonalizedRecommendations(
  userId: string,
  limit: number = 6
) {
  const suspendedFilter = { host: { is: { suspended: true } } };

  // Build preference profile from the caller"s own booking history only.
  const bookings = await prisma.booking.findMany({
    where: { userId, status: { not: "CANCELLED" } },
    include: { property: true },
    orderBy: { createdAt: "desc" },
  });

  // No history → fallback to popular
  if (bookings.length === 0) {
    const popular = await prisma.property.findMany({
      where: { NOT: suspendedFilter },
      take: limit,
      orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
    });
    return normalizeProperties(popular);
  }

  // Derive preference signals
  const bookedIds = new Set(bookings.map((b) => b.propertyId));
  const locations = [...new Set(bookings.map((b) => b.property.location))];
  const types = [...new Set(bookings.map((b) => b.property.type))];
  const avgPrice = Math.round(
    bookings.reduce((sum, b) => sum + b.property.price, 0) / bookings.length
  );
  const priceFloor = Math.max(Math.round(avgPrice * 0.5), 500);
  const priceCeil = Math.round(avgPrice * 1.5);

  const result: any[] = [];
  const seen = new Set<string>();

  // Helper: add up to `needed` from a query
  async function addBatch(
    needed: number,
    where: any,
    orderBy: any
  ): Promise<void> {
    if (needed <= 0) return;
    const exclude = [...bookedIds, ...seen];
    const batch = await prisma.property.findMany({
      where: { ...where, id: { notIn: exclude }, NOT: suspendedFilter },
      take: needed,
      orderBy,
    });
    for (const p of batch) {
      if (result.length >= limit) break;
      if (!seen.has(p.id)) {
        seen.add(p.id);
        result.push(p);
      }
    }
  }

  // 1. Same location (highest weight)
  await addBatch(limit, { location: { in: locations } }, { rating: "desc" });
  if (result.length >= limit) return normalizeProperties(result);

  // 2. Similar price range
  await addBatch(
    limit - result.length,
    { price: { gte: priceFloor, lte: priceCeil } },
    { rating: "desc" }
  );
  if (result.length >= limit) return normalizeProperties(result);

  // 3. Same type
  await addBatch(
    limit - result.length,
    { type: { in: types } },
    { rating: "desc" }
  );
  if (result.length >= limit) return normalizeProperties(result);

  // 4. Top up with highly-rated / recent
  await addBatch(
    limit - result.length,
    {},
    [{ rating: "desc" }, { createdAt: "desc" }]
  );

  return normalizeProperties(result);
}