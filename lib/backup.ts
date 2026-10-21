import { Category, Product, Customer, Sale, SaleItem, Purchase, DueCollection } from '@/types/executive';

export interface BackupData {
  categories: Category[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  saleItems: SaleItem[];
  purchases: Purchase[];
  dueCollections: DueCollection[];
}

export interface BackupPayload {
  system: string;
  version: string;
  exportedAt: string;
  summary: {
    categoriesCount: number;
    productsCount: number;
    customersCount: number;
    salesCount: number;
    purchasesCount: number;
    dueCollectionsCount: number;
  };
  data: {
    categories: Category[];
    products: Product[];
    customers: Customer[];
    sales: Sale[];
    sale_items: SaleItem[];
    purchases: Purchase[];
    due_collections: DueCollection[];
  };
}

export function generateBackupJson(data: BackupData): string {
  const payload: BackupPayload = {
    system: 'Aqua Place BD - Retail POS & Inventory Management System',
    version: '2.0.0',
    exportedAt: new Date().toISOString(),
    summary: {
      categoriesCount: data.categories?.length || 0,
      productsCount: data.products?.length || 0,
      customersCount: data.customers?.length || 0,
      salesCount: data.sales?.length || 0,
      purchasesCount: data.purchases?.length || 0,
      dueCollectionsCount: data.dueCollections?.length || 0,
    },
    data: {
      categories: data.categories || [],
      products: data.products || [],
      customers: data.customers || [],
      sales: data.sales || [],
      sale_items: data.saleItems || [],
      purchases: data.purchases || [],
      due_collections: data.dueCollections || [],
    },
  };

  return JSON.stringify(payload, null, 2);
}

export function downloadSystemBackup(data: BackupData, filenamePrefix = 'aqua-place-bd-backup'): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const jsonStr = generateBackupJson(data);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');

    const now = new Date();
    const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
      now.getDate()
    ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;

    a.href = url;
    a.download = `${filenamePrefix}-${dateFormatted}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return true;
  } catch (err) {
    console.error('Failed to download system backup file:', err);
    return false;
  }
}
