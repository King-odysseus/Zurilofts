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

  // Seed properties
  const propertiesData = [
    {
      title: 'Zuriloft - Serenity Apartments',
      location: 'Kilimani, Nairobi',
      price: 6300, rating: 5.0, reviews: 12, bedrooms: 2, bathrooms: 2, area: 950,
      description: 'Experience luxury living in the heart of Kilimani...',
      images: ['https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80', 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&q=80'],
      amenities: ['High-Speed WiFi', 'Smart TV', 'Fully Equipped Kitchen', 'Cleaning Service', '24/7 Power Backup', 'Secure Parking', 'Air Conditioning', 'Washing Machine'],
      nearby: ['5 minutes from Yaya Centre', '10 minutes from CBD', 'Close to major hospitals', 'Near international schools'],
      type: 'apartment', available: true, featured: true,
    },
    {
      title: 'Zuriloft - Skyview Studio',
      location: 'Westlands, Nairobi',
      price: 4500, rating: 4.8, reviews: 8, bedrooms: 1, bathrooms: 1, area: 520,
      description: 'A cozy, modern studio in the vibrant Westlands neighborhood.',
      images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80'],
      amenities: ['High-Speed WiFi', 'Smart TV', 'Kitchenette', 'Cleaning Service', 'Secure Parking'],
      nearby: ['2 minutes from Sarit Centre', '8 minutes from CBD'],
      type: 'studio', available: true, featured: true,
    },
    {
      title: 'Zuriloft - Garden Penthouse',
      location: 'Lavington, Nairobi',
      price: 12000, rating: 5.0, reviews: 4, bedrooms: 3, bathrooms: 3, area: 1800,
      description: 'A stunning penthouse with panoramic views and a private garden terrace.',
      images: ['https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&q=80', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80', 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&q=80', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'],
      amenities: ['High-Speed WiFi', 'Smart TV', 'Gourmet Kitchen', 'Daily Cleaning', '24/7 Power Backup', 'Secure Parking', 'Air Conditioning', 'Private Garden', 'Gym Access', 'Swimming Pool'],
      nearby: ['Lavington Mall', '10 minutes from CBD', 'Near international schools'],
      type: 'penthouse', available: true, featured: true,
    },
    {
      title: 'Zuriloft - Riverside Executive',
      location: 'Riverside Drive, Nairobi',
      price: 8500, rating: 4.7, reviews: 6, bedrooms: 2, bathrooms: 2, area: 1100,
      description: 'An executive apartment on Riverside Drive with river views.',
      images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'],
      amenities: ['High-Speed WiFi', 'Smart TV', 'Full Kitchen', 'Cleaning Service', '24/7 Power Backup', 'Secure Parking', 'Air Conditioning'],
      nearby: ['Riverside Park', '5 minutes from Westlands', 'Near UN offices'],
      type: 'apartment', available: true, featured: false,
    },
    {
      title: 'Zuriloft - Karen Cottage',
      location: 'Karen, Nairobi',
      price: 9500, rating: 4.9, reviews: 10, bedrooms: 3, bathrooms: 2, area: 1400,
      description: 'A charming cottage-style apartment in the leafy Karen suburb.',
      images: ['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80', 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80', 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?w=800&q=80', 'https://images.unsplash.com/photo-1600573472550-8090b5e0745e?w=800&q=80'],
      amenities: ['High-Speed WiFi', 'Smart TV', 'Full Kitchen', 'Garden', 'Fireplace', 'Secure Parking', 'Laundry'],
      nearby: ['Karen Blixen Museum', 'Giraffe Centre', 'Karen Country Club'],
      type: 'apartment', available: true, featured: false,
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
