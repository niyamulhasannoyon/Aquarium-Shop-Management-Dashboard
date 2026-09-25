'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { Category, Product, Purchase, UnitType } from '@/types/inventory';
import { INITIAL_CATEGORIES, INITIAL_PRODUCTS } from '@/lib/seed-data';

interface InventoryContextType {
  categories: Category[];
  products: Product[];
  purchases: Purchase[];
  selectedCategoryId: number | null; // null means 'All'
  searchQuery: string;
  setSelectedCategoryId: (id: number | null) => void;
  setSearchQuery: (query: string) => void;
  addCategory: (name: string) => Category;
  addProduct: (product: {
    name: string;
    category_id: number;
    default_unit: UnitType;
    cost_price: number;
    selling_price: number;
    initial_stock?: number;
  }) => Product;
  editProduct: (id: number, updatedFields: Partial<Omit<Product, 'id' | 'created_at'>>) => void;
  quickRestock: (
    productId: number,
    quantity: number,
    unitCost: number,
    unitType?: UnitType,
    multiplier?: number
  ) => void;
  deleteProduct: (id: number) => void;
  toast: { message: string; type?: 'success' | 'info' | 'error' } | null;
  setToast: (toast: { message: string; type?: 'success' | 'info' | 'error' } | null) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

const STORAGE_KEYS = {
  CATEGORIES: 'niloy_shop_categories',
  PRODUCTS: 'niloy_shop_products',
  PURCHASES: 'niloy_shop_purchases',
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toast, setToastState] = useState<{ message: string; type?: 'success' | 'info' | 'error' } | null>(null);

  const setToast = (t: { message: string; type?: 'success' | 'info' | 'error' } | null) => {
    setToastState(t);
    if (t) {
      setTimeout(() => setToastState(null), 3500);
    }
  };

  // Load initial data from localStorage or fallback to seed data
  useEffect(() => {
    try {
      const savedCategories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
      const savedProducts = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const savedPurchases = localStorage.getItem(STORAGE_KEYS.PURCHASES);

      if (savedCategories) {
        setCategories(JSON.parse(savedCategories));
      } else {
        setCategories(INITIAL_CATEGORIES);
        localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      }

      if (savedProducts) {
        setProducts(JSON.parse(savedProducts));
      } else {
        setProducts(INITIAL_PRODUCTS);
        localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(INITIAL_PRODUCTS));
      }

      if (savedPurchases) {
        setPurchases(JSON.parse(savedPurchases));
      } else {
        setPurchases([]);
      }
    } catch (e) {
      console.error('Failed to load storage data:', e);
      setCategories(INITIAL_CATEGORIES);
      setProducts(INITIAL_PRODUCTS);
    }
  }, []);

  // Save to localStorage when state changes
  const saveCategories = (newCategories: Category[]) => {
    setCategories(newCategories);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(newCategories));
  };

  const saveProducts = (newProducts: Product[]) => {
    setProducts(newProducts);
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(newProducts));
  };

  const savePurchases = (newPurchases: Purchase[]) => {
    setPurchases(newPurchases);
    localStorage.setItem(STORAGE_KEYS.PURCHASES, JSON.stringify(newPurchases));
  };

  const addCategory = (name: string): Category => {
    const nextId = categories.length > 0 ? Math.max(...categories.map((c) => c.id)) + 1 : 1;
    const newCategory: Category = {
      id: nextId,
      name: name.trim(),
      created_at: new Date().toISOString(),
    };
    const updated = [...categories, newCategory];
    saveCategories(updated);
    setToast({ message: `Category "${newCategory.name}" added successfully!`, type: 'success' });
    return newCategory;
  };

  const addProduct = (data: {
    name: string;
    category_id: number;
    default_unit: UnitType;
    cost_price: number;
    selling_price: number;
    initial_stock?: number;
  }): Product => {
    const nextId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const newProduct: Product = {
      id: nextId,
      category_id: data.category_id,
      name: data.name.trim(),
      default_unit: data.default_unit,
      cost_price: Number(data.cost_price),
      selling_price: Number(data.selling_price),
      current_stock: Number(data.initial_stock || 0),
      created_at: new Date().toISOString(),
    };
    const updated = [...products, newProduct];
    saveProducts(updated);
    setToast({ message: `Product "${newProduct.name}" created successfully!`, type: 'success' });
    return newProduct;
  };

  const editProduct = (id: number, updatedFields: Partial<Omit<Product, 'id' | 'created_at'>>) => {
    const updated = products.map((p) => {
      if (p.id === id) {
        return {
          ...p,
          ...updatedFields,
          cost_price: updatedFields.cost_price !== undefined ? Number(updatedFields.cost_price) : p.cost_price,
          selling_price: updatedFields.selling_price !== undefined ? Number(updatedFields.selling_price) : p.selling_price,
          current_stock: updatedFields.current_stock !== undefined ? Number(updatedFields.current_stock) : p.current_stock,
        };
      }
      return p;
    });
    saveProducts(updated);
    const prod = products.find((p) => p.id === id);
    setToast({ message: `Product "${prod?.name || 'Item'}" updated successfully!`, type: 'success' });
  };

  const quickRestock = (
    productId: number,
    quantity: number,
    unitCost: number,
    unitType?: UnitType,
    multiplier: number = 1
  ) => {
    const targetProduct = products.find((p) => p.id === productId);
    if (!targetProduct) return;

    const actualUnitType = unitType || targetProduct.default_unit;
    const totalPiecesAdded = quantity * multiplier;
    const totalInvestment = quantity * unitCost;

    const newPurchaseId = purchases.length > 0 ? Math.max(...purchases.map((p) => p.id)) + 1 : 1;
    const newPurchase: Purchase = {
      id: newPurchaseId,
      product_id: productId,
      unit_type: actualUnitType,
      quantity,
      multiplier,
      total_pieces_added: totalPiecesAdded,
      unit_cost: unitCost,
      total_investment: totalInvestment,
      purchase_date: new Date().toISOString(),
    };

    savePurchases([...purchases, newPurchase]);

    // Update product stock and optionally update cost_price if desired
    const updatedProducts = products.map((p) => {
      if (p.id === productId) {
        return {
          ...p,
          current_stock: p.current_stock + totalPiecesAdded,
          cost_price: unitCost > 0 ? unitCost : p.cost_price,
        };
      }
      return p;
    });
    saveProducts(updatedProducts);

    setToast({
      message: `Restocked ${totalPiecesAdded} ${actualUnitType}(s) for "${targetProduct.name}"!`,
      type: 'success',
    });
  };

  const deleteProduct = (id: number) => {
    const prod = products.find((p) => p.id === id);
    const updated = products.filter((p) => p.id !== id);
    saveProducts(updated);
    setToast({ message: `Product "${prod?.name || 'Item'}" deleted`, type: 'info' });
  };

  return (
    <InventoryContext.Provider
      value={{
        categories,
        products,
        purchases,
        selectedCategoryId,
        searchQuery,
        setSelectedCategoryId,
        setSearchQuery,
        addCategory,
        addProduct,
        editProduct,
        quickRestock,
        deleteProduct,
        toast,
        setToast,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};

export const useInventory = () => {
  const context = useContext(InventoryContext);
  if (!context) {
    throw new Error('useInventory must be used within an InventoryProvider');
  }
  return context;
};
