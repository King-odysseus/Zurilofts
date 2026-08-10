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
  { name: 'The Junction Mall', area: 'kilimani', category: 'shopping', lat: -1.2980591, lng: 36.7627524, desc: 'A premier lifestyle and shopping destination right on Ngong Road. Enjoy top retail brands, restaurants, a cinema, and a vibrant food court, all just minutes away.', image: '/images/place-junction-mall.jpg' },
  { name: 'Ngong Forest Sanctuary', area: 'kilimani', category: 'nature', lat: -1.3230, lng: 36.7800, mapsQuery: 'Ngong Road Forest Sanctuary, Nairobi, Kenya', desc: 'A serene urban forest reserve off Ngong Road, perfect for morning walks, bird watching, and peaceful nature escapes from the city buzz.', image: '/images/place-ngong-forest.jpg' },
  { name: 'Prestige Plaza', area: 'kilimani', category: 'shopping', lat: -1.3009044, lng: 36.7870602, desc: 'A convenient shopping and dining hub along Ngong Road featuring Java House, local boutiques, and a variety of eateries ideal for a quick outing.', image: '/images/prestige-plaza.jpg' },
  { name: 'Yaya Centre', area: 'kilimani', category: 'shopping', lat: -1.293069, lng: 36.7877525, desc: 'Popular shopping mall in Kilimani with supermarkets, fashion stores, cafés, and a food court - a local favourite for everyday errands and casual meetups.', image: '/images/place-yaya-centre.jpg' },
  { name: 'Sarit Centre', area: 'westlands', category: 'shopping', lat: -1.2609034, lng: 36.8018312, desc: 'An iconic shopping mall in Westlands with premium fashion brands, electronics, a large Carrefour supermarket, and excellent restaurants.', image: '/images/place-sarit-centre.jpg' },
  { name: 'Westgate Mall', area: 'westlands', category: 'shopping', lat: -1.2570443, lng: 36.803133, desc: 'A modern shopping mall with international brands, a cinema, and a rooftop dining terrace with views across Westlands and Parklands.', image: '/images/place-westgate-mall.jpg' },
  { name: 'Nairobi National Museum', area: 'westlands', category: 'culture', lat: -1.2739492, lng: 36.8150071, desc: 'A fascinating museum showcasing Kenya\'s rich cultural and natural heritage. Features art galleries, botanical gardens, and the famous Snake Park.', image: '/images/place-nairobi-national-museum.jpg' },
  { name: 'Nairobi Street Kitchen', area: 'westlands', category: 'entertainment', lat: -1.2654934, lng: 36.8043092, desc: 'A vibrant weekend food and art market in Westlands bringing together local chefs, artists, and live music - perfect for a relaxed Saturday afternoon.', image: '/images/place-nairobi-street-kitchen.jpg' },
  { name: 'Giraffe Centre', area: 'karen', category: 'nature', lat: -1.3765618, lng: 36.7445949, desc: 'Get up close with endangered Rothschild giraffes at this acclaimed conservation center in Langata. Feed and photograph these gentle giants from an elevated platform.', image: '/images/place-giraffe-centre.jpg' },
  { name: 'Sheldrick Elephant Orphanage', area: 'karen', category: 'nature', lat: -1.3768291, lng: 36.7740729, mapsQuery: 'Sheldrick Wildlife Trust Nursery, Nairobi, Kenya', desc: 'A world-renowned rescue and rehabilitation centre for orphaned baby elephants inside Nairobi National Park. Visit the daily 11am feeding session to watch the calves play.', image: '/images/place-sheldrick-orphanage.jpg' },
  { name: 'Karen Blixen Museum', area: 'karen', category: 'culture', lat: -1.3519707, lng: 36.7125131, desc: 'The former home of the famous Out of Africa author. A beautifully preserved colonial farmhouse with lush gardens and fascinating historical exhibits.', image: '/images/place-karen-blixen-museum.jpg' },
  { name: 'Nairobi National Park', area: 'karen', category: 'nature', lat: -1.3745659, lng: 36.8397016, desc: 'Africa\'s only wildlife park within a capital city. Spot lions, rhinos, giraffes, and zebras against Nairobi\'s skyline - easily accessible via Langata Road.', image: '/images/place-nairobi-national-park.jpg' },
  { name: 'The Hub Karen', area: 'karen', category: 'shopping', lat: -1.3204357, lng: 36.7038018, desc: 'An upscale open-air shopping mall with boutique stores, artisanal cafés, and a relaxing atmosphere that blends modern retail with Karen\'s leafy charm.', image: '/images/place-hub-karen.jpg' },
  { name: 'UN Headquarters Nairobi', area: 'gigiri', category: 'culture', lat: -1.2306, lng: 36.8144, mapsQuery: 'United Nations Office at Nairobi, United Nations Avenue, Gigiri, Kenya', desc: 'The global United Nations campus set in lush gardens. Guided tours are available, and the compound hosts regular cultural and environmental events.', image: '/images/place-un-hq.jpg' },
  { name: 'Karura Forest', area: 'gigiri', category: 'nature', lat: -1.2387026, lng: 36.8326048, desc: 'A vast urban forest with walking trails, waterfalls, bike paths, and picnic spots. The perfect escape for nature lovers, just minutes from the UN compound.', image: '/images/place-karura-forest.jpg' },
  { name: 'Village Market', area: 'gigiri', category: 'shopping', lat: -1.2288029, lng: 36.8050351, desc: 'A premier shopping and entertainment complex with a water park, cinema, bowling alley, and diverse dining options serving cuisines from around the world.', image: '/images/place-village-market.jpg' },
  { name: 'Two Rivers Mall', area: 'gigiri', category: 'shopping', lat: -1.2107912, lng: 36.7952337, desc: 'East Africa\'s largest shopping mall with hundreds of stores, an amusement park, a Ferris wheel, and endless dining and entertainment options.', image: '/images/place-two-rivers-mall.jpg' },
  { name: 'The Lavington Green', area: 'lavington', category: 'shopping', lat: -1.2800603, lng: 36.7701605, mapsQuery: 'Lavington Green Shopping Centre, Nairobi, Kenya', desc: 'A charming shopping and dining centre set in Lavington\'s leafy neighbourhood. Great for brunch, groceries, and boutique shopping.', image: '/images/place-lavington-green.jpg' },
  { name: 'Lavington Curve', area: 'lavington', category: 'entertainment', lat: -1.2783111, lng: 36.7695447, desc: 'A modern strip mall with top-tier restaurants, a health club, and lifestyle stores - a favourite meeting spot for Lavington residents.', image: '/images/place-lavington-curve.jpg' },
  { name: 'Arboretum Nairobi', area: 'lavington', category: 'nature', lat: -1.2773122, lng: 36.7999011, mapsQuery: 'Nairobi Arboretum, Nairobi, Kenya', desc: 'A peaceful botanical garden and forest reserve bordering Lavington and State House. Ideal for morning jogs, dog walks, and quiet picnics under towering trees.', image: '/images/place-nairobi-arboretum.jpg' },
  { name: 'Sigiria Forest', area: 'gigiri', category: 'nature', lat: -1.2444665, lng: 36.8039986, desc: 'An indigenous section of Karura Forest with walking trails and bird-watching spots near Gigiri.', image: '/images/place-sigiria-forest.jpg' },
];

