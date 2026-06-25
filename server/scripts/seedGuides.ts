import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const guides = [
  {
    title: 'Best Areas to Stay in Nairobi',
    slug: 'best-areas-to-stay-in-nairobi',
    excerpt: 'Discover the five neighbourhoods that offer the best combination of safety, convenience, and lifestyle for short-let stays.',
    coverImage: '/images/place-karura-forest.jpg',
    body: `
<h2>Kilimani</h2>
<p>The sweet spot for most visitors. Kilimani sits between the CBD and the leafy suburbs, offering easy access to Yaya Centre, The Junction Mall, and scores of cafés and restaurants. Ngong Road connects you straight to Karen and the national park.</p>
<p><strong>Best for:</strong> First-time visitors, business travellers, food lovers.</p>

<h2>Westlands</h2>
<p>Nairobi's entertainment hub. Westlands pulses with rooftop bars, international restaurants, and the Sarit Centre/Westgate shopping duo. Great for nightlife — less so for quiet mornings.</p>
<p><strong>Best for:</strong> Nightlife, dining, shopping, young professionals.</p>

<h2>Karen</h2>
<p>Named after Karen Blixen of <em>Out of Africa</em> fame. Karen is Nairobi's garden suburb — spacious, green, and home to the Giraffe Centre, Sheldrick Elephant Orphanage, and the Karen Blixen Museum. The Hub Karen provides boutique shopping.</p>
<p><strong>Best for:</strong> Families, nature lovers, weekend getaways.</p>

<h2>Gigiri</h2>
<p>The diplomatic quarter — home to the UN headquarters, Village Market, and Two Rivers Mall (East Africa's largest). Karura Forest is on your doorstep for morning walks and bike rides.</p>
<p><strong>Best for:</strong> UN/diplomatic visitors, families, Karura access.</p>

<h2>Lavington</h2>
<p>A quiet, upmarket residential area with excellent cafés (Pallet Cafe, The Arbor), the Arboretum, and easy access to both Westlands and Kilimani. Less tourist infrastructure but more of a local-living feel.</p>
<p><strong>Best for:</strong> Long-stay guests, remote workers, families wanting quiet.</p>
    `.trim(),
    published: true,
  },
  {
    title: 'Nairobi Airport Transfer Guide',
    slug: 'nairobi-airport-transfer-guide',
    excerpt: 'Everything you need to know about getting from JKIA to your ZuriLofts apartment — options, prices, and insider tips.',
    coverImage: '/images/place-two-rivers-mall.jpg',
    body: `
<h2>JKIA to Nairobi — Your Options</h2>
<p>Jomo Kenyatta International Airport (JKIA) is about 18 km from the city centre. Depending on traffic, the journey takes 25–60 minutes.</p>

<h3>1. Ride-Hailing (Uber / Bolt / Little)</h3>
<p>The most convenient option. Open the app once you clear customs — WiFi is available at JKIA. Pricing is dynamic but expect:</p>
<ul>
  <li>JKIA → Kilimani: KES 800–1,500</li>
  <li>JKIA → Westlands: KES 900–1,700</li>
  <li>JKIA → Karen: KES 1,200–2,000</li>
  <li>JKIA → Gigiri: KES 1,100–1,900</li>
</ul>

<h3>2. Airport Taxi</h3>
<p>Official JKIA taxis are available at the arrivals hall. Fixed fares, generally 30–50% more expensive than Uber. Negotiate before getting in.</p>

<h3>3. Hotel / Host Transfer</h3>
<p>Some ZuriLofts hosts offer airport pickup — check your booking details or message your host. This is often the most seamless option, especially for late-night arrivals.</p>

<h3>4. Public Transport (Matatu)</h3>
<p>Not recommended with luggage. Matatus are colourful minibuses but crowded, and you'll need to change routes to reach most residential areas.</p>

<h2>Tips</h2>
<ul>
  <li><strong>SIM card:</strong> Buy a Safaricom or Airtel SIM in the arrivals hall. Mobile data makes everything easier.</li>
  <li><strong>M-Pesa:</strong> Set up M-Pesa on your Safaricom line — it's how Kenya pays for everything.</li>
  <li><strong>Traffic:</strong> Avoid arriving between 7–9 AM and 4–7 PM on weekdays if possible — Nairobi traffic is real.</li>
  <li><strong>Cash:</strong> Have some KES on hand for small purchases. ATMs are available at the airport.</li>
</ul>
    `.trim(),
    published: true,
  },
  {
    title: 'Top 10 Nairobi Restaurants Near ZuriLofts',
    slug: 'top-10-nairobi-restaurants',
    excerpt: 'From nyama choma joints to fine dining — our curated list of the best restaurants within reach of your ZuriLofts stay.',
    coverImage: '/images/eat-talisman.jpg',
    body: `
<h2>1. Talisman (Karen)</h2>
<p>A magical garden restaurant with fusion cuisine and one of Nairobi's most beloved atmospheres. Perfect for a romantic dinner or long Sunday lunch.</p>

<h2>2. Cultiva Farm (Karen)</h2>
<p>Farm-to-table dining on a working garden. The seasonal menu changes weekly based on what's harvested. Fresh, creative, unforgettable.</p>

<h2>3. Fogo Gaucho (Kilimani)</h2>
<p>Brazilian churrascaria with all-you-can-eat roasted meats carved tableside. A celebration-worthy experience.</p>

<h2>4. About Thyme (Westlands)</h2>
<p>A leafy garden hideaway with a creative international menu. Their Sunday barbecue specials draw a loyal crowd.</p>

<h2>5. Mama Oliech's (Kilimani)</h2>
<p>A Nairobi institution for authentic Kenyan fish dishes. Simple, hearty, deeply satisfying — a must-try for lovers of local cuisine.</p>

<h2>6. Brew Bistro (Kilimani)</h2>
<p>Stylish rooftop spot with craft cocktails, fusion food, and a lively after-work scene at Piedmont Plaza on Ngong Road.</p>

<h2>7. Hero Restaurant (Gigiri)</h2>
<p>Japanese robatayaki grill and cocktail bar atop Trademark Hotel. Stunning views over Karura Forest and premium sushi.</p>

<h2>8. Mercado (Westlands)</h2>
<p>Vibrant Mexican kitchen and bar serving fresh tacos, mezcal cocktails, and weekend rooftop brunches with a DJ.</p>

<h2>9. La Terrazza (Westlands)</h2>
<p>Intimate Italian inside the Greenhouse Mall. Authentic pasta, good wine, and lovely 4th-floor views across Nairobi.</p>

<h2>10. Pallet Cafe (Lavington)</h2>
<p>A social enterprise café with a beautiful garden setting. Great coffee, fresh baked goods, and a mission to employ people with disabilities.</p>
    `.trim(),
    published: true,
  },
];

async function main() {
  console.log('Seeding travel guides...');
  for (const guide of guides) {
    await prisma.blogPost.upsert({
      where: { slug: guide.slug },
      update: guide,
      create: guide,
    });
    console.log(`  ✓ ${guide.slug}`);
  }
  console.log(`Done — ${guides.length} guides seeded.`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
