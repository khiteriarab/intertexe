/** Known retailer domains → display brand names (price tags + QR URLs). */
export const RETAILER_BRAND_MAP: Record<string, string> = {
  'zara.com': 'Zara',
  'hm.com': 'H&M',
  'mango.com': 'Mango',
  'uniqlo.com': 'Uniqlo',
  'cos.com': 'COS',
  'arket.com': 'Arket',
  'stories.com': '& Other Stories',
  'weekday.com': 'Weekday',
  'massimodutti.com': 'Massimo Dutti',
  'bershka.com': 'Bershka',
  'pullandbear.com': 'Pull&Bear',
  'gap.com': 'Gap',
  'bananarepublic.com': 'Banana Republic',
  'jcrew.com': 'J.Crew',
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
  'khaite.com': 'Khaite',
  'aninebing.com': 'Anine Bing',
  'toteme.com': 'Totême',
  'vince.com': 'Vince',
  'sandro-paris.com': 'Sandro',
  'maje.com': 'Maje',
  'ba-sh.com': 'ba&sh',
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
};

const KNOWN_BRANDS = Object.values(RETAILER_BRAND_MAP);

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
        return brandPart.charAt(0).toUpperCase() + brandPart.slice(1);
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

  for (const line of lines.slice(0, 3)) {
    const lower = line.toLowerCase();

    if (/^\d/.test(line)) continue;
    if (/^[XSMLxsml]+$/.test(line)) continue;
    if (lower.includes('talla') || lower.includes('size') || lower.includes('taille')) continue;
    if (lower.includes('art.') || lower.includes('ref.')) continue;

    for (const brand of KNOWN_BRANDS) {
      if (lower.includes(brand.toLowerCase())) return brand;
    }

    if (line.includes('.com') || line.includes('.net') || line.includes('.co.uk')) {
      const brand = extractBrandFromURL(`https://${line.replace(/^https?:\/\//i, '')}`);
      if (brand) return brand;
    }

    if (line.length > 2 && line.length < 30 && /^[A-Za-z\s&'.]+$/.test(line)) {
      return line;
    }
  }

  return null;
}
