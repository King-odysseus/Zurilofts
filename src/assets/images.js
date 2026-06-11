// Optimized images served from public/images/
// See scripts/optimize-images.js for the compression step
function img(n) {
  return `/images/Ely Homes Photography (${n} of 20).jpg`;
}

export const zuriImages = [
  img(1), img(2), img(3), img(4), img(5),
  img(6), img(7), img(8), img(9), img(10),
  img(11), img(12), img(13), img(14), img(15),
  img(16), img(17), img(18), img(19), img(20),
];

export const heroImage = img(13);
