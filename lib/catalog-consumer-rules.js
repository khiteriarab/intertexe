/**
 * Consumer catalog exclusion rules — shared by catalog-rules.js (no FTP / ingest deps).
 */

const WOMENS_APPAREL_TOKENS = [
  'dress', 'gown', 'skirt', 'blouse', 'top', 'shirt', 'knit', 'sweater', 'cardigan',
  'jumper', 'pant', 'trouser', 'jean', 'denim', 'coat', 'jacket', 'blazer', 'outerwear',
  'lingerie', 'swim', 'bikini', 'resort', 'loungewear', 'jumpsuit', 'romper', 'short',
  'apparel', 'clothing', 'women', 'woman', 'ladies',
];

function includesToken(haystack, needle) {
  const h = ` ${String(haystack || '').toLowerCase()} `;
  const n = String(needle || '').toLowerCase();
  return h.includes(` ${n} `) || h.includes(n);
}

export function isWomensApparelCategory(category = '', name = '') {
  const cat = String(category || '').toLowerCase();
  const nam = String(name || '').toLowerCase();
  if (!cat && !nam) return false;

  if ((includesToken(cat, 'men') || includesToken(cat, 'mens') || includesToken(nam, ' for men') || includesToken(nam, ' mens '))
    && !includesToken(cat, 'women') && !includesToken(cat, 'woman')
    && !includesToken(nam, 'women') && !includesToken(nam, 'woman')) {
    return false;
  }

  return WOMENS_APPAREL_TOKENS.some((tok) => includesToken(cat, tok) || includesToken(nam, tok));
}

export function consumerExclusionReason({
  category = '',
  name = '',
  composition = '',
  imageUrl = '',
  image_url,
  price = '',
  url = '',
  gender = '',
} = {}) {
  const img = imageUrl || image_url;
  if (!img || !String(img).trim()) return 'missing_image';
  const priceText = String(price || '').trim().toLowerCase();
  if (!priceText || ['n/a', 'na', '0', '0.00', '$0', '$0.00'].includes(priceText)) return 'missing_price';
  if (!url || !/^https?:\/\//i.test(String(url).trim())) return 'missing_url';
  if (!composition || !String(composition).trim()) return 'missing_composition';

  const cat = String(category || '').toLowerCase();
  const nam = String(name || '').toLowerCase();

  if (/(shoe|footwear|sandal|boot|sneaker|heel|pump|loafer|mule)/.test(cat) || /(shoe|sandal|boot|sneaker|heel|pump|loafer|mule)/.test(nam)) return 'shoes';
  if (/(bag|handbag|tote|clutch|pouch|wallet|backpack)/.test(cat) || /(handbag|tote bag|clutch)/.test(nam)) return 'bags';
  if (/(jewelry|jewellery|earring|necklace|bracelet|brooch)/.test(cat) || /(earring|necklace|bracelet|brooch)/.test(nam)) return 'jewelry';
  if (cat.includes('watch') || nam.includes(' watch ') || nam.startsWith('watch ')) return 'watches';
  if (/(belt|scarf|hat|cap|glove|sunglass|eyewear|accessory|accessories)/.test(cat)) return 'accessories';
  if ((cat.includes('mens') || cat.startsWith('men') || nam.includes(' for men') || nam.includes(' mens '))
    && !cat.includes('women') && !cat.includes('woman')
    && !nam.includes('women') && !nam.includes('woman')) return 'mens';
  if (/(kid|kids|child|children|girl|boy|baby|infant)/.test(cat)) return 'kids';
  if (/(beauty|fragrance|perfume|makeup|skincare|cosmetic|health|wellness)/.test(cat)) return 'beauty_home';
  if (/(bedding|sheet|pillow|duvet|towel|blanket|curtain|rug|home|kitchen|bath|pet|toy)/.test(cat)) return 'home';
  if (/(sheet|pillowcase|duvet|bedding|towel|blanket)/.test(nam)) return 'home';
  if (!isWomensApparelCategory(category, name)) return 'not_womens_apparel';
  return null;
}

export function passesConsumerIngestionGate(fields) {
  return consumerExclusionReason(fields) === null;
}
