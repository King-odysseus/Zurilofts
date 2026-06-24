export const AREAS = {
  all: 'All Areas',
  kilimani: 'Kilimani',
  westlands: 'Westlands',
  karen: 'Karen',
  gigiri: 'Gigiri',
  lavington: 'Lavington',
};

export const PLACE_CATEGORIES = {
  all: 'All Categories',
  shopping: 'Shopping',
  nature: 'Nature & Outdoors',
  culture: 'Culture & Museums',
  entertainment: 'Entertainment',
};

export const EAT_CATEGORIES = {
  all: 'All Cuisines',
  kenyan: 'Kenyan',
  italian: 'Italian',
  international: 'International',
  cafe: 'Café & Brunch',
  fine_dining: 'Fine Dining',
};

export const PLACES_TO_VISIT = [
  { name: 'The Junction Mall', area: 'kilimani', category: 'shopping', lat: -1.2948, lng: 36.7856, desc: 'A premier lifestyle and shopping destination right on Ngong Road. Enjoy top retail brands, restaurants, a cinema, and a vibrant food court, all just minutes away.', image: 'https://images.unsplash.com/photo-1585523658894-cc78fc2c8f67?w=800&q=80' },
  { name: 'Ngong Forest Sanctuary', area: 'kilimani', category: 'nature', lat: -1.3230, lng: 36.7800, desc: 'A serene urban forest reserve off Ngong Road, perfect for morning walks, bird watching, and peaceful nature escapes from the city buzz.', image: 'https://images.unsplash.com/photo-1662802416269-f2e49c062858?w=800&q=80' },
  { name: 'Prestige Plaza', area: 'kilimani', category: 'shopping', lat: -1.2880, lng: 36.7860, desc: 'A convenient shopping and dining hub along Ngong Road featuring Java House, local boutiques, and a variety of eateries ideal for a quick outing.', image: '/images/prestige-plaza.jpg' },
  { name: 'Yaya Centre', area: 'kilimani', category: 'shopping', lat: -1.2905, lng: 36.7820, desc: 'Popular shopping mall in Kilimani with supermarkets, fashion stores, cafés, and a food court — a local favourite for everyday errands and casual meetups.', image: 'https://images.unsplash.com/photo-1695252509752-4397f05bc59d?w=800&q=80' },
  { name: 'Sarit Centre', area: 'westlands', category: 'shopping', lat: -1.2615, lng: 36.8012, desc: 'An iconic shopping mall in Westlands with premium fashion brands, electronics, a large Carrefour supermarket, and excellent restaurants.', image: 'https://images.unsplash.com/photo-1669127300649-940337f1487e?w=800&q=80' },
  { name: 'Westgate Mall', area: 'westlands', category: 'shopping', lat: -1.2560, lng: 36.7930, desc: 'A modern shopping mall with international brands, a cinema, and a rooftop dining terrace with views across Westlands and Parklands.', image: 'https://images.unsplash.com/photo-1611348524140-53c9a25263d6?w=800&q=80' },
  { name: 'Nairobi National Museum', area: 'westlands', category: 'culture', lat: -1.2741, lng: 36.8136, desc: 'A fascinating museum showcasing Kenya\'s rich cultural and natural heritage. Features art galleries, botanical gardens, and the famous Snake Park.', image: 'https://images.unsplash.com/photo-1725870007788-0a1cfe8b52c1?w=800&q=80' },
  { name: 'Nairobi Street Kitchen', area: 'westlands', category: 'entertainment', lat: -1.2638, lng: 36.8005, desc: 'A vibrant weekend food and art market in Westlands bringing together local chefs, artists, and live music — perfect for a relaxed Saturday afternoon.', image: 'https://images.unsplash.com/photo-1747359636521-5a3f1cf37606?w=800&q=80' },
  { name: 'Giraffe Centre', area: 'karen', category: 'nature', lat: -1.3757, lng: 36.7445, desc: 'Get up close with endangered Rothschild giraffes at this acclaimed conservation center in Langata. Feed and photograph these gentle giants from an elevated platform.', image: 'https://images.unsplash.com/photo-1536540079349-3294632f1b72?w=800&q=80' },
  { name: 'Sheldrick Elephant Orphanage', area: 'karen', category: 'nature', lat: -1.3830, lng: 36.7730, desc: 'A world-renowned rescue and rehabilitation centre for orphaned baby elephants inside Nairobi National Park. Visit the daily 11am feeding session to watch the calves play.', image: 'https://images.unsplash.com/photo-1594555249447-1f8e0143fa6f?w=800&q=80' },
  { name: 'Karen Blixen Museum', area: 'karen', category: 'culture', lat: -1.3518, lng: 36.7126, desc: 'The former home of the famous Out of Africa author. A beautifully preserved colonial farmhouse with lush gardens and fascinating historical exhibits.', image: 'https://images.unsplash.com/photo-1568232033039-c1e830c7a4bb?w=800&q=80' },
  { name: 'Nairobi National Park', area: 'karen', category: 'nature', lat: -1.4065, lng: 36.8135, desc: 'Africa\'s only wildlife park within a capital city. Spot lions, rhinos, giraffes, and zebras against Nairobi\'s skyline — easily accessible via Langata Road.', image: 'https://images.unsplash.com/photo-1733705940512-87d66e3fcd9c?w=800&q=80' },
  { name: 'The Hub Karen', area: 'karen', category: 'shopping', lat: -1.3700, lng: 36.7230, desc: 'An upscale open-air shopping mall with boutique stores, artisanal cafés, and a relaxing atmosphere that blends modern retail with Karen\'s leafy charm.', image: 'https://images.unsplash.com/photo-1643913224222-17cc6adb2dfc?w=800&q=80' },
  { name: 'UN Headquarters Nairobi', area: 'gigiri', category: 'culture', lat: -1.2306, lng: 36.8144, desc: 'The global United Nations campus set in lush gardens. Guided tours are available, and the compound hosts regular cultural and environmental events.', image: 'https://images.unsplash.com/photo-1598941101837-e3fdd6d94b24?w=800&q=80' },
  { name: 'Karura Forest', area: 'gigiri', category: 'nature', lat: -1.2380, lng: 36.8340, desc: 'A vast urban forest with walking trails, waterfalls, bike paths, and picnic spots. The perfect escape for nature lovers, just minutes from the UN compound.', image: 'https://images.unsplash.com/photo-1668171938674-abc34c21fd7d?w=800&q=80' },
  { name: 'Village Market', area: 'gigiri', category: 'shopping', lat: -1.2300, lng: 36.8035, desc: 'A premier shopping and entertainment complex with a water park, cinema, bowling alley, and diverse dining options serving cuisines from around the world.', image: 'https://images.unsplash.com/photo-1693902997450-7e912c0d3554?w=800&q=80' },
  { name: 'Two Rivers Mall', area: 'gigiri', category: 'shopping', lat: -1.2130, lng: 36.7880, desc: 'East Africa\'s largest shopping mall with hundreds of stores, an amusement park, a Ferris wheel, and endless dining and entertainment options.', image: 'https://images.unsplash.com/photo-1596005554384-d293674c91d7?w=800&q=80' },
  { name: 'The Lavington Green', area: 'lavington', category: 'shopping', lat: -1.2845, lng: 36.7720, desc: 'A charming shopping and dining centre set in Lavington\'s leafy neighbourhood. Great for brunch, groceries, and boutique shopping.', image: 'https://images.unsplash.com/photo-1694434948850-ed51bd461733?w=800&q=80' },
  { name: 'Lavington Curve', area: 'lavington', category: 'entertainment', lat: -1.2810, lng: 36.7685, desc: 'A modern strip mall with top-tier restaurants, a health club, and lifestyle stores — a favourite meeting spot for Lavington residents.', image: 'https://images.unsplash.com/photo-1613457231357-a5db3bc5bd81?w=800&q=80' },
  { name: 'Arboretum Nairobi', area: 'lavington', category: 'nature', lat: -1.2770, lng: 36.8030, desc: 'A peaceful botanical garden and forest reserve bordering Lavington and State House. Ideal for morning jogs, dog walks, and quiet picnics under towering trees.', image: 'https://images.unsplash.com/photo-1612253577861-6a8175a9dfb6?w=800&q=80' },
  { name: 'Sigiria Forest', area: 'lavington', category: 'nature', lat: -1.2900, lng: 36.7780, desc: 'A hidden gem of indigenous forest with walking trails and bird-watching spots. A quiet sanctuary right at the edge of Lavington\'s residential streets.', image: 'https://images.unsplash.com/photo-1631089392516-5d2e37ccde29?w=800&q=80' },
];

