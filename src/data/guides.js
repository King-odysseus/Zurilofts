import { PLACES_TO_EAT, PLACES_TO_VISIT } from "./nearby.js";

const cultureImage = PLACES_TO_VISIT.find(
  (item) => item.category === "culture",
)?.image;
const foodImage = PLACES_TO_EAT.find(
  (item) => item.category === "kenyan",
)?.image;
const natureImage = PLACES_TO_VISIT.find(
  (item) => item.category === "nature",
)?.image;

export const EDITORIAL_GUIDES = [
  {
    id: "editorial-weekend",
    slug: "first-weekend-in-nairobi",
    title: "A first weekend in Nairobi",
    eyebrow: "Getting started",
    readingTime: "6 min read",
    createdAt: "2026-09-17T00:00:00.000Z",
    coverImage: cultureImage,
    excerpt:
      "Land in Nairobi with a plan that still leaves room for surprise: coffee, culture, green space, and a golden-hour view.",
    body: `<p>Nairobi rewards a slower first day. Give yourself space to adjust to the altitude, follow the light, and let one good conversation decide where you go next.</p><h2>Saturday: start close, then wander</h2><p>Begin with a long breakfast in your neighbourhood. Kilimani is ideal for an easy first morning, with independent cafés and leafy streets that make the city feel approachable. By late morning, choose one cultural stop rather than trying to collect them all. The Nairobi National Museum gives you a useful introduction to Kenya’s history, art, and natural world.</p><h2>Saturday afternoon: find a green pause</h2><p>After lunch, trade the traffic for a garden or forest trail. Carry water, comfortable shoes, and a light layer for the evening. Nairobi’s best moments often happen between the headline attractions: a bird call on the path, a roadside flower stall, or a view of the city through the trees.</p><h2>Sunday: leave room for the city</h2><p>Use Sunday for a market, a long lunch, or a neighbourhood you did not see on Saturday. Ask your host for the small local recommendation they give friends, and keep your plans flexible. A first weekend should leave you curious, not exhausted.</p>`,
  },
  {
    id: "editorial-food",
    slug: "where-to-eat-like-a-local",
    title: "Where to eat like a local",
    eyebrow: "Food & drink",
    readingTime: "8 min read",
    createdAt: "2026-09-17T00:00:00.000Z",
    coverImage: foodImage,
    excerpt:
      "Nairobi’s best meals are often tucked behind an unassuming door. Here is how to eat well from breakfast through late night.",
    body: `<p>The easiest way to understand Nairobi is through its tables. Menus shift from one neighbourhood to the next, but the welcome is consistent: generous, social, and full of stories.</p><h2>Start with something unmistakably Kenyan</h2><p>Try nyama choma with kachumbari, a plate of pilau, or fresh fish with ugali. Ask for the house speciality and do not rush the meal. Local restaurants are at their best when you arrive hungry and let the kitchen guide you.</p><h2>Make time for a proper café break</h2><p>Nairobi’s coffee scene is thoughtful and relaxed. A late breakfast or mid-afternoon coffee is a useful way to reset between plans. Look for a garden seat, order something small, and watch the neighbourhood move around you.</p><h2>Plan your evening around the room</h2><p>For dinner, decide whether you want a lively rooftop, a quiet courtyard, or a polished tasting menu. Book ahead for the popular spots, but keep one spontaneous option in reserve. The best recommendation is often the one your host makes after asking what you feel like tonight.</p>`,
  },
  {
    id: "editorial-outdoors",
    slug: "nairobi-outdoors",
    title: "Nairobi outdoors",
    eyebrow: "Nature & wellness",
    readingTime: "5 min read",
    createdAt: "2026-09-17T00:00:00.000Z",
    coverImage: natureImage,
    excerpt:
      "Trade traffic for birdsong, red earth, and wide-open skies with three easy escapes from the city rush.",
    body: `<p>Nature is never far away in Nairobi. A good outdoor day does not need a complicated itinerary; it needs an early start, comfortable shoes, and a little patience.</p><h2>Choose your kind of escape</h2><p>Karura Forest is the all-rounder: walking trails, waterfalls, and enough shade for a slow morning. For wildlife, the Giraffe Centre and Nairobi National Park offer close encounters without a long drive out of town. If you want quiet rather than spectacle, the Arboretum is ideal for a gentle walk and a picnic.</p><h2>Pack for changing weather</h2><p>Bring water, sunscreen, a light rain layer, and a small amount of cash. Trails can be muddy after rain, while the midday sun can feel stronger than expected. Tell someone where you are going and use marked routes, especially if you are exploring alone.</p><h2>End slowly</h2><p>Leave time for a meal or tea after the walk. The best outdoor days in Nairobi are not about ticking off every trail; they are about returning to your stay with a clear head and one new favourite place.</p>`,
  },
];

export function getEditorialGuide(slug) {
  return EDITORIAL_GUIDES.find((guide) => guide.slug === slug) || null;
}
