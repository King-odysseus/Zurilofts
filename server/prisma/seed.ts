import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Helper: store arrays as JSON for SQLite
function json(arr: string[]) {
  return JSON.stringify(arr);
}

async function main() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash('Admin@123', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@zurilofts.co.ke' },
    update: {},
    create: {
      email: 'admin@zurilofts.co.ke',
      passwordHash: adminPassword,
      firstName: 'Admin',
      lastName: 'User',
      role: 'ADMIN',
    },
  });
  console.log('  ✅ Admin: admin@zurilofts.co.ke / Admin@123');

  // Create test user
  const userPassword = await bcrypt.hash('User@1234', 12);
  await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      passwordHash: userPassword,
      firstName: 'Jane',
      lastName: 'Doe',
      phone: '+254 700 000 000',
    },
  });
  console.log('  ✅ User: user@example.com / User@1234');

  // Build local image paths helper
  function img(n: number) {
    return `/images/Ely Homes Photography (${n} of 20).jpg`;
  }

  // Seed properties — only Serenity Residency is currently live
  const propertiesData = [
    {
      title: 'ZuriLofts - Serenity Residency 1305',
      location: 'Kilimani, Ngong Road, Nairobi',
      price: 6800, rating: 4.8, reviews: 7, bedrooms: 2, bathrooms: 2, area: 980,
      description: 'A stylish, contemporary apartment in the heart of Kilimani along Ngong Road. Featuring modern finishes, abundant natural light, and a prime location close to Nairobis best dining and shopping.',
      images: [img(11), img(12), img(1), img(2), img(3)],
      amenities: ['High-Speed WiFi', 'Smart TV', 'Fully Equipped Kitchen', 'Cleaning Service', '24/7 Power Backup', 'Secure Parking', 'Air Conditioning', 'Washing Machine', 'Balcony'],
      nearby: ['3 minutes from Yaya Centre', '8 minutes from CBD', 'Close to major hospitals', 'Near international schools', 'Walking distance to Ngong Road cafes'],
      type: 'apartment', available: true, featured: true,
    },
    {
      title: 'ZuriLofts - Serenity Residency 1003',
      location: 'Kilimani, Ngong Road, Nairobi',
      price: 6300, rating: 5.0, reviews: 12, bedrooms: 2, bathrooms: 2, area: 950,
      description: 'Experience luxury living in the heart of Kilimani along Ngong Road. This beautifully furnished apartment offers modern amenities, stunning views, and easy access to shopping centers, restaurants, and business districts.',
      images: [img(13), img(14), img(6), img(7), img(8)],
      amenities: ['High-Speed WiFi', 'Smart TV', 'Fully Equipped Kitchen', 'Cleaning Service', '24/7 Power Backup', 'Secure Parking', 'Air Conditioning', 'Washing Machine'],
      nearby: ['5 minutes from Yaya Centre', '10 minutes from CBD', 'Close to major hospitals', 'Near international schools'],
      type: 'apartment', available: true, featured: true,
    },
  ];

  for (const prop of propertiesData) {
    await prisma.property.create({
      data: {
        title: prop.title,
        location: prop.location,
        price: prop.price,
        rating: prop.rating,
        reviews: prop.reviews,
        bedrooms: prop.bedrooms,
        bathrooms: prop.bathrooms,
        area: prop.area,
        description: prop.description,
        imagesJson: json(prop.images),
        amenitiesJson: json(prop.amenities),
        nearbyJson: json(prop.nearby),
        type: prop.type,
        available: prop.available,
        featured: prop.featured,
      },
    });
  }
  console.log(`  ✅ ${propertiesData.length} properties seeded`);

  // Seed promo codes
  const promos = [
    { code: 'WELCOME10', discountPercent: 10, maxDiscount: 2000, validFrom: new Date('2026-01-01'), validUntil: new Date('2026-12-31'), maxUses: 100, active: true, createdBy: admin.id },
    { code: 'SUMMER2026', discountPercent: 15, maxDiscount: 3000, minBookingAmount: 10000, validFrom: new Date('2026-06-01'), validUntil: new Date('2026-08-31'), maxUses: 50, active: true, createdBy: admin.id },
    { code: 'STAYLONG', discountPercent: 20, maxDiscount: 5000, minBookingAmount: 20000, validFrom: new Date('2026-01-01'), validUntil: new Date('2026-12-31'), active: true, createdBy: admin.id },
  ];

  for (const promo of promos) {
    await prisma.promoCode.create({ data: promo });
  }
  console.log('  ✅ 3 promo codes seeded: WELCOME10, SUMMER2026, STAYLONG');

  console.log('\n✅ Seed complete!');
}

main()
  .catch((e) => { console.error('❌ Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