export const PLACES_TO_EAT = [
  { name: 'Brew Bistro & Lounge', area: 'kilimani', category: 'international', lat: -1.2915, lng: 36.7832, desc: 'A stylish spot at Piedmont Plaza on Ngong Road serving European, French, Asian, and Kenyan fusion cuisine. Great cocktails and a lively rooftop atmosphere.', image: 'https://images.unsplash.com/photo-1665986129455-f4aaffdf19de?w=800&q=80' },
  { name: 'Mama Oliech\'s', area: 'kilimani', category: 'kenyan', lat: -1.2930, lng: 36.7890, desc: 'A Kilimani institution famous for authentic Kenyan fish dishes. Simple, hearty, and deeply satisfying for lovers of local coastal cuisine.', image: 'https://images.unsplash.com/photo-1601836689782-d08aaffb817d?w=800&q=80' },
  { name: 'Fogo Gaucho', area: 'kilimani', category: 'fine_dining', lat: -1.2895, lng: 36.7840, desc: 'A buzzing Brazilian churrascaria in Kilimani offering an all-you-can-eat roasted meat experience. Perfect for a celebratory dinner or a hearty group meal.', image: 'https://images.unsplash.com/photo-1635257063356-7f009b431f35?w=800&q=80' },
  { name: 'Cedars Restaurant', area: 'kilimani', category: 'international', lat: -1.2870, lng: 36.7850, desc: 'A refined Lebanese restaurant in Kilimani with an extensive mezze menu, grilled meats, and warm Middle Eastern hospitality. A local favourite for fine dining.', image: 'https://images.unsplash.com/photo-1562574223-2a24a76f03c4?w=800&q=80' },
  { name: 'Artcaffe Junction', area: 'kilimani', category: 'cafe', lat: -1.2948, lng: 36.7856, desc: 'A popular all-day café inside The Junction Mall on Ngong Road. Great for breakfast, light lunches, pastries, and quality Kenyan coffee in a relaxed setting.', image: 'https://images.unsplash.com/photo-1562082089-ae7d7acbd18d?w=800&q=80' },
  { name: 'La Terrazza', area: 'westlands', category: 'italian', lat: -1.2610, lng: 36.8015, desc: 'An intimate Italian restaurant tucked inside the Greenhouse Mall. Authentic pasta, wine, and stunning 4th-floor views across Nairobi.', image: 'https://images.unsplash.com/photo-1669034937770-498b5791b84c?w=800&q=80' },
  { name: 'Mercado', area: 'westlands', category: 'international', lat: -1.2640, lng: 36.7980, desc: 'A vibrant Mexican kitchen and bar in Westlands serving fresh tacos, mezcal cocktails, and lively weekend brunches with a rooftop DJ.', image: 'https://images.unsplash.com/photo-1669034938103-d4f434dce737?w=800&q=80' },
  { name: 'About Thyme', area: 'westlands', category: 'international', lat: -1.2585, lng: 36.7950, desc: 'A leafy garden restaurant tucked away in Westlands. Known for their creative international menu, cosy ambience, and Sunday barbecue specials.', image: 'https://images.unsplash.com/photo-1747359636402-785aa012fe74?w=800&q=80' },
  { name: 'Slate Kitchen & Bar', area: 'westlands', category: 'fine_dining', lat: -1.2600, lng: 36.8030, desc: 'Trendy rooftop dining and lounge with panoramic Westlands views, craft cocktails, and a wood-fired menu that draws a stylish after-work crowd.', image: 'https://images.unsplash.com/photo-1731412920958-2a39c763611b?w=800&q=80' },
  { name: 'Talisman Restaurant', area: 'karen', category: 'fine_dining', lat: -1.3510, lng: 36.7140, desc: 'A magical garden restaurant in Karen with eclectic décor and a fusion menu. One of Nairobi\'s most beloved dining spots — perfect for a romantic evening.', image: 'https://images.unsplash.com/photo-1669034937803-862fe581fc92?w=800&q=80' },
  { name: 'Cultiva Farm', area: 'karen', category: 'fine_dining', lat: -1.3650, lng: 36.7300, desc: 'A farm-to-table restaurant on a working garden. The seasonal menu changes weekly based on what\'s harvested — fresh, creative, and unforgettable.', image: 'https://images.unsplash.com/photo-1669034937569-aeb860068b41?w=800&q=80' },
  { name: 'Matbronze Café', area: 'karen', category: 'cafe', lat: -1.3480, lng: 36.7200, desc: 'A unique café and art gallery set in a bronze foundry in Karen. Enjoy great coffee and cake surrounded by wildlife sculptures and beautiful gardens.', image: 'https://images.unsplash.com/photo-1565848920056-906a21da8c70?w=800&q=80' },
  { name: 'Harvest Restaurant', area: 'gigiri', category: 'international', lat: -1.2315, lng: 36.8070, desc: 'A vibrant organic restaurant at Village Market serving healthy seasonal dishes sourced from local farms. Great for breakfast, lunch, and weekend salads.', image: 'https://images.unsplash.com/photo-1598403531581-5c4940efd249?w=800&q=80' },
  { name: 'Mama Rocks', area: 'gigiri', category: 'international', lat: -1.2280, lng: 36.8100, desc: 'Award-winning gourmet burgers with African-inspired flavours. Try the Mango Masai or the Kuku Republic — Nairobi\'s most creative burger joint.', image: 'https://images.unsplash.com/photo-1751130619954-21655ef0417c?w=800&q=80' },
  { name: 'Hero Restaurant', area: 'gigiri', category: 'fine_dining', lat: -1.2330, lng: 36.8050, desc: 'A rooftop Japanese robatayaki grill and cocktail bar at Trademark Hotel. Stunning views of Karura Forest, premium sushi, and an extensive sake list.', image: 'https://images.unsplash.com/photo-1625667782817-228e40c66aba?w=800&q=80' },
  { name: 'The Arbor', area: 'lavington', category: 'cafe', lat: -1.2830, lng: 36.7710, desc: 'A beautiful garden café and bistro at Lavington Green. Healthy salads, wood-fired pizzas, and fresh juices in a relaxed outdoor setting.', image: 'https://images.unsplash.com/photo-1693086460803-b58c59510137?w=800&q=80' },
  { name: 'Pallet Cafe', area: 'lavington', category: 'cafe', lat: -1.2800, lng: 36.7750, desc: 'A social enterprise café with a lovely garden setting. Great coffee, fresh baked goods, and a mission to employ and empower people with disabilities.', image: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&q=80' },
  { name: 'Graze Steakhouse', area: 'lavington', category: 'fine_dining', lat: -1.2860, lng: 36.7730, desc: 'A premium steakhouse with a sophisticated atmosphere. Dry-aged beef, an excellent wine list, and impeccable service — ideal for a special dinner.', image: 'https://images.unsplash.com/photo-1600891964092-4316c288032e?w=800&q=80' },
];
