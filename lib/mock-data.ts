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
  { id: 1, name: 'Live Fish (একুরিয়াম মাছ)', created_at: '2026-01-01T10:00:00Z' },
  { id: 2, name: 'Fish Food (মাছের খাবার)', created_at: '2026-01-01T10:00:00Z' },
  { id: 3, name: 'Aquarium Plants (জলজ উদ্ভিদ ও গাছ)', created_at: '2026-01-01T10:00:00Z' },
  { id: 4, name: 'Filters & Aeration (ফিল্টার ও অক্সিজেন)', created_at: '2026-01-01T10:00:00Z' },
  { id: 5, name: 'Water Care & Medicine (ওষুধ ও পানি শোধন)', created_at: '2026-01-01T10:00:00Z' },
  { id: 6, name: 'Aquarium Tanks (একুরিয়াম ট্যাংক)', created_at: '2026-01-01T10:00:00Z' },
  { id: 7, name: 'Lights & Heaters (লাইট ও হিটার)', created_at: '2026-01-01T10:00:00Z' },
  { id: 8, name: 'Soil, Sand & Decor (মাটি, বালি ও শো-পিস)', created_at: '2026-01-01T10:00:00Z' },
  { id: 9, name: 'Accessories & Tools (এক্সেসরিজ ও পাইপ)', created_at: '2026-01-01T10:00:00Z' },
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
