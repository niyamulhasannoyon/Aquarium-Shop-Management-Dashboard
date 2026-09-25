'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  Store,
  RefreshCw,
  Clock,
  Layers,
  Sparkles,
  FolderPlus,
} from 'lucide-react';
import {
  Category,
  Product,
  Purchase,
  Customer,
  Sale,
  SaleItem,
  DueCollection,
} from '@/types/executive';
import {
  initialCategories,
  initialProducts,
  initialPurchases,
  initialCustomers,
  initialSales,
  initialSaleItems,
  initialDueCollections,
} from '@/lib/mock-data';
import {
  calculateAllMetrics,
  getRecentSales,
  getLowStockProducts,
} from '@/lib/calculations';
import { KpiSummaryCards } from '@/components/kpi-summary-cards';
import { QuickActions } from '@/components/quick-actions';
import { RecentSalesList } from '@/components/recent-sales-list';
import { LowStockWarningTable } from '@/components/low-stock-warning-table';
import { NewSaleModal } from '@/components/modals/new-sale-modal';
import { AddStockModal } from '@/components/modals/add-stock-modal';
import { AddProductModal } from '@/components/modals/add-product-modal';
import { CollectDueModal } from '@/components/modals/collect-due-modal';
import { AddCategoryModal } from '@/components/modals/add-category-modal';

