// Mock data for the frontend prototype

export interface Designer {
  id: string;
  name: string;
  slug: string;
  status: 'pending' | 'processed' | 'live';
  natural_fiber_percent: number;
  description?: string;
  image?: string;
}

export interface Material {
  id: string;
  name: string;
  category: 'plant' | 'animal' | 'synthetic';
  image?: string;
}

export const DESIGNERS: Designer[] = [
  { id: '1', name: 'The Row', slug: 'the-row', status: 'live', natural_fiber_percent: 92, description: 'Exceptional fabrics, impeccable details, and precise tailoring.' },
  { id: '2', name: 'Loro Piana', slug: 'loro-piana', status: 'live', natural_fiber_percent: 98, description: 'The finest cashmere and wool products in the world.' },
  { id: '3', name: 'Khaite', slug: 'khaite', status: 'live', natural_fiber_percent: 85, description: 'Balancing opposing elements to create signature silhouettes.' },
  { id: '4', name: 'Brunello Cucinelli', slug: 'brunello-cucinelli', status: 'live', natural_fiber_percent: 96, description: 'Luxury craftsmanship rooted in humanist capitalism.' },
  { id: '5', name: 'Toteme', slug: 'toteme', status: 'live', natural_fiber_percent: 82, description: 'Exploring the appeal of a modern uniform through distinct design cues.' },
  { id: '6', name: 'Jil Sander', slug: 'jil-sander', status: 'live', natural_fiber_percent: 90, description: 'Purity, minimalism, and high-quality materials.' },
  { id: '7', name: 'Eileen Fisher', slug: 'eileen-fisher', status: 'live', natural_fiber_percent: 88, description: 'Simple shapes and beautiful, sustainable fabrics.' },
  { id: '8', name: 'Nanushka', slug: 'nanushka', status: 'live', natural_fiber_percent: 75, description: 'Modern bohemian aesthetic with an emphasis on craftsmanship.' },
];

export const MATERIALS: Material[] = [
  { id: 'm1', name: 'Cotton', category: 'plant' },
  { id: 'm2', name: 'Silk', category: 'animal' },
  { id: 'm3', name: 'Linen', category: 'plant' },
  { id: 'm4', name: 'Wool', category: 'animal' },
  { id: 'm5', name: 'Cashmere', category: 'animal' },
  { id: 'm6', name: 'Leather', category: 'animal' },
  { id: 'm7', name: 'Denim', category: 'plant' },
  { id: 'm8', name: 'Tencel / Modal', category: 'synthetic' },
  { id: 'm9', name: 'Viscose / Rayon', category: 'synthetic' },
  { id: 'm10', name: 'Alpaca', category: 'animal' },
];

export const MOCK_USER = {
  id: 'u1',
  name: 'Jane Doe',
  email: 'jane@example.com',
  favorites: ['1', '3', '5'] // Designer IDs
};
