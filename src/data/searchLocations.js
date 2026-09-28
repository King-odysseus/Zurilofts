export const ALL_KENYA_SEARCH = '__all_kenya__';
export const DEFAULT_SEARCH_LOCATION = 'Nairobi';

// Keep the default focused on Nairobi while still giving guests a clear path to
// discovery across the rest of Kenya as the catalogue expands.
export const SEARCH_LOCATION_GROUPS = [
  {
    label: 'Nairobi',
    options: [
      'Nairobi',
      'Nairobi CBD',
      'Upper Hill',
      'Ngara',
      'Pangani',
      'Eastleigh',
      'Huruma',
      'Kariokor',
      'Ziwani',
      'Mathare',
      'Westlands',
      'Parklands',
      'Highridge',
      'Riverside',
      'Kileleshwa',
      'Kilimani',
      'Lavington',
      'Spring Valley',
      'Loresho',
      'Kyuna',
      'Kitisuru',
      'Mountain View',
      'Kangemi',
      'Gigiri',
      'Runda',
      'Muthaiga',
      'Rosslyn',
      'Nyari',
      'Karen',
      'Langata',
      'Nairobi West',
      'South C',
      'South B',
      'Nyayo Highrise',
      'Otiende',
      'Mugumu-ini',
      'Magiwa',
      'Kibera',
      'Laini Saba',
      'Lindi',
      'Makina',
      'Woodley',
      'Kenyatta Golf Course',
      'Dagoretti',
      'Kawangware',
      'Gatina',
      'Kabiro',
      'Mutuini',
      'Ngando',
      'Riruta',
      'Uthiru',
      'Waithaka',
      'Roysambu',
      'Kahawa',
      'Kahawa West',
      'Zimmerman',
      'Githurai',
      'Mirema',
      'Kasarani',
      'Mwiki',
      'Njiru',
      'Ruai',
      'Kariobangi',
      'Dandora',
      'Umoja',
      'Buruburu',
      'Donholm',
      'Komarock',
      'Kayole',
      'Pipeline',
      'Tassia',
      'Embakasi',
      'Fedha',
      'Imara Daima',
      'Nyayo Estate',
      'Savannah',
      'Utawala',
    ],
  },
  {
    label: 'Nairobi Metro',
    options: ['Kiambu', 'Ruiru', 'Thika', 'Limuru', 'Kikuyu', 'Ngong', 'Rongai', 'Kitengela', 'Athi River', 'Syokimau'],
  },
  {
    label: 'Kenya Coast',
    options: ['Mombasa', 'Nyali', 'Bamburi', 'Shanzu', 'Diani', 'Ukunda', 'Kilifi', 'Watamu', 'Malindi', 'Vipingo', 'Lamu', 'Voi'],
  },
  {
    label: 'Central & Rift Valley',
    options: ['Naivasha', 'Nakuru', 'Elementaita', 'Nanyuki', 'Nyeri', 'Mount Kenya', 'Kericho', 'Eldoret', 'Iten', 'Narok', 'Maasai Mara', 'Amboseli'],
  },
  {
    label: 'Western & Nyanza',
    options: ['Kisumu', 'Kakamega', 'Bungoma', 'Kitale', 'Kisii', 'Homa Bay', 'Migori'],
  },
];

export const SEARCH_LOCATIONS = SEARCH_LOCATION_GROUPS.flatMap((group) => group.options);

// Prefer the most specific matching area when deriving an area from legacy
// free-text locations such as "Kilimani, Ngong Road, Nairobi".
export function findSearchLocation(value) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return '';
  return [...SEARCH_LOCATIONS]
    .sort((a, b) => b.length - a.length)
    .find((location) => normalized.includes(location.toLowerCase())) || '';
}
