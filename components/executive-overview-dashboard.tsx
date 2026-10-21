'use client';

import React, { useState, useMemo, useEffect } from 'react';
import Image from 'next/image';
import {
  Store,
  Clock,
  Layers,
  UserPlus,
  Users,
  Calendar,
  BookOpen,
  BarChart3,
  Lock,
  PackagePlus,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Info,
  X,
} from 'lucide-react';
import { lockSiteSystem } from '@/components/passcode-gate';
import {
  Category,
  Product,
  Purchase,
  Customer,
  Sale,
  SaleItem,
  DueCollection,
  TimeframePeriod,
} from '@/types/executive';
import {
  initialCategories,
  initialProducts,
  initialPurchases,
  initialCustomers,
  initialSales,
  initialSaleItems,
  initialDueCollections,
  DEMO_PRODUCT_NAMES,
} from '@/lib/mock-data';
import {
  calculateMetricsForTimeframe,
  getRecentSales,
  getLowStockProducts,
  deduplicateCategories,
} from '@/lib/calculations';
import { KpiSummaryCards } from '@/components/kpi-summary-cards';
import { QuickActions } from '@/components/quick-actions';
import { RecentSalesList } from '@/components/recent-sales-list';
import { LowStockWarningTable } from '@/components/low-stock-warning-table';
import { DailyActivityLedger } from '@/components/daily-activity-ledger';
import { DueManagementLedger } from '@/components/due-management-ledger';
import { ProductInventoryLedger } from '@/components/product-inventory-ledger';
import { NewSaleModal } from '@/components/modals/new-sale-modal';
import { AddStockModal } from '@/components/modals/add-stock-modal';
import { AddProductModal } from '@/components/modals/add-product-modal';
import { EditProductModal } from '@/components/modals/edit-product-modal';
import { CollectDueModal } from '@/components/modals/collect-due-modal';
import { AddCategoryModal } from '@/components/modals/add-category-modal';
import { ManageCategoriesModal } from '@/components/modals/manage-categories-modal';
import { AddCustomerModal } from '@/components/modals/add-customer-modal';
import { CustomerProfileModal } from '@/components/modals/customer-profile-modal';
import { DeleteCustomerModal } from '@/components/modals/delete-customer-modal';
import { DeleteProductModal } from '@/components/modals/delete-product-modal';
import { EditStockModal } from '@/components/modals/edit-stock-modal';
import { DeleteStockModal } from '@/components/modals/delete-stock-modal';
import { MonthlyStockLedger } from '@/components/monthly-stock-ledger';
import { SystemResetModal } from '@/components/modals/system-reset-modal';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useLanguage } from '@/context/language-context';
import { createClient as createSupabaseClient } from '@/utils/supabase/client';

