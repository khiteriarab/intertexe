export interface Material {
  id: string;
  name: string;
  category: 'plant' | 'animal' | 'synthetic';
}

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
