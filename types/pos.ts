export interface Product {
  id: number;
  name: string;
  category_id: number;
  category_name: string;
  default_unit: string;
  cost_price: number;
  selling_price: number;
  current_stock: number;
}

export interface Category {
  id: number;
  name: string;
  product_count: number;
}

export interface Customer {
  id: number;
  name: string;
  phone: string;
  address?: string;
  total_due: number;
}

export interface CartItem {
  productId: number;
  name: string;
  categoryName: string;
  unitType: 'Single' | 'Pair';
  quantity: number;
  multiplier: 1 | 2;
  price: number;
  costPrice: number;
  currentStock: number;
  subtotal: number;
}

export interface SaleItemReceipt {
  productId: number;
  name: string;
  unitType: string;
  quantity: number;
  multiplier: number;
  stockDeductQty: number;
  unitPrice: number;
  subtotal: number;
}

export interface SaleReceipt {
  id: number;
  invoiceNo: string;
  saleDate: string;
  customerName: string;
  customerPhone: string;
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  items: SaleItemReceipt[];
}