export const ExecutiveDashboard: React.FC = () => {
  const { t, language, formatNumber } = useLanguage();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'stock_history' | 'daily_ledger' | 'due_khata'>('overview');
  const [overviewTimeframe, setOverviewTimeframe] = useState<TimeframePeriod>('overall');

  // Cloud Sync state
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // LocalStorage storage keys for bulletproof offline & refresh resilience
  const STORAGE_KEYS = {
    CATEGORIES: 'aqua_shop_categories_v2',
    PRODUCTS: 'aqua_shop_products_v2',
    DELETED_PRODUCT_IDS: 'aqua_shop_deleted_product_ids_v2',
    PURCHASES: 'aqua_shop_purchases_v2',
    CUSTOMERS: 'aqua_shop_customers_v2',
    SALES: 'aqua_shop_sales_v2',
    SALE_ITEMS: 'aqua_shop_sale_items_v2',
    DUE_COLLECTIONS: 'aqua_shop_due_collections_v2',
  };

  const saveStorage = <T,>(key: string, data: T) => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error('Storage error:', e);
    }
  };

  // Application Data States initialized with PostgreSQL schema mock data
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [purchases, setPurchases] = useState<Purchase[]>(initialPurchases);
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers);
  const [sales, setSales] = useState<Sale[]>(initialSales);
  const [saleItems, setSaleItems] = useState<SaleItem[]>(initialSaleItems);
  const [dueCollections, setDueCollections] = useState<DueCollection[]>(initialDueCollections);

  // Modal State Triggers
  const [activeModal, setActiveModal] = useState<
    'none' | 'new_sale' | 'add_stock' | 'add_product' | 'collect_due' | 'add_category' | 'add_customer' | 'customer_profile' | 'manage_categories'
  >('none');
  const [restockProductId, setRestockProductId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleteProductOpen, setIsDeleteProductOpen] = useState(false);
  const [editingPurchase, setEditingPurchase] = useState<Purchase | null>(null);
  const [isEditStockOpen, setIsEditStockOpen] = useState(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<Purchase | null>(null);
  const [isDeleteStockOpen, setIsDeleteStockOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ message, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isDifferent = (prevList: any[], nextList: any[]) => {
    if (prevList.length !== nextList.length) return true;
    return JSON.stringify(prevList) !== JSON.stringify(nextList);
  };

  const applySyncedState = (data: any) => {
    if (!data || !data.success) return;

    if (Array.isArray(data.categories)) {
      const deduped = deduplicateCategories(data.categories);
      setCategories((prev) => {
        if (!isDifferent(prev, deduped)) return prev;
        saveStorage(STORAGE_KEYS.CATEGORIES, deduped);
        return deduped;
      });
    }
    if (Array.isArray(data.products)) {
      let deletedSet = new Set<number>();
      try {
        const localDeleted = localStorage.getItem(STORAGE_KEYS.DELETED_PRODUCT_IDS);
        if (localDeleted) {
          const parsed = JSON.parse(localDeleted);
          if (Array.isArray(parsed)) deletedSet = new Set(parsed);
        }
      } catch {}

      const cleaned = data.products
        .filter(
          (p: Product) => p && !DEMO_PRODUCT_NAMES.has(p.name) && !deletedSet.has(p.id) && !p.is_deleted
        )
        .map((p: Product) => ({
          ...p,
          current_stock: Math.max(0, Number(p.current_stock) || 0),
          cost_price: Math.max(0, Number(p.cost_price) || 0),
          selling_price: Math.max(0, Number(p.selling_price) || 0),
        }));
      setProducts((prev) => {
        if (!isDifferent(prev, cleaned)) return prev;
        saveStorage(STORAGE_KEYS.PRODUCTS, cleaned);
        return cleaned;
      });
    }
    if (Array.isArray(data.customers)) {
      setCustomers((prev) => {
        if (!isDifferent(prev, data.customers)) return prev;
        saveStorage(STORAGE_KEYS.CUSTOMERS, data.customers);
        return data.customers;
      });
    }
    if (Array.isArray(data.sales)) {
      setSales((prev) => {
        if (!isDifferent(prev, data.sales)) return prev;
        saveStorage(STORAGE_KEYS.SALES, data.sales);
        return data.sales;
      });
    }
    if (Array.isArray(data.sale_items)) {
      setSaleItems((prev) => {
        if (!isDifferent(prev, data.sale_items)) return prev;
        saveStorage(STORAGE_KEYS.SALE_ITEMS, data.sale_items);
        return data.sale_items;
      });
    }
    if (Array.isArray(data.purchases)) {
      setPurchases((prev) => {
        if (!isDifferent(prev, data.purchases)) return prev;
        saveStorage(STORAGE_KEYS.PURCHASES, data.purchases);
        return data.purchases;
      });
    }
    if (Array.isArray(data.due_collections)) {
      setDueCollections((prev) => {
        if (!isDifferent(prev, data.due_collections)) return prev;
        saveStorage(STORAGE_KEYS.DUE_COLLECTIONS, data.due_collections);
        return data.due_collections;
      });
    }
    setSyncStatus('synced');
    setLastSyncTime(new Date().toLocaleTimeString());
  };

  // Hydrate from localStorage first and sync bidirectionally with PostgreSQL database
  useEffect(() => {
    let localDataToSync: any = null;
    if (typeof window !== 'undefined') {
      try {
        const localCats = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        let parsedCats = localCats ? JSON.parse(localCats) : null;
        if (Array.isArray(parsedCats)) {
          const deduped = deduplicateCategories(parsedCats);
          setCategories(deduped);
          parsedCats = deduped;
        }

        let deletedSet = new Set<number>();
        try {
          const localDeleted = localStorage.getItem(STORAGE_KEYS.DELETED_PRODUCT_IDS);
          if (localDeleted) {
            const parsed = JSON.parse(localDeleted);
            if (Array.isArray(parsed)) deletedSet = new Set(parsed);
          }
        } catch {}

        const localProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        let parsedProds = localProds ? JSON.parse(localProds) : null;
        if (Array.isArray(parsedProds)) {
          const cleaned = parsedProds
            .filter(
              (p: Product) => p && !DEMO_PRODUCT_NAMES.has(p.name) && !deletedSet.has(p.id) && !p.is_deleted
            )
            .map((p: Product) => ({
              ...p,
              current_stock: Math.max(0, Number(p.current_stock) || 0),
              cost_price: Math.max(0, Number(p.cost_price) || 0),
              selling_price: Math.max(0, Number(p.selling_price) || 0),
            }));
          setProducts(cleaned);
          parsedProds = cleaned;
        }

        const localPurchs = localStorage.getItem(STORAGE_KEYS.PURCHASES);
        let parsedPurchs = localPurchs ? JSON.parse(localPurchs) : null;
        if (Array.isArray(parsedPurchs)) setPurchases(parsedPurchs);

        const localCusts = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        let parsedCusts = localCusts ? JSON.parse(localCusts) : null;
        if (Array.isArray(parsedCusts)) setCustomers(parsedCusts);

        const localSales = localStorage.getItem(STORAGE_KEYS.SALES);
        let parsedSales = localSales ? JSON.parse(localSales) : null;
        if (Array.isArray(parsedSales)) setSales(parsedSales);

        const localItems = localStorage.getItem(STORAGE_KEYS.SALE_ITEMS);
        let parsedItems = localItems ? JSON.parse(localItems) : null;
        if (Array.isArray(parsedItems)) setSaleItems(parsedItems);

        const localDues = localStorage.getItem(STORAGE_KEYS.DUE_COLLECTIONS);
        let parsedDues = localDues ? JSON.parse(localDues) : null;
        if (Array.isArray(parsedDues)) setDueCollections(parsedDues);

        // If client has offline items, prepare snapshot to sync to PostgreSQL
        if (
          (parsedCats && parsedCats.length > 0) ||
          (parsedProds && parsedProds.length > 0) ||
          (parsedSales && parsedSales.length > 0) ||
          (parsedPurchs && parsedPurchs.length > 0)
        ) {
          localDataToSync = {
            categories: parsedCats || [],
            products: parsedProds || [],
            customers: parsedCusts || [],
            purchases: parsedPurchs || [],
            sales: parsedSales || [],
            sale_items: parsedItems || [],
            due_collections: parsedDues || [],
          };
        }
      } catch (e) {
        console.error('Failed reading localStorage cache:', e);
      }
    }

    // Realtime Auto-Sync Engine
    async function syncData(isBackground = false) {
      if (!isBackground) setSyncStatus('syncing');
      try {
        let res;
        if (localDataToSync) {
          res = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localDataToSync),
          });
          localDataToSync = null; // Clear snapshot once uploaded
        } else {
          res = await fetch('/api/sync');
        }
        const data = await res.json();
        if (data?.success) {
          applySyncedState(data);
        } else if (!isBackground) {
          setSyncStatus('offline');
        }
      } catch {
        if (!isBackground) setSyncStatus('offline');
      }
    }

    // Initial sync
    syncData(false);

    // Fast active background auto-sync interval (every 3.5s for seamless multi-device updates)
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        syncData(true);
      }
    }, 3500);

    // Instant re-sync on window focus, tab visibility, or internet reconnect
    const onFocus = () => syncData(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncData(true);
    };

    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Cross-tab / cross-window instant auto-sync via BroadcastChannel
    let broadcast: BroadcastChannel | null = null;
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        broadcast = new BroadcastChannel('aqua_shop_sync_channel');
        broadcast.onmessage = (event) => {
          if (event.data?.type === 'SYNC') {
            syncData(true);
          } else if (event.data?.type === 'SYSTEM_RESET') {
            try {
              const keysToClear = [
                STORAGE_KEYS.CATEGORIES,
                STORAGE_KEYS.PRODUCTS,
                STORAGE_KEYS.PURCHASES,
                STORAGE_KEYS.CUSTOMERS,
                STORAGE_KEYS.SALES,
                STORAGE_KEYS.SALE_ITEMS,
                STORAGE_KEYS.DUE_COLLECTIONS,
                'niloy_shop_categories',
                'niloy_shop_products',
                'niloy_shop_purchases',
              ];
              keysToClear.forEach((k) => localStorage.removeItem(k));
            } catch {}
            syncData(false);
          }
        };
      } catch {}
    }

    // Supabase Realtime WebSocket subscription for instant multi-device auto-sync
    let supabaseChannel: any = null;
    try {
      const supabase = createSupabaseClient();
      if (supabase) {
        supabaseChannel = supabase
          .channel('realtime_executive_sync')
          .on('postgres_changes', { event: '*', schema: 'public' }, () => {
            syncData(true);
          })
          .subscribe();
      }
    } catch {}

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      broadcast?.close();
      if (supabaseChannel) {
        try {
          createSupabaseClient()?.removeChannel(supabaseChannel);
        } catch {}
      }
    };
  }, []);

  const broadcastSyncEvent = () => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('aqua_shop_sync_channel');
        bc.postMessage({ type: 'SYNC', timestamp: Date.now() });
        bc.close();
      } catch {}
    }
  };

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    try {
      let res;
      if (products.length > 0 || sales.length > 0 || purchases.length > 0) {
        res = await fetch('/api/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            categories,
            products,
            customers,
            purchases,
            sales,
            sale_items: saleItems,
            due_collections: dueCollections,
          }),
        });
      } else {
        res = await fetch('/api/sync');
      }
      const data = await res.json();
      if (data?.success) {
        applySyncedState(data);
        broadcastSyncEvent();
      } else {
        setSyncStatus('offline');
      }
    } catch {
      setSyncStatus('offline');
    }
  };

  // Compute KPI Metrics live based on selected Overview Timeframe (Daily / Monthly / Overall)
  const kpiMetrics = useMemo(() => {
    return calculateMetricsForTimeframe(
      {
        purchases,
        sales,
        customers,
        saleItems,
        products,
        dueCollections,
      },
      overviewTimeframe
    );
  }, [purchases, sales, customers, saleItems, products, dueCollections, overviewTimeframe]);

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
  const handleOpenCollectDue = (customerId?: number) => {
    if (customerId) setSelectedCustomerId(customerId);
    setActiveModal('collect_due');
  };
  const handleOpenAddCategory = () => setActiveModal('manage_categories');
  const handleOpenManageCategories = () => setActiveModal('manage_categories');
  const handleOpenAddCustomer = () => setActiveModal('add_customer');
  const handleOpenCustomerProfiles = (id?: number) => {
    if (id) setSelectedCustomerId(id);
    else if (!selectedCustomerId && customers.length > 0) setSelectedCustomerId(customers[0].id);
    setActiveModal('customer_profile');
  };

  const handleSelectCustomerByName = (name: string) => {
    const cust = customers.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (cust) {
      setSelectedCustomerId(cust.id);
      setActiveModal('customer_profile');
    } else {
      setActiveModal('customer_profile');
    }
  };

  // Category Handlers (Full CRUD & Fresh Reset)
  const handleAddCategory = async (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategories((prev) => {
          const exists = prev.some((c) => c.id === data.category.id || c.name.toLowerCase() === trimmed.toLowerCase());
          const next = exists
            ? prev.map((c) => (c.id === data.category.id ? data.category : c))
            : [...prev, data.category];
          saveStorage(STORAGE_KEYS.CATEGORIES, next);
          return next;
        });
      }
    } catch {
      const tempId = categories.length > 0 ? Math.max(...categories.map((c) => c.id)) + 1 : 1;
      const newCat: Category = { id: tempId, name: trimmed, created_at: new Date().toISOString() };
      setCategories((prev) => {
        const next = [...prev, newCat];
        saveStorage(STORAGE_KEYS.CATEGORIES, next);
        return next;
      });
    }
  };

  const handleEditCategory = async (id: number, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;

    try {
      const res = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name: trimmed }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategories((prev) => {
          const next = prev.map((c) => (c.id === id ? data.category : c));
          saveStorage(STORAGE_KEYS.CATEGORIES, next);
          return next;
        });
      }
    } catch {
      setCategories((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c));
        saveStorage(STORAGE_KEYS.CATEGORIES, next);
        return next;
      });
    }
  };

  const handleDeleteCategory = async (id: number) => {
    try {
      await fetch(`/api/categories?id=${id}`, { method: 'DELETE' });
      setCategories((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveStorage(STORAGE_KEYS.CATEGORIES, next);
        return next;
      });
      setProducts((prev) => {
        const next = prev.map((p) => (p.category_id === id ? { ...p, category_id: 0, category_name: 'Uncategorized' } : p));
        saveStorage(STORAGE_KEYS.PRODUCTS, next);
        return next;
      });
      broadcastSyncEvent();
    } catch {
      setCategories((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveStorage(STORAGE_KEYS.CATEGORIES, next);
        return next;
      });
      broadcastSyncEvent();
    }
  };

  const handleDeleteAllCategories = async () => {
    try {
      await fetch('/api/categories?all=true', { method: 'DELETE' });
    } catch (err) {
      console.error('Error deleting all categories:', err);
    }
    setCategories([]);
    saveStorage(STORAGE_KEYS.CATEGORIES, []);
    setProducts((prev) => {
      const next = prev.map((p) => ({ ...p, category_id: 0, category_name: 'Uncategorized' }));
      saveStorage(STORAGE_KEYS.PRODUCTS, next);
      return next;
    });
    broadcastSyncEvent();
  };

  // Customer Addition Handler
  const handleAddCustomer = async (customerData: {
    name: string;
    phone: string;
    address: string;
    initial_due: number;
  }): Promise<Customer> => {
    const tempCustId = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1;
    const newCustomer: Customer = {
      id: tempCustId,
      name: customerData.name.trim(),
      phone: customerData.phone.trim(),
      address: customerData.address.trim(),
      total_due: Number(customerData.initial_due) || 0,
      created_at: new Date().toISOString(),
    };

    setCustomers((prev) => {
      const next = [newCustomer, ...prev];
      saveStorage(STORAGE_KEYS.CUSTOMERS, next);
      return next;
    });
    setSelectedCustomerId(tempCustId);

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(customerData),
      });
      const data = await res.json();
      if (data.success && data.customer) {
        const savedCust: Customer = {
          ...data.customer,
          total_due: Number(data.customer.total_due) || 0,
        };
        setCustomers((prev) => {
          const next = prev.map((c) => (c.id === tempCustId ? savedCust : c));
          saveStorage(STORAGE_KEYS.CUSTOMERS, next);
          return next;
        });
        setSelectedCustomerId(savedCust.id);
        return savedCust;
      }
    } catch (e) {
      // Offline fallback
    }

    return newCustomer;
  };

  // Submit Handlers simulating PostgreSQL triggers
  const handleCreateSale = async (saleData: {
    customer_id: number | null;
    new_customer?: {
      name: string;
      phone?: string;
    };
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
    let targetCustomerId = saleData.customer_id;
    let optimisticCustId: number | null = null;

    // Auto-create new customer optimistically if name was typed in sale modal
    if (saleData.new_customer && saleData.new_customer.name) {
      const cleanName = saleData.new_customer.name.trim();
      const cleanPhone = saleData.new_customer.phone?.trim() || '';
      const existing = customers.find(
        (c) =>
          c.name.toLowerCase() === cleanName.toLowerCase() ||
          (cleanPhone && c.phone && c.phone.trim() === cleanPhone)
      );
      if (existing) {
        targetCustomerId = existing.id;
      } else {
        const newCustId = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1;
        optimisticCustId = newCustId;
        const newCustomer: Customer = {
          id: newCustId,
          name: cleanName,
          phone: cleanPhone,
          address: '',
          total_due: saleData.due_amount,
          created_at: new Date().toISOString(),
        };

        setCustomers((prev) => {
          const next = [newCustomer, ...prev];
          saveStorage(STORAGE_KEYS.CUSTOMERS, next);
          return next;
        });
        targetCustomerId = newCustId;
      }
    }

    const tempSaleId = sales.length > 0 ? Math.max(...sales.map((s) => s.id)) + 1 : 1;
    const dateStr = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(2, 10);
    const invoiceNo = `INV-${dateStr}-${String(tempSaleId).padStart(3, '0')}`;
    const nowIso = new Date().toISOString();

    const newSale: Sale = {
      id: tempSaleId,
      invoice_no: invoiceNo,
      customer_id: targetCustomerId,
      total_amount: saleData.total_amount,
      paid_amount: saleData.paid_amount,
      due_amount: saleData.due_amount,
      sale_date: nowIso,
    };

    const newItems: SaleItem[] = saleData.items.map((item, idx) => {
      const stockDeductQty = item.quantity * item.multiplier;
      return {
        id: saleItems.length + idx + 1,
        sale_id: tempSaleId,
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

    // 1. Save Sales & Sale Items
    setSales((prev) => {
      const next = [newSale, ...prev];
      saveStorage(STORAGE_KEYS.SALES, next);
      return next;
    });

    setSaleItems((prev) => {
      const next = [...prev, ...newItems];
      saveStorage(STORAGE_KEYS.SALE_ITEMS, next);
      return next;
    });

    // 2. Deduct inventory stock
    setProducts((prevProducts) => {
      const next = prevProducts.map((p) => {
        const itemMatch = saleData.items.find((i) => i.product_id === p.id);
        if (itemMatch) {
          const deductQty = itemMatch.quantity * itemMatch.multiplier;
          return {
            ...p,
            current_stock: Math.max(0, p.current_stock - deductQty),
          };
        }
        return p;
      });
      saveStorage(STORAGE_KEYS.PRODUCTS, next);
      return next;
    });

    // 3. Update customer total_due if due_amount > 0 and customer was existing
    if (saleData.due_amount > 0 && targetCustomerId !== null && !optimisticCustId) {
      setCustomers((prevCustomers) => {
        const next = prevCustomers.map((c) =>
          c.id === targetCustomerId
            ? { ...c, total_due: (Number(c.total_due) || 0) + saleData.due_amount }
            : c
        );
        saveStorage(STORAGE_KEYS.CUSTOMERS, next);
        return next;
      });
    }

    // 4. Sync sale with backend API atomically
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: optimisticCustId ? null : targetCustomerId,
          walkInName: saleData.new_customer?.name,
          walkInPhone: saleData.new_customer?.phone,
          isWalkIn: !targetCustomerId && !saleData.new_customer,
          invoiceNo,
          totalAmount: saleData.total_amount,
          paidAmount: saleData.paid_amount,
          dueAmount: saleData.due_amount,
          sale_date: nowIso,
          items: saleData.items.map((i) => ({
            productId: i.product_id,
            unitType: i.unit_type,
            multiplier: i.multiplier,
            quantity: i.quantity,
            price: i.unit_price,
            stockDeductQty: i.quantity * i.multiplier,
            unitCost: i.cost_price_snapshot,
            subtotal: i.subtotal,
          })),
        }),
      });

      const data = await res.json();
      if (data.success && data.sale) {
        const realCustomerId = data.sale.customer_id;

        // Reconcile real customer if returned
        if (data.customer) {
          const serverCust: Customer = {
            ...data.customer,
            total_due: Number(data.customer.total_due) || 0,
          };
          setCustomers((prev) => {
            let next: Customer[];
            if (optimisticCustId) {
              const withoutOptimistic = prev.filter((c) => c.id !== optimisticCustId);
              const exists = withoutOptimistic.some((c) => c.id === serverCust.id);
              next = exists
                ? withoutOptimistic.map((c) => (c.id === serverCust.id ? serverCust : c))
                : [serverCust, ...withoutOptimistic];
            } else {
              next = prev.map((c) => (c.id === serverCust.id ? serverCust : c));
            }
            saveStorage(STORAGE_KEYS.CUSTOMERS, next);
            return next;
          });
        }

        setSales((prev) => {
          const next = prev.map((s) =>
            s.id === tempSaleId
              ? {
                  ...s,
                  id: data.sale.id,
                  customer_id: realCustomerId,
                  invoice_no: data.sale.invoice_no || data.sale.invoiceNo || s.invoice_no,
                  sale_date: data.sale.sale_date || data.sale.saleDate || s.sale_date,
                }
              : s
          );
          saveStorage(STORAGE_KEYS.SALES, next);
          return next;
        });

        if (Array.isArray(data.sale_items) && data.sale_items.length > 0) {
          setSaleItems((prev) => {
            const nonCurrent = prev.filter((it) => it.sale_id !== tempSaleId);
            const next = [...nonCurrent, ...data.sale_items];
            saveStorage(STORAGE_KEYS.SALE_ITEMS, next);
            return next;
          });
        }
      }
    } catch (e) {
      // LocalStorage preserves the optimistic record
    }
  };

  // State & Handlers for Customer Deletion
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeleteCustomerModalOpen, setIsDeleteCustomerModalOpen] = useState(false);

  const handleOpenDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteCustomerModalOpen(true);
  };

  const handleDeleteCustomer = async (customerId: number) => {
    // 1. Optimistic removal from customers state & localStorage
    setCustomers((prev) => {
      const next = prev.filter((c) => c.id !== customerId);
      saveStorage(STORAGE_KEYS.CUSTOMERS, next);
      return next;
    });

    // 2. Unlink sales for this customer (customer_id = null so sales revenue and stock history remain intact)
    setSales((prev) => {
      const next = prev.map((s) => (s.customer_id === customerId ? { ...s, customer_id: null } : s));
      saveStorage(STORAGE_KEYS.SALES, next);
      return next;
    });

    // 3. Remove due collection receipts for this customer
    setDueCollections((prev) => {
      const next = prev.filter((c) => c.customer_id !== customerId);
      saveStorage(STORAGE_KEYS.DUE_COLLECTIONS, next);
      return next;
    });

    if (selectedCustomerId === customerId) {
      setSelectedCustomerId(null);
    }

    // 4. Server call to delete customer atomically
    try {
      await fetch(`/api/customers?id=${customerId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      console.warn('Offline: customer deletion recorded locally', e);
    }
  };

  const handleAddStock = async (purchaseData: {
    product_id: number;
    unit_type: string;
    quantity: number;
    multiplier: number;
    unit_cost: number;
    total_investment: number;
  }) => {
    const tempPurchId = purchases.length > 0 ? Math.max(...purchases.map((p) => p.id)) + 1 : 1;
    const totalPieces = purchaseData.quantity * purchaseData.multiplier;
    const nowIso = new Date().toISOString();

    const newPurchase: Purchase = {
      id: tempPurchId,
      product_id: purchaseData.product_id,
      unit_type: purchaseData.unit_type,
      quantity: purchaseData.quantity,
      multiplier: purchaseData.multiplier,
      total_pieces_added: totalPieces,
      unit_cost: purchaseData.unit_cost,
      total_investment: purchaseData.total_investment,
      purchase_date: nowIso,
    };

    setPurchases((prev) => {
      const next = [newPurchase, ...prev];
      saveStorage(STORAGE_KEYS.PURCHASES, next);
      return next;
    });

    // Trigger 1 Simulation: Increment inventory stock
    setProducts((prevProducts) => {
      const next = prevProducts.map((p) =>
        p.id === purchaseData.product_id
          ? {
              ...p,
              current_stock: p.current_stock + totalPieces,
              cost_price: purchaseData.unit_cost > 0 ? purchaseData.unit_cost : p.cost_price,
            }
          : p
      );
      saveStorage(STORAGE_KEYS.PRODUCTS, next);
      return next;
    });

    // Sync with backend API
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData),
      });
      const data = await res.json();
      if (data.success && data.purchase) {
        setPurchases((prev) => {
          const next = prev.map((p) => (p.id === tempPurchId ? data.purchase : p));
          saveStorage(STORAGE_KEYS.PURCHASES, next);
          return next;
        });
        if (data.product) {
          setProducts((prev) => {
            const next = prev.map((p) => (p.id === data.product.id ? data.product : p));
            saveStorage(STORAGE_KEYS.PRODUCTS, next);
            return next;
          });
        }
      }
    } catch (e) {
      // Offline fallback: already stored in localStorage
    }
  };

  const handleOpenEditStock = (purchase: Purchase) => {
    setEditingPurchase(purchase);
    setIsEditStockOpen(true);
  };

  const handleOpenDeleteStock = (purchaseId: number) => {
    const p = purchases.find((purch) => purch.id === purchaseId);
    if (p) {
      setPurchaseToDelete(p);
      setIsDeleteStockOpen(true);
    }
  };

  const handleUpdateStock = async (updatedData: {
    id: number;
    product_id: number;
    quantity: number;
    multiplier: number;
    unit_type: string;
    unit_cost: number;
    total_investment: number;
    purchase_date: string;
  }) => {
    const oldPurchase = purchases.find((p) => p.id === updatedData.id);
    if (!oldPurchase) return;

    const oldProdId = oldPurchase.product_id;
    const newProdId = updatedData.product_id;
    const oldPieces = (Number(oldPurchase.quantity) || 0) * (Number(oldPurchase.multiplier) || 1);
    const newPieces = (Number(updatedData.quantity) || 0) * (Number(updatedData.multiplier) || 1);

    const updatedPurchase: Purchase = {
      ...oldPurchase,
      ...updatedData,
      total_pieces_added: newPieces,
    };

    setPurchases((prev) => {
      const next = prev.map((p) => (p.id === updatedData.id ? updatedPurchase : p));
      saveStorage(STORAGE_KEYS.PURCHASES, next);
      return next;
    });

    // Adjust product current_stock
    setProducts((prevProducts) => {
      const next = prevProducts.map((p) => {
        if (oldProdId === newProdId) {
          if (p.id === newProdId) {
            const diff = newPieces - oldPieces;
            return {
              ...p,
              current_stock: Math.max(0, (Number(p.current_stock) || 0) + diff),
              cost_price: updatedData.unit_cost > 0 ? updatedData.unit_cost : p.cost_price,
            };
          }
        } else {
          if (p.id === oldProdId) {
            return {
              ...p,
              current_stock: Math.max(0, (Number(p.current_stock) || 0) - oldPieces),
            };
          }
          if (p.id === newProdId) {
            return {
              ...p,
              current_stock: (Number(p.current_stock) || 0) + newPieces,
              cost_price: updatedData.unit_cost > 0 ? updatedData.unit_cost : p.cost_price,
            };
          }
        }
        return p;
      });
      saveStorage(STORAGE_KEYS.PRODUCTS, next);
      return next;
    });

    showToast(t('toast.stockUpdated'), 'success');

    // Sync to API PUT /api/purchases
    try {
      const res = await fetch('/api/purchases', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
      const data = await res.json();
      if (data.success) {
        if (data.purchase) {
          setPurchases((prev) => {
            const next = prev.map((p) => (p.id === updatedData.id ? { ...p, ...data.purchase } : p));
            saveStorage(STORAGE_KEYS.PURCHASES, next);
            return next;
          });
        }
        if (Array.isArray(data.products)) {
          setProducts((prev) => {
            const next = prev.map((p) => {
              const updated = data.products.find((up: any) => up.id === p.id);
              return updated || p;
            });
            saveStorage(STORAGE_KEYS.PRODUCTS, next);
            return next;
          });
        }
      }
    } catch (e) {
      console.warn('Offline: stock update saved locally', e);
    }
  };

  const handleDeleteStock = async (purchaseId: number) => {
    const pToDelete = purchases.find((p) => p.id === purchaseId);
    if (!pToDelete) return;

    const prodId = pToDelete.product_id;
    const pieces = (Number(pToDelete.quantity) || 0) * (Number(pToDelete.multiplier) || 1);

    // 1. Remove from purchases state
    setPurchases((prev) => {
      const next = prev.filter((p) => p.id !== purchaseId);
      saveStorage(STORAGE_KEYS.PURCHASES, next);
      return next;
    });

    // 2. Deduct from product current_stock
    setProducts((prev) => {
      const next = prev.map((p) => {
        if (p.id === prodId) {
          return {
            ...p,
            current_stock: Math.max(0, (Number(p.current_stock) || 0) - pieces),
          };
        }
        return p;
      });
      saveStorage(STORAGE_KEYS.PRODUCTS, next);
      return next;
    });

    showToast(t('toast.stockDeleted'), 'success');

    // 3. Sync to API DELETE /api/purchases?id=...
    try {
      const res = await fetch(`/api/purchases?id=${purchaseId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success && data.product) {
        setProducts((prev) => {
          const next = prev.map((p) => (p.id === data.product.id ? data.product : p));
          saveStorage(STORAGE_KEYS.PRODUCTS, next);
          return next;
        });
      }
    } catch (e) {
      console.warn('Offline: stock deletion saved locally', e);
    }
  };

  const handleAddProduct = async (prodData: {
    name: string;
    category_id: number;
    default_unit: string;
    cost_price: number;
    selling_price: number;
    initial_stock: number;
  }) => {
    const tempProdId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const nowIso = new Date().toISOString();

    const newProd: Product = {
      id: tempProdId,
      category_id: prodData.category_id,
      name: prodData.name,
      default_unit: prodData.default_unit,
      cost_price: prodData.cost_price,
      selling_price: prodData.selling_price,
      current_stock: prodData.initial_stock,
      created_at: nowIso,
    };

    setProducts((prev) => {
      const next = [...prev, newProd];
      saveStorage(STORAGE_KEYS.PRODUCTS, next);
      return next;
    });

    // Record initial stock purchase entry if initial_stock > 0 for financial investment tracking
    if (prodData.initial_stock > 0) {
      const newPurchId = purchases.length > 0 ? Math.max(...purchases.map((p) => p.id)) + 1 : 1;
      const initialPurchase: Purchase = {
        id: newPurchId,
        product_id: tempProdId,
        unit_type: prodData.default_unit,
        quantity: prodData.initial_stock,
        multiplier: 1,
        total_pieces_added: prodData.initial_stock,
        unit_cost: prodData.cost_price,
        total_investment: prodData.initial_stock * prodData.cost_price,
        purchase_date: nowIso,
      };
      setPurchases((prev) => {
        const next = [initialPurchase, ...prev];
        saveStorage(STORAGE_KEYS.PURCHASES, next);
        return next;
      });
    }

    // Sync with backend API
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(prodData),
      });
      const data = await res.json();
      if (data.success && data.product) {
        setProducts((prev) => {
          const next = prev.map((p) => (p.id === tempProdId ? data.product : p));
          saveStorage(STORAGE_KEYS.PRODUCTS, next);
          return next;
        });
        if (prodData.initial_stock > 0) {
          setPurchases((prev) => {
            const next = prev.map((pu) =>
              pu.product_id === tempProdId ? { ...pu, product_id: data.product.id } : pu
            );
            saveStorage(STORAGE_KEYS.PURCHASES, next);
            return next;
          });
        }
      }
    } catch (e) {
      // LocalStorage backup preserved
    }
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct(prod);
    setIsEditProductOpen(true);
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    setProducts((prev) => {
      const next = prev.map((p) => (p.id === updatedProduct.id ? updatedProduct : p));
      saveStorage(STORAGE_KEYS.PRODUCTS, next);
      return next;
    });

    // Sync with backend API
    try {
      await fetch('/api/products', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: updatedProduct.id,
          name: updatedProduct.name,
          category_id: updatedProduct.category_id,
          default_unit: updatedProduct.default_unit,
          cost_price: updatedProduct.cost_price,
          selling_price: updatedProduct.selling_price,
          current_stock: updatedProduct.current_stock,
        }),
      });
    } catch (e) {
      // Offline fallback
    }
  };

  const handleRequestDeleteProduct = (prod: Product) => {
    setProductToDelete(prod);
    setIsDeleteProductOpen(true);
  };

  const handleDeleteProduct = async (productId: number) => {
    const previousProducts = products;
    const nextProducts = previousProducts.filter((p) => p.id !== productId);

    // 1. Optimistic removal from state & localStorage
    setProducts(nextProducts);
    saveStorage(STORAGE_KEYS.PRODUCTS, nextProducts);

    // Save into deleted IDs set to prevent resurrection from stale caches
    let previousDeleted: number[] = [];
    try {
      const localDeleted = localStorage.getItem(STORAGE_KEYS.DELETED_PRODUCT_IDS);
      if (localDeleted) {
        const parsed = JSON.parse(localDeleted);
        if (Array.isArray(parsed)) previousDeleted = parsed;
      }
      if (!previousDeleted.includes(productId)) {
        saveStorage(STORAGE_KEYS.DELETED_PRODUCT_IDS, [...previousDeleted, productId]);
      }
    } catch {}

    // 2. Call backend DELETE endpoint
    try {
      const res = await fetch(`/api/products?id=${productId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Failed to delete product from database');
      }

      // Broadcast to other open tabs for instant multi-tab sync
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        try {
          const bc = new BroadcastChannel('aqua_shop_sync_channel');
          bc.postMessage({ type: 'SYNC' });
          bc.close();
        } catch {}
      }

      showToast(
        language === 'bn'
          ? `পণ্যটি সফলভাবে মুছে ফেলা হয়েছে।`
          : `Product successfully deleted.`,
        'success'
      );
    } catch (err: any) {
      console.error('Failed deleting product from database:', err);
      // Revert optimistic update on failure
      setProducts(previousProducts);
      saveStorage(STORAGE_KEYS.PRODUCTS, previousProducts);
      saveStorage(STORAGE_KEYS.DELETED_PRODUCT_IDS, previousDeleted);
      throw err;
    }
  };

  const handleCollectDue = async (collectionData: {
    customer_id: number;
    amount_paid: number;
    note: string;
  }) => {
    const tempColId = dueCollections.length > 0 ? Math.max(...dueCollections.map((c) => c.id)) + 1 : 1;
    const nowIso = new Date().toISOString();

    const newCollection: DueCollection = {
      id: tempColId,
      customer_id: collectionData.customer_id,
      amount_paid: collectionData.amount_paid,
      note: collectionData.note,
      payment_date: nowIso,
    };

    setDueCollections((prev) => {
      const next = [newCollection, ...prev];
      saveStorage(STORAGE_KEYS.DUE_COLLECTIONS, next);
      return next;
    });

    // Trigger 4 Simulation: Deduct customer total_due
    setCustomers((prevCustomers) => {
      const next = prevCustomers.map((c) =>
        c.id === collectionData.customer_id
          ? { ...c, total_due: Math.max(0, (Number(c.total_due) || 0) - collectionData.amount_paid) }
          : c
      );
      saveStorage(STORAGE_KEYS.CUSTOMERS, next);
      return next;
    });

    // Sync with backend API
    try {
      const res = await fetch('/api/due-collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_id: collectionData.customer_id,
          amount_paid: collectionData.amount_paid,
          note: collectionData.note,
        }),
      });
      const data = await res.json();
      if (data.success && data.collection) {
        setDueCollections((prev) => {
          const next = prev.map((c) => (c.id === tempColId ? data.collection : c));
          saveStorage(STORAGE_KEYS.DUE_COLLECTIONS, next);
          return next;
        });
        if (data.customer) {
          setCustomers((prev) => {
            const next = prev.map((c) => (c.id === data.customer.id ? data.customer : c));
            saveStorage(STORAGE_KEYS.CUSTOMERS, next);
            return next;
          });
        }
      }
    } catch (e) {
      // LocalStorage backup preserved
    }
  };

  const handleSystemReset = async (options: {
    mode: 'full' | 'transactions_only';
    passcode: string;
    confirmKeyword: string;
  }) => {
    const res = await fetch('/api/system/reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      throw new Error(data.error || 'System reset failed');
    }

    // Clear client-side cached data
    try {
      const keysToClear = [
        STORAGE_KEYS.CATEGORIES,
        STORAGE_KEYS.PRODUCTS,
        STORAGE_KEYS.PURCHASES,
        STORAGE_KEYS.CUSTOMERS,
        STORAGE_KEYS.SALES,
        STORAGE_KEYS.SALE_ITEMS,
        STORAGE_KEYS.DUE_COLLECTIONS,
        'niloy_shop_categories',
        'niloy_shop_products',
        'niloy_shop_purchases',
      ];
      keysToClear.forEach((k) => localStorage.removeItem(k));
    } catch (e) {
      console.error('Error clearing localStorage keys:', e);
    }

    // Broadcast reset event across all tabs & windows
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      try {
        const bc = new BroadcastChannel('aqua_shop_sync_channel');
        bc.postMessage({ type: 'SYSTEM_RESET', timestamp: Date.now(), mode: options.mode });
        bc.close();
      } catch {}
    }

    // Directly apply the returned clean state
    applySyncedState(data);

    // Show success toast
    showToast(t('toast.resetSuccess'), 'success');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-2.5 sm:p-5 md:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6 md:space-y-8">
        
        {/* Top Header & Branding Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3 sm:space-x-3.5">
            <div className="relative p-1.5 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-indigo-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-950/40 flex items-center justify-center shrink-0">
              <Image
                src="/logo-transparent.png"
                alt="Aqua Place BD Logo"
                width={48}
                height={48}
                className="object-contain hover:scale-105 transition-transform duration-300 drop-shadow-md sm:w-[52px] sm:h-[52px]"
                priority
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-lg sm:text-2xl font-black tracking-tight text-white">
                  {t('app.title')}
                </h1>
              </div>
              <p className="text-[11px] sm:text-sm text-slate-400 font-medium">
                {t('app.tagline')}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2.5">
            {/* Live Cloud Sync Status Badge */}
            <button
              onClick={handleManualSync}
              title={
                syncStatus === 'synced'
                  ? `Cloud Synced (${lastSyncTime || 'Active'}) - Click to re-sync`
                  : syncStatus === 'syncing'
                  ? 'Syncing data with database...'
                  : 'Offline mode - Click to reconnect and sync'
              }
              className={`px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all shadow-sm active:scale-95 border min-h-[36px] ${
                syncStatus === 'synced'
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300 hover:bg-emerald-900/40'
                  : syncStatus === 'syncing'
                  ? 'bg-amber-950/40 border-amber-500/30 text-amber-300 hover:bg-amber-900/40'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/40'
              }`}
            >
              <span className="relative flex h-2 w-2">
                {syncStatus === 'synced' && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                )}
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    syncStatus === 'synced'
                      ? 'bg-emerald-500'
                      : syncStatus === 'syncing'
                      ? 'bg-amber-400 animate-spin'
                      : 'bg-rose-500'
                  }`}
                ></span>
              </span>
              <span className="text-[11px] sm:text-xs">
                {syncStatus === 'synced'
                  ? (language === 'bn' ? 'অটো-সিঙ্ক (লাইভ)' : 'Auto Synced (Live)')
                  : syncStatus === 'syncing'
                  ? (language === 'bn' ? 'সিঙ্ক হচ্ছে...' : 'Syncing...')
                  : (language === 'bn' ? 'অফলাইন' : 'Offline')}
              </span>
            </button>

            <ThemeSwitcher />
            <LanguageSwitcher />

            <button
              onClick={lockSiteSystem}
              title={t('passcode.lockSystem')}
              className="p-2 sm:px-3 sm:py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-300 hover:text-white flex items-center transition-all shadow-md active:scale-95 min-h-[36px]"
            >
              <Lock className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('passcode.lockSystem')}</span>
            </button>

            <button
              onClick={() => setIsResetModalOpen(true)}
              title={t('systemReset.btnTitle')}
              className="p-2 sm:px-3 sm:py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 rounded-xl text-xs font-semibold text-red-300 hover:text-white flex items-center transition-all shadow-md active:scale-95 min-h-[36px]"
            >
              <RotateCcw className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('systemReset.btnLabel')}</span>
            </button>

            <button
              onClick={handleOpenManageCategories}
              title={language === 'bn' ? 'ক্যাটাগরি ম্যানেজমেন্ট' : 'Manage Categories'}
              className="p-2 sm:px-3.5 sm:py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-300 hover:text-white flex items-center transition-all shadow-md active:scale-95 min-h-[36px]"
            >
              <Layers className="w-3.5 h-3.5 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">{language === 'bn' ? 'ক্যাটাগরি' : 'Categories'}</span>
              <span className="font-mono text-[11px] sm:text-xs ml-1">({formatNumber(categories.length)})</span>
            </button>

            <button
              onClick={handleOpenAddCustomer}
              title={t('quickActions.addCustomer')}
              className="p-2 sm:px-3.5 sm:py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-300 hover:text-white flex items-center transition-all shadow-md active:scale-95 min-h-[36px]"
            >
              <UserPlus className="w-3.5 h-3.5 sm:mr-1.5 shrink-0" />
              <span className="hidden sm:inline">+ {t('quickActions.addCustomer')}</span>
            </button>

            <button
              onClick={() => handleOpenCustomerProfiles()}
              title={t('modal.customerProfile.title')}
              className="px-2.5 sm:px-3.5 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white flex items-center transition-all shadow-md active:scale-95 min-h-[36px]"
            >
              <Users className="w-3.5 h-3.5 mr-1 sm:mr-1.5 shrink-0" />
              <span className="hidden md:inline">{t('modal.customerProfile.title')}</span>
              <span className="hidden sm:inline md:hidden">{t('nav.customers') || 'Khata'}</span>
              <span className="font-mono text-[11px] sm:text-xs">({formatNumber(customers.length)})</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              title="View Product Catalog & Stock"
              className={`px-2.5 sm:px-3 py-2 border rounded-xl text-xs flex items-center transition-all cursor-pointer shadow-sm active:scale-95 min-h-[36px] ${
                activeTab === 'products'
                  ? 'bg-teal-600/30 border-teal-500/50 text-white font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 mr-1 sm:mr-1.5 text-teal-400 shrink-0" />
              <span className="hidden sm:inline">{t('products.itemsCount') || 'Items'}: </span>
              <strong className="text-white font-mono text-[11px] sm:text-xs">{formatNumber(products.length)}</strong>
            </button>
          </div>
        </div>

        {/* Navigation Bar Tabs */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-900/90 p-1 sm:p-1.5 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none touch-pan-x">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-[105px] sm:min-w-0 py-2 sm:py-2.5 px-2.5 sm:px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 shrink-0 sm:shrink min-h-[42px] ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{t('nav.overview')}</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 min-w-[110px] sm:min-w-0 py-2 sm:py-2.5 px-2.5 sm:px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 shrink-0 sm:shrink min-h-[42px] ${
              activeTab === 'products'
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{t('nav.products')}</span>
          </button>

          <button
            onClick={() => setActiveTab('stock_history')}
            className={`flex-1 min-w-[110px] sm:min-w-0 py-2 sm:py-2.5 px-2.5 sm:px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 shrink-0 sm:shrink min-h-[42px] ${
              activeTab === 'stock_history'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <PackagePlus className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{t('nav.stockHistory')}</span>
          </button>

          <button
            onClick={() => setActiveTab('daily_ledger')}
            className={`flex-1 min-w-[115px] sm:min-w-0 py-2 sm:py-2.5 px-2.5 sm:px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 shrink-0 sm:shrink min-h-[42px] ${
              activeTab === 'daily_ledger'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{t('nav.dailyLedger')}</span>
          </button>

          <button
            onClick={() => setActiveTab('due_khata')}
            className={`flex-1 min-w-[110px] sm:min-w-0 py-2 sm:py-2.5 px-2.5 sm:px-3.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-1.5 sm:space-x-2 shrink-0 sm:shrink min-h-[42px] ${
              activeTab === 'due_khata'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
            <span className="truncate">{t('nav.dueKhata')}</span>
          </button>
        </div>

        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
            {/* Timeframe selector header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 bg-slate-900 border border-slate-800 p-3 sm:p-3.5 rounded-2xl">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                <Clock className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{t('timeframe.label')}</span>
              </div>
              <div className="grid grid-cols-3 sm:flex sm:items-center gap-1.5 w-full sm:w-auto">
                <button
                  onClick={() => setOverviewTimeframe('today')}
                  className={`py-1.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all text-center min-h-[36px] flex items-center justify-center ${
                    overviewTimeframe === 'today'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t('timeframe.today')}
                </button>
                <button
                  onClick={() => setOverviewTimeframe('this_month')}
                  className={`py-1.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all text-center min-h-[36px] flex items-center justify-center ${
                    overviewTimeframe === 'this_month'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t('timeframe.this_month')}
                </button>
                <button
                  onClick={() => setOverviewTimeframe('overall')}
                  className={`py-1.5 px-2 sm:px-3 rounded-xl text-xs font-bold transition-all text-center min-h-[36px] flex items-center justify-center ${
                    overviewTimeframe === 'overall'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t('timeframe.overall')}
                </button>
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
                onOpenCollectDue={() => handleOpenCollectDue()}
                onOpenAddCustomer={handleOpenAddCustomer}
                onOpenCustomerProfiles={() => handleOpenCustomerProfiles()}
                onOpenManageCategories={handleOpenManageCategories}
              />
            </section>

            {/* 3. Recent Activity Lists (2-Column Layout) */}
            <section className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              <RecentSalesList
                sales={recentSales}
                onSelectCustomer={handleSelectCustomerByName}
              />
              <LowStockWarningTable
                lowStockItems={lowStockItems}
                onRestockItem={(prodId) => handleOpenAddStock(prodId)}
                onViewAllProducts={() => setActiveTab('products')}
              />
            </section>
          </div>
        )}

        {/* TAB 2: PRODUCT INVENTORY & SPECIFICATIONS LEDGER */}
        {activeTab === 'products' && (
          <div className="animate-in fade-in duration-200">
            <ProductInventoryLedger
              products={products}
              categories={categories}
              onEditProduct={handleOpenEditProduct}
              onOpenAddStock={(prodId) => handleOpenAddStock(prodId)}
              onOpenAddProduct={handleOpenAddProduct}
              onOpenManageCategories={handleOpenManageCategories}
              onDeleteProduct={handleDeleteProduct}
              onRequestDeleteProduct={handleRequestDeleteProduct}
              onViewStockHistory={() => setActiveTab('stock_history')}
            />
          </div>
        )}

        {/* TAB 3: MONTHLY STOCK & RESTOCK LEDGER */}
        {activeTab === 'stock_history' && (
          <div className="animate-in fade-in duration-200">
            <MonthlyStockLedger
              purchases={purchases}
              products={products}
              categories={categories}
              onOpenAddStock={(prodId) => handleOpenAddStock(prodId)}
              onEditStock={handleOpenEditStock}
              onDeleteStock={handleOpenDeleteStock}
            />
          </div>
        )}

        {/* TAB 3: DAILY & MONTHLY BUY/SELL ACTIVITY LEDGER */}
        {activeTab === 'daily_ledger' && (
          <div className="animate-in fade-in duration-200">
            <DailyActivityLedger
              sales={sales}
              purchases={purchases}
              dueCollections={dueCollections}
              customers={customers}
              products={products}
              saleItems={saleItems}
              onOpenNewSale={handleOpenNewSale}
              onOpenAddStock={() => handleOpenAddStock()}
              onOpenCollectDue={() => handleOpenCollectDue()}
            />
          </div>
        )}

        {/* TAB 3: PROFESSIONAL DUE KHATA MANAGEMENT */}
        {activeTab === 'due_khata' && (
          <div className="animate-in fade-in duration-200">
            <DueManagementLedger
              customers={customers}
              sales={sales}
              dueCollections={dueCollections}
              saleItems={saleItems}
              onOpenCollectDue={(custGoalId) => handleOpenCollectDue(custGoalId)}
              onOpenCustomerProfile={(custGoalId) => handleOpenCustomerProfiles(custGoalId)}
              onOpenNewSaleForCustomer={(custGoalId) => {
                setSelectedCustomerId(custGoalId);
                setActiveModal('new_sale');
              }}
              onDeleteCustomer={handleOpenDeleteCustomer}
            />
          </div>
        )}

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

        <EditProductModal
          isOpen={isEditProductOpen}
          onClose={() => {
            setIsEditProductOpen(false);
            setEditingProduct(null);
          }}
          product={editingProduct}
          categories={categories}
          onUpdateProduct={handleUpdateProduct}
          onAddCategory={handleAddCategory}
          onDeleteProduct={handleRequestDeleteProduct}
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

        <ManageCategoriesModal
          isOpen={activeModal === 'manage_categories'}
          onClose={() => setActiveModal('none')}
          categories={categories}
          products={products}
          onAddCategory={handleAddCategory}
          onEditCategory={handleEditCategory}
          onDeleteCategory={handleDeleteCategory}
          onDeleteAllCategories={handleDeleteAllCategories}
        />

        <AddCustomerModal
          isOpen={activeModal === 'add_customer'}
          onClose={() => setActiveModal('none')}
          onAddCustomer={handleAddCustomer}
        />

        <CustomerProfileModal
          isOpen={activeModal === 'customer_profile'}
          onClose={() => setActiveModal('none')}
          customers={customers}
          sales={sales}
          saleItems={saleItems}
          dueCollections={dueCollections}
          selectedCustomerId={selectedCustomerId}
          onSelectCustomer={(id) => setSelectedCustomerId(id)}
          onOpenCollectDueForCustomer={(id) => {
            setSelectedCustomerId(id);
            setActiveModal('collect_due');
          }}
          onOpenNewSaleForCustomer={(id) => {
            setSelectedCustomerId(id);
            setActiveModal('new_sale');
          }}
          onOpenAddCustomer={handleOpenAddCustomer}
          onDeleteCustomer={handleOpenDeleteCustomer}
        />

        <DeleteCustomerModal
          isOpen={isDeleteCustomerModalOpen}
          onClose={() => {
            setIsDeleteCustomerModalOpen(false);
            setCustomerToDelete(null);
          }}
          customer={customerToDelete}
          sales={sales}
          dueCollections={dueCollections}
          onConfirmDelete={handleDeleteCustomer}
        />

        <DeleteProductModal
          isOpen={isDeleteProductOpen}
          onClose={() => {
            setIsDeleteProductOpen(false);
            setProductToDelete(null);
          }}
          product={productToDelete}
          categoryName={
            categories.find((c) => c.id === productToDelete?.category_id)?.name || 'Uncategorized'
          }
          saleItems={saleItems}
          onConfirmDelete={handleDeleteProduct}
        />

        <EditStockModal
          isOpen={isEditStockOpen}
          onClose={() => {
            setIsEditStockOpen(false);
            setEditingPurchase(null);
          }}
          purchase={editingPurchase}
          products={products}
          onUpdateStock={handleUpdateStock}
        />

        <DeleteStockModal
          isOpen={isDeleteStockOpen}
          onClose={() => {
            setIsDeleteStockOpen(false);
            setPurchaseToDelete(null);
          }}
          purchase={purchaseToDelete}
          productName={
            products.find((p) => p.id === purchaseToDelete?.product_id)?.name ||
            purchaseToDelete?.product_name ||
            'Product'
          }
          onConfirmDelete={handleDeleteStock}
        />

        <SystemResetModal
          isOpen={isResetModalOpen}
          onClose={() => setIsResetModalOpen(false)}
          categories={categories}
          products={products}
          customers={customers}
          sales={sales}
          saleItems={saleItems}
          purchases={purchases}
          dueCollections={dueCollections}
          onExecuteReset={handleSystemReset}
        />

        {toastMessage && (
          <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
            <div
              className={`flex items-center space-x-3 rounded-2xl p-4 shadow-2xl border backdrop-blur-xl max-w-sm ${
                toastMessage.type === 'success'
                  ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100 shadow-emerald-950/50'
                  : toastMessage.type === 'error'
                  ? 'bg-rose-950/90 border-rose-500/50 text-rose-100 shadow-rose-950/50'
                  : 'bg-slate-900/90 border-slate-700 text-slate-100'
              }`}
            >
              {toastMessage.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
              {toastMessage.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />}
              {toastMessage.type === 'info' && <Info className="h-5 w-5 text-cyan-400 shrink-0" />}
              <span className="text-sm font-semibold leading-snug flex-1">{toastMessage.message}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