export const ExecutiveDashboard: React.FC = () => {
  // Application Data States initialized with PostgreSQL schema mock data
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [saleItems, setSaleItems] = useState<SaleItem[]>(initialSaleItems);
  const [_dueCollections, setDueCollections] = useState<DueCollection[]>(initialDueCollections);

  // Modal State Triggers
  const [activeModal, setActiveModal] = useState<
    'none' | 'new_sale' | 'add_stock' | 'add_product' | 'collect_due' | 'add_category'
  >('none');
  const [restockProductId, setRestockProductId] = useState<number | null>(null);

  // Fetch real database data if backend is available
  useEffect(() => {
    async function loadBackendData() {
      try {
        const res = await fetch('/api/dashboard/overview');
        const data = await res.json();
        if (data.success && !data.isFallback) {
          // Live API connection available
        }
      } catch (err) {
        // Fallback to local state
      }
    }
    loadBackendData();
  }, []);

  // Compute 5 Top KPI Metrics live
  const kpiMetrics = useMemo(() => {
    return calculateAllMetrics({
      purchases,
      sales,
      customers,
      saleItems,
      products,
    });
  }, [purchases, sales, customers, saleItems, products]);

  // Compute Last 5 Sales Invoices live
  const recentSales = useMemo(() => {
    return getRecentSales(sales, customers, 5);
  }, [sales, customers]);

  // Compute Low Stock Warnings live (threshold = 10 units)
  const lowStockItems = useMemo(() => {
    return getLowStockProducts(products, categories, 10);
  }, [products, categories]);

  // Handle Quick Actions
  const handleOpenNewSale = () => setActiveModal('new_sale');
  const handleOpenAddStock = (productId?: number) => {
    if (productId) setRestockProductId(productId);
    else setRestockProductId(null);
    setActiveModal('add_stock');
  };
  const handleOpenAddProduct = () => setActiveModal('add_product');
  const handleOpenCollectDue = () => setActiveModal('collect_due');
  const handleOpenAddCategory = () => setActiveModal('add_category');

  // Category Addition Handler
  const handleAddCategory = (categoryName: string) => {
    const newCatId = categories.length > 0 ? Math.max(...categories.map((c) => c.id)) + 1 : 1;
    const newCat: Category = {
      id: newCatId,
      name: categoryName,
      created_at: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCat]);
  };

  // Submit Handlers simulating PostgreSQL triggers
  const handleCreateSale = (saleData: {
    customer_id: number | null;
    items: Array<{
      product_id: number;
      unit_type: string;
      quantity: number;
      multiplier: number;
      unit_price: number;
      cost_price_snapshot: number;
      subtotal: number;
    }>;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
  }) => {
    const newSaleId = sales.length > 0 ? Math.max(...sales.map((s) => s.id)) + 1 : 1;
    const invoiceNo = `INV-2026-${String(newSaleId).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    const newSale: Sale = {
      id: newSaleId,
      invoice_no: invoiceNo,
      customer_id: saleData.customer_id,
      total_amount: saleData.total_amount,
      paid_amount: saleData.paid_amount,
      due_amount: saleData.due_amount,
      sale_date: nowIso,
    };

    const newItems: SaleItem[] = saleData.items.map((item, idx) => {
      const stockDeductQty = item.quantity * item.multiplier;
      return {
        id: saleItems.length + idx + 1,
        sale_id: newSaleId,
        product_id: item.product_id,
        unit_type: item.unit_type,
        quantity: item.quantity,
        multiplier: item.multiplier,
        stock_deduct_qty: stockDeductQty,
        unit_price: item.unit_price,
        cost_price_snapshot: item.cost_price_snapshot,
        subtotal: item.subtotal,
      };
    });

    // Trigger 2: Deduct product stock on sale item insertion (quantity * multiplier)
    setProducts((prev) =>
      prev.map((prod) => {
        const itemDeduct = saleData.items.find((i) => i.product_id === prod.id);
        if (itemDeduct) {
          const deductTotal = itemDeduct.quantity * itemDeduct.multiplier;
          return {
            ...prod,
            current_stock: Math.max(0, prod.current_stock - deductTotal),
          };
        }
        return prod;
      })
    );

    // Trigger 3: Increment customer total_due on sale insertion if due_amount > 0
    if (saleData.due_amount > 0 && saleData.customer_id !== null) {
      setCustomers((prev) =>
        prev.map((c) =>
          c.id === saleData.customer_id
            ? { ...c, total_due: c.total_due + saleData.due_amount }
            : c
        )
      );
    }

    setSales((prev) => [newSale, ...prev]);
    setSaleItems((prev) => [...prev, ...newItems]);
  };

  const handleAddStock = (stockData: {
    product_id: number;
    unit_type: string;
    quantity: number;
    unit_cost: number;
    total_investment: number;
  }) => {
    const newPurchaseId = purchases.length > 0 ? Math.max(...purchases.map((p) => p.id)) + 1 : 1;
    const nowIso = new Date().toISOString();

    const newPurchase: Purchase = {
      id: newPurchaseId,
      product_id: stockData.product_id,
      unit_type: stockData.unit_type,
      quantity: stockData.quantity,
      multiplier: 1,
      total_pieces_added: stockData.quantity,
      unit_cost: stockData.unit_cost,
      total_investment: stockData.total_investment,
      purchase_date: nowIso,
    };

    // Trigger 1: Increment product stock on purchase insertion
    setProducts((prev) =>
      prev.map((p) =>
        p.id === stockData.product_id
          ? { ...p, current_stock: p.current_stock + stockData.quantity, cost_price: stockData.unit_cost }
          : p
      )
    );

    setPurchases((prev) => [newPurchase, ...prev]);
  };

  const handleAddProduct = (prodData: {
    name: string;
    category_id: number;
    default_unit: string;
    cost_price: number;
    selling_price: number;
    initial_stock: number;
  }) => {
    const newProductId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const nowIso = new Date().toISOString();

    const newProd: Product = {
      id: newProductId,
      category_id: prodData.category_id,
      name: prodData.name,
      default_unit: prodData.default_unit,
      cost_price: prodData.cost_price,
      selling_price: prodData.selling_price,
      current_stock: prodData.initial_stock,
      created_at: nowIso,
    };

    setProducts((prev) => [...prev, newProd]);

    // Add initial purchase entry if initial_stock > 0
    if (prodData.initial_stock > 0) {
      const newPurchaseId = purchases.length > 0 ? Math.max(...purchases.map((p) => p.id)) + 1 : 1;
      const initialPurchase: Purchase = {
        id: newPurchaseId,
        product_id: newProductId,
        unit_type: prodData.default_unit,
        quantity: prodData.initial_stock,
        multiplier: 1,
        total_pieces_added: prodData.initial_stock,
        unit_cost: prodData.cost_price,
        total_investment: prodData.initial_stock * prodData.cost_price,
        purchase_date: nowIso,
      };
      setPurchases((prev) => [initialPurchase, ...prev]);
    }
  };

  const handleCollectDue = (collectionData: {
    customer_id: number;
    amount_paid: number;
    note: string;
  }) => {
    const newCollId = _dueCollections.length > 0 ? Math.max(..._dueCollections.map((dc) => dc.id)) + 1 : 1;
    const nowIso = new Date().toISOString();

    const newCollection: DueCollection = {
      id: newCollId,
      customer_id: collectionData.customer_id,
      amount_paid: collectionData.amount_paid,
      note: collectionData.note,
      payment_date: nowIso,
    };

    // Trigger 4: Deduct customer total_due on collection insertion
    setCustomers((prev) =>
      prev.map((c) =>
        c.id === collectionData.customer_id
          ? { ...c, total_due: Math.max(0, c.total_due - collectionData.amount_paid) }
          : c
      )
    );

    setDueCollections((prev) => [newCollection, ...prev]);
  };

  const handleResetData = () => {
    setCategories(initialCategories);
    setProducts(initialProducts);
    setPurchases(initialPurchases);
    setCustomers(initialCustomers);
    setSales(initialSales);
    setSaleItems(initialSaleItems);
    setDueCollections(initialDueCollections);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 backdrop-blur-xl shadow-xl">
          <div className="flex items-center space-x-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/20 text-white">
              <Store className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Niloy Friend Shop
                </h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Executive Dashboard
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1 text-slate-500" />
                Real-time Retail & Inventory Analytics • Updated 2026-09-25
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 self-end md:self-auto">
            <button
              onClick={handleOpenAddCategory}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white transition-all shadow-sm"
              title="Add a new product category"
            >
              <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
              + Category
            </button>
            <button
              onClick={handleResetData}
              className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-all shadow-sm"
              title="Reset dataset to initial state"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Reset Demo Data
            </button>
            <div className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-300 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              Products: <strong className="text-white ml-1">{products.length}</strong>
            </div>
          </div>
        </div>

        {/* 1. Top KPI Summary Cards */}
        <section>
          <KpiSummaryCards metrics={kpiMetrics} />
        </section>

        {/* 2. Quick Action Shortcuts */}
        <section>
          <QuickActions
            onOpenNewSale={handleOpenNewSale}
            onOpenAddStock={() => handleOpenAddStock()}
            onOpenAddProduct={handleOpenAddProduct}
            onOpenCollectDue={handleOpenCollectDue}
          />
        </section>

        {/* 3. Recent Activity Lists (2-Column Layout) */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentSalesList sales={recentSales} />
          <LowStockWarningTable
            lowStockItems={lowStockItems}
            onRestockItem={(prodId) => handleOpenAddStock(prodId)}
          />
        </section>

        {/* Action Modals */}
        <NewSaleModal
          isOpen={activeModal === 'new_sale'}
          onClose={() => setActiveModal('none')}
          customers={customers}
          products={products}
          onSubmitSale={handleCreateSale}
        />

        <AddStockModal
          isOpen={activeModal === 'add_stock'}
          onClose={() => setActiveModal('none')}
          products={products}
          initialProductId={restockProductId}
          onSubmitStock={handleAddStock}
        />

        <AddProductModal
          isOpen={activeModal === 'add_product'}
          onClose={() => setActiveModal('none')}
          categories={categories}
          onSubmitProduct={handleAddProduct}
          onAddCategory={handleAddCategory}
        />

        <CollectDueModal
          isOpen={activeModal === 'collect_due'}
          onClose={() => setActiveModal('none')}
          customers={customers}
          onSubmitCollection={handleCollectDue}
        />

        <AddCategoryModal
          isOpen={activeModal === 'add_category'}
          onClose={() => setActiveModal('none')}
          onSubmitCategory={handleAddCategory}
        />
      </div>
    </div>
  );
};
