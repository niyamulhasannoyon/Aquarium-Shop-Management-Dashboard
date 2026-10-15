import {
  Category,
  Product,
  Purchase,
  Customer,
  Sale,
  SaleItem,
  DueCollection,
} from '@/types/executive';

export const initialCategories: Category[] = [
  { id: 1, name: 'Guppy Fish (গ্যাপি মাছ)', created_at: '2026-01-01T10:00:00Z' },
  { id: 2, name: 'Betta & Fancy Fish (বেটা ও ফেন্সি মাছ)', created_at: '2026-01-01T10:00:00Z' },
  { id: 3, name: 'Aquarium Fish Food (মাছের খাবার)', created_at: '2026-01-01T10:00:00Z' },
  { id: 4, name: 'Water Care & Medicine (পানি শোধন ও ওষুধ)', created_at: '2026-01-01T10:00:00Z' },
  { id: 5, name: 'Filters & Accessories (ফিল্টার ও এক্সেসরিজ)', created_at: '2026-01-01T10:00:00Z' },
];

export const initialProducts: Product[] = [];

export const DEMO_PRODUCT_NAMES = new Set([
  'Dumbo Ear Red Tail Dragon Guppy (Pair / জোড়া)',
  'Full Red Albino Guppy (Pair / জোড়া)',
  'Black Prince Guppy (Pair / জোড়া)',
  'Halfmoon King Betta (Pcs / পিস)',
  'Crown Tail Fighter Betta (Pcs / পিস)',
  'Hikari Fancy Guppy Food 22g',
  'Tokyo Micro Pellets Fish Food 100g',
  'Anti-Chlorine Water Conditioner 120ml',
  'General Tonic Fish Medicine 100ml',
  'Soboo Bio Sponge Filter Medium',
]);

export const initialPurchases: Purchase[] = [];
export const initialCustomers: Customer[] = [];
export const initialSales: Sale[] = [];
export const initialSaleItems: SaleItem[] = [];
export const initialDueCollections: DueCollection[] = [];