export const PLACES_TO_EAT = [
  { name: 'Brew Bistro & Lounge', area: 'kilimani', category: 'international', lat: -1.2993, lng: 36.76552, mapsQuery: 'Brew Bistro, Piedmont Plaza, Ngong Road, Nairobi, Kenya', desc: 'A stylish spot at Piedmont Plaza on Ngong Road serving European, French, Asian, and Kenyan fusion cuisine. Great cocktails and a lively rooftop atmosphere.', image: '/images/eat-brew-bistro.jpg' },
  { name: 'Mama Oliech\'s', area: 'kilimani', category: 'kenyan', lat: -1.2944252, lng: 36.7911984, mapsQuery: 'Mama Oliech Restaurant, Marcus Garvey Road, Nairobi, Kenya', desc: 'A Kilimani institution famous for authentic Kenyan fish dishes. Simple, hearty, and deeply satisfying for lovers of local coastal cuisine.', image: '/images/eat-mama-oliech.jpg' },
  { name: 'Fogo Gaucho', area: 'kilimani', category: 'fine_dining', lat: -1.2907703, lng: 36.7827542, mapsQuery: 'Fogo Gaucho Kilimani, Galana Road, Nairobi, Kenya', desc: 'A buzzing Brazilian churrascaria in Kilimani offering an all-you-can-eat roasted meat experience. Perfect for a celebratory dinner or a hearty group meal.', image: '/images/eat-fogo-gaucho.jpg' },
  { name: 'Cedars Restaurant', area: 'kilimani', category: 'international', lat: -1.2887897, lng: 36.790909, desc: 'A refined Lebanese restaurant in Kilimani with an extensive mezze menu, grilled meats, and warm Middle Eastern hospitality. A local favourite for fine dining.', image: '/images/eat-cedars.jpg' },
  { name: 'Artcaffe Junction', area: 'kilimani', category: 'cafe', lat: -1.2980591, lng: 36.7627524, mapsQuery: 'Artcaffe The Junction Mall, Nairobi, Kenya', desc: 'A popular all-day café inside The Junction Mall on Ngong Road. Great for breakfast, light lunches, pastries, and quality Kenyan coffee in a relaxed setting.', image: '/images/eat-artcaffe.jpg' },
  { name: 'La Terrazza', area: 'kilimani', category: 'italian', lat: -1.3003632, lng: 36.7814289, mapsQuery: 'La Terrazza, Ngong Road, Nairobi, Kenya', desc: 'An intimate Italian restaurant on Ngong Road. Authentic pasta, wine, and elevated views across Nairobi.', image: '/images/eat-la-terrazza.jpg' },
  { name: 'Mercado', area: 'westlands', category: 'international', lat: -1.2613778, lng: 36.8042498, desc: 'A vibrant Mexican kitchen and bar in Westlands serving fresh tacos, mezcal cocktails, and lively weekend brunches with a rooftop DJ.', image: '/images/eat-mercado.jpg' },
  { name: 'About Thyme', area: 'westlands', category: 'international', lat: -1.2527646, lng: 36.8030622, desc: 'A leafy garden restaurant tucked away in Westlands. Known for their creative international menu, cosy ambience, and Sunday barbecue specials.', image: '/images/eat-about-thyme.jpg' },
  { name: 'Slate Kitchen & Bar', area: 'westlands', category: 'fine_dining', lat: -1.2615874, lng: 36.8048314, mapsQuery: 'Slate Kitchen and Bar, Skynest Residences, Mkungu Close, Nairobi, Kenya', desc: 'A contemporary restaurant on the ground floor of Skynest Residences in Westlands, with a globally inspired menu and craft cocktails.', image: '/images/eat-slate.jpg' },
  { name: 'Talisman Restaurant', area: 'karen', category: 'fine_dining', lat: -1.3230815, lng: 36.7031939, desc: 'A magical garden restaurant in Karen with eclectic décor and a fusion menu. One of Nairobi\'s most beloved dining spots - perfect for a romantic evening.', image: '/images/eat-talisman.jpg' },
  { name: 'Cultiva Farm', area: 'karen', category: 'fine_dining', lat: -1.3377, lng: 36.7225, mapsQuery: 'Cultiva Farm Kenya, Pofu Road, Nairobi, Kenya', desc: 'A farm-to-table restaurant on a working garden. The seasonal menu changes weekly based on what\'s harvested - fresh, creative, and unforgettable.', image: '/images/eat-cultiva.jpg' },
  { name: 'Matbronze Café', area: 'karen', category: 'cafe', lat: -1.3650611, lng: 36.7472486, desc: 'A unique café and art gallery set in a bronze foundry in Karen. Enjoy great coffee and cake surrounded by wildlife sculptures and beautiful gardens.', image: '/images/eat-matbronze.jpg' },
  { name: 'Harvest Restaurant', area: 'gigiri', category: 'international', lat: -1.2288029, lng: 36.8050351, mapsQuery: 'Harvest Restaurant, Village Market, Nairobi, Kenya', desc: 'A vibrant organic restaurant at Village Market serving healthy seasonal dishes sourced from local farms. Great for breakfast, lunch, and weekend salads.', image: '/images/eat-harvest.jpg' },
  { name: 'Mama Rocks', area: 'westlands', category: 'international', lat: -1.2654934, lng: 36.8043092, mapsQuery: 'Mama Rocks Burgers, Nairobi, Kenya', desc: 'Gourmet burgers with African-inspired flavours. Try the Mango Masai or the Kuku Republic.', image: '/images/eat-mama-rocks.jpg' },
  { name: 'Hero Restaurant', area: 'gigiri', category: 'fine_dining', lat: -1.230433, lng: 36.8040202, mapsQuery: 'Hero Restaurant, Trademark Hotel, Village Market, Nairobi, Kenya', desc: 'A rooftop Japanese robatayaki grill and cocktail bar at Trademark Hotel. Stunning views of Karura Forest, premium sushi, and an extensive sake list.', image: '/images/eat-hero.jpg' },
  { name: 'The Arbor', area: 'lavington', category: 'cafe', lat: -1.2800, lng: 36.7700, mapsQuery: 'The Arbor, 904 James Gichuru Road, Lavington, Nairobi, Kenya', desc: 'A relaxed garden café and bistro on James Gichuru Road with outdoor seating and an Asian-influenced menu.', image: '/images/eat-the-arbor.jpg' },
  { name: 'Pallet Cafe', area: 'lavington', category: 'cafe', lat: -1.2787687, lng: 36.7690601, desc: 'A social enterprise café with a lovely garden setting. Great coffee, fresh baked goods, and a mission to employ and empower people with disabilities.', image: '/images/eat-pallet.jpg' },
  { name: 'Graze Steakhouse', area: 'westlands', category: 'fine_dining', lat: -1.2623364, lng: 36.8023858, mapsQuery: 'Graze Steakhouse, Sankara Hotel, Westlands, Nairobi, Kenya', desc: 'A premium steakhouse at Sankara Hotel with a sophisticated atmosphere, an excellent wine list, and polished service.', image: '/images/eat-graze.jpg' },
];
