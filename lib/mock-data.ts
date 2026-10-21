import {
  Category,
  Product,
  Purchase,
  Customer,
  Sale,
  SaleItem,
  DueCollection,
} from '@/types/executive';

export const initialCategories: Category[] = [];

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
