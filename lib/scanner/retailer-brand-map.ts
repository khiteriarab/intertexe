/** Known retailer domains → display brand names (price tags + QR URLs). */
export const RETAILER_BRAND_MAP: Record<string, string> = {
  'zara.com': 'Zara',
  'zarahome.com': 'Zara Home',
  'hm.com': 'H&M',
  'mango.com': 'Mango',
  'uniqlo.com': 'Uniqlo',
  'cos.com': 'COS',
  'arket.com': 'Arket',
  'stories.com': '& Other Stories',
  'weekday.com': 'Weekday',
  'monki.com': 'Monki',
  'massimodutti.com': 'Massimo Dutti',
  'bershka.com': 'Bershka',
  'pullandbear.com': 'Pull&Bear',
  'stradivarius.com': 'Stradivarius',
  'oysho.com': 'Oysho',
  'brandymelville.com': 'Brandy Melville',
  'bmlondon.com': 'Brandy Melville',
  'gap.com': 'Gap',
  'bananarepublic.com': 'Banana Republic',
  'jcrew.com': 'J.Crew',
  'jcrewfactory.com': 'J.Crew Factory',
  'madewell.com': 'Madewell',
  'anthropologie.com': 'Anthropologie',
  'freepeople.com': 'Free People',
  'urbanoutfitters.com': 'Urban Outfitters',
  'asos.com': 'ASOS',
  'topshop.com': 'Topshop',
  'reiss.com': 'Reiss',
  'hobbs.co.uk': 'Hobbs',
  'lkbennett.com': 'LK Bennett',
  'whistles.com': 'Whistles',
  'frenchconnection.com': 'French Connection',
  'allsaints.com': 'AllSaints',
  'superdry.com': 'Superdry',
  'calvinklein.com': 'Calvin Klein',
  'tommy.com': 'Tommy Hilfiger',
  'tommyhilfiger.com': 'Tommy Hilfiger',
  'ralphlauren.com': 'Ralph Lauren',
  'lacoste.com': 'Lacoste',
  'guess.com': 'Guess',
  'diesel.com': 'Diesel',
  'levi.com': "Levi's",
  'levis.com': "Levi's",
  'wrangler.com': 'Wrangler',
  'nike.com': 'Nike',
  'adidas.com': 'Adidas',
  'puma.com': 'Puma',
  'newbalance.com': 'New Balance',
  'nordstrom.com': 'Nordstrom',
  'net-a-porter.com': 'Net-a-Porter',
  'ssense.com': 'SSENSE',
  'farfetch.com': 'Farfetch',
  'mytheresa.com': 'Mytheresa',
  'everlane.com': 'Everlane',
  'thereformation.com': 'Reformation',
  'cuyana.com': 'Cuyana',
  'khaite.com': 'Khaite',
  'aninebing.com': 'Anine Bing',
  'toteme.com': 'Toteme',
  'vince.com': 'Vince',
  'sandro-paris.com': 'Sandro',
  'maje.com': 'Maje',
  'ba-sh.com': 'Ba&sh',
  'rouje.com': 'Rouje',
  'sezane.com': 'Sézane',
  'theory.com': 'Theory',
  'eileenfisher.com': 'Eileen Fisher',
  'nanushka.com': 'Nanushka',
  'acnestudios.com': 'Acne Studios',
  'therow.com': 'The Row',
  'agolde.com': 'AGOLDE',
  'ganni.com': 'Ganni',
  'isabelmarant.com': 'Isabel Marant',
  'maxmara.com': 'Max Mara',
  'adolfodominguez.com': 'Adolfo Dominguez',
  'brunellocucinelli.com': 'Brunello Cucinelli',
  'loropiana.com': 'Loro Piana',
  'rag-bone.com': 'Rag & Bone',
  'frame-store.com': 'Frame',
  'shopframe.com': 'Frame',
  'agjeans.com': 'AG Jeans',
  '7forallmankind.com': '7 For All Mankind',
  'currentelliott.com': 'Current/Elliott',
  'motherdenim.com': 'Mother',
  'paige.com': 'PAIGE',
  'nili-lotan.com': 'Nili Lotan',
  'equipment.fr': 'Equipment',
  'apc.fr': 'A.P.C.',
  'zimmermann.com': 'Zimmermann',
  'faithfullthebrand.com': 'Faithfull the Brand',
  'posse.com': 'Posse',
  'alc.com': 'ALC',
  'lagence.com': "L'AGENCE",
};

const KNOWN_DOMAIN_SPLITS: Record<string, string> = {
  brandymelville: 'Brandy Melville',
  ralphlauren: 'Ralph Lauren',
  calvinklein: 'Calvin Klein',
  tommyhilfiger: 'Tommy Hilfiger',
  newbalance: 'New Balance',
  allsaints: 'AllSaints',
  frenchconnection: 'French Connection',
  urbanoutfitters: 'Urban Outfitters',
  freepeople: 'Free People',
  bananarepublic: 'Banana Republic',
  ragbone: 'Rag & Bone',
  currentelliott: 'Current/Elliott',
  massimodutti: 'Massimo Dutti',
  pullandbear: 'Pull&Bear',
  stradivarius: 'Stradivarius',
};

export function domainToBrandName(domain: string): string {
  const base = (domain.split('.')[0] || domain).toLowerCase();
  if (KNOWN_DOMAIN_SPLITS[base]) return KNOWN_DOMAIN_SPLITS[base];
  const withSpaces = domain.replace(/([a-z])([A-Z])/g, '$1 $2');
  if (!withSpaces) return domain;
  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

export function extractBrandFromURL(url: string): string | null {
  if (!url?.trim()) return null;
  try {
    const normalized = url.includes('://') ? url : `https://${url}`;
    const hostname = new URL(normalized).hostname.replace(/^www\./i, '').toLowerCase();

    for (const [domain, brand] of Object.entries(RETAILER_BRAND_MAP)) {
      if (hostname.includes(domain)) return brand;
    }

    const domainParts = hostname.split('.');
    if (domainParts.length >= 2) {
      const brandPart = domainParts[domainParts.length - 2];
      if (brandPart.length > 2) {
        return domainToBrandName(brandPart);
      }
    }

    return null;
  } catch {
    return null;
  }
}

export function extractBrandFromPriceTagText(ocrText: string): string | null {
  if (!ocrText?.trim()) return null;

  const lines = ocrText
    .split(/\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  for (const line of lines) {
    const lower = line.toLowerCase();

    if (lower.startsWith('art.') || lower.startsWith('ref.')) continue;
    if (lower.includes('talla') || lower.includes('size') || lower.includes('taille')) continue;
    if (/^\d/.test(line)) continue;
    if (lower.includes('%')) continue;
    if (/^[XSMLxsml]+$/.test(line)) continue;

    if (
      lower.includes('.com') ||
      lower.includes('.co.uk') ||
      lower.includes('.net') ||
      lower.includes('.es') ||
      lower.includes('.fr') ||
      lower.includes('.de') ||
      lower.includes('.it')
    ) {
      const token =
        line.split(/\s+/).find((part) => part.includes('.')) ?? line;
      const urlString = token.toLowerCase().includes('http') ? token : `https://${token}`;
      const brand = extractBrandFromURL(urlString);
      if (brand) return brand;
    }

    for (const [domain, brand] of Object.entries(RETAILER_BRAND_MAP)) {
      const brandLower = brand.toLowerCase();
      const domainBase = domain.split('.')[0] || '';
      if (lower.includes(brandLower) || (domainBase && lower.includes(domainBase))) {
        return brand;
      }
    }
  }

  return null;
}
