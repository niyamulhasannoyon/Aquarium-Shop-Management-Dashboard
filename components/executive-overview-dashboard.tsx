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
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useLanguage } from '@/context/language-context';

export const ExecutiveDashboard: React.FC = () => {
  const { t, language, formatNumber } = useLanguage();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'daily_ledger' | 'due_khata'>('overview');
  const [overviewTimeframe, setOverviewTimeframe] = useState<TimeframePeriod>('overall');

  // Cloud Sync state
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // LocalStorage storage keys for bulletproof offline & refresh resilience
  const STORAGE_KEYS = {
    CATEGORIES: 'aqua_shop_categories_v2',
    PRODUCTS: 'aqua_shop_products_v2',
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

  const applySyncedState = (data: any) => {
    if (!data || !data.success) return;

    if (Array.isArray(data.categories)) {
      setCategories(data.categories);
      saveStorage(STORAGE_KEYS.CATEGORIES, data.categories);
    }
    if (Array.isArray(data.products)) {
      const cleaned = data.products.filter((p: Product) => p && !DEMO_PRODUCT_NAMES.has(p.name));
      setProducts(cleaned);
      saveStorage(STORAGE_KEYS.PRODUCTS, cleaned);
    }
    if (Array.isArray(data.customers)) {
      setCustomers(data.customers);
      saveStorage(STORAGE_KEYS.CUSTOMERS, data.customers);
    }
    if (Array.isArray(data.sales)) {
      setSales(data.sales);
      saveStorage(STORAGE_KEYS.SALES, data.sales);
    }
    if (Array.isArray(data.sale_items)) {
      setSaleItems(data.sale_items);
      saveStorage(STORAGE_KEYS.SALE_ITEMS, data.sale_items);
    }
    if (Array.isArray(data.purchases)) {
      setPurchases(data.purchases);
      saveStorage(STORAGE_KEYS.PURCHASES, data.purchases);
    }
    if (Array.isArray(data.due_collections)) {
      setDueCollections(data.due_collections);
      saveStorage(STORAGE_KEYS.DUE_COLLECTIONS, data.due_collections);
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
        if (Array.isArray(parsedCats) && parsedCats.length > 0) setCategories(parsedCats);

        const localProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        let parsedProds = localProds ? JSON.parse(localProds) : null;
        if (Array.isArray(parsedProds)) {
          const cleaned = parsedProds.filter((p: Product) => p && !DEMO_PRODUCT_NAMES.has(p.name));
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
          (parsedProds && parsedProds.length > 0) ||
          (parsedSales && parsedSales.length > 0) ||
          (parsedPurchs && parsedPurchs.length > 0)
        ) {
          localDataToSync = {
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

    // Initial sync
    async function performInitialSync() {
      setSyncStatus('syncing');
      try {
        let res;
        if (localDataToSync) {
          res = await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(localDataToSync),
          });
        } else {
          res = await fetch('/api/sync');
        }
        const data = await res.json();
        if (data?.success) {
          applySyncedState(data);
        } else {
          setSyncStatus('offline');
        }
      } catch {
        setSyncStatus('offline');
      }
    }

    performInitialSync();

    // Background interval sync (every 10s)
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/sync');
        const data = await res.json();
        if (data?.success) {
          applySyncedState(data);
        }
      } catch {
        setSyncStatus('offline');
      }
    }, 10000);

    // Re-sync on window focus / tab visibility change
    const onFocus = async () => {
      try {
        setSyncStatus('syncing');
        const res = await fetch('/api/sync');
        const data = await res.json();
        if (data?.success) {
          applySyncedState(data);
        }
      } catch {
        setSyncStatus('offline');
      }
    };

    window.addEventListener('focus', onFocus);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') onFocus();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, []);

  const handleManualSync = async () => {
    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/sync');
      const data = await res.json();
      if (data?.success) {
        applySyncedState(data);
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
        const next = prev.map((p) => (p.category_id === id ? { ...p, category_id: 0 } : p));
        saveStorage(STORAGE_KEYS.PRODUCTS, next);
        return next;
      });
    } catch {
      setCategories((prev) => {
        const next = prev.filter((c) => c.id !== id);
        saveStorage(STORAGE_KEYS.CATEGORIES, next);
        return next;
      });
    }
  };

  const handleResetCategories = async () => {
    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reset' }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.categories)) {
        setCategories(data.categories);
        saveStorage(STORAGE_KEYS.CATEGORIES, data.categories);
      }
    } catch {
      setCategories(initialCategories);
      saveStorage(STORAGE_KEYS.CATEGORIES, initialCategories);
    }
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

    // Auto-create new customer if name was typed in sale modal
    if (saleData.new_customer && saleData.new_customer.name) {
      const existing = customers.find(
        (c) => c.name.toLowerCase() === saleData.new_customer!.name.trim().toLowerCase()
      );
      if (existing) {
        targetCustomerId = existing.id;
      } else {
        const newCustId = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1;
        const newCustomer: Customer = {
          id: newCustId,
          name: saleData.new_customer.name.trim(),
          phone: saleData.new_customer.phone?.trim() || '',
          address: '',
          total_due: 0,
          created_at: new Date().toISOString(),
        };

        setCustomers((prev) => {
          const next = [newCustomer, ...prev];
          saveStorage(STORAGE_KEYS.CUSTOMERS, next);
          return next;
        });
        targetCustomerId = newCustId;

        // Sync customer with backend API
        fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newCustomer.name,
            phone: newCustomer.phone,
            address: '',
            initial_due: 0,
          }),
        })
          .then((r) => r.json())
          .then((res) => {
            if (res.success && res.customer) {
              setCustomers((prev) => {
                const next = prev.map((c) => (c.id === newCustId ? res.customer : c));
                saveStorage(STORAGE_KEYS.CUSTOMERS, next);
                return next;
              });
            }
          })
          .catch(() => {});
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

    // 2. Trigger 2 Simulation: Deduct inventory stock
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

    // 3. Trigger 3 Simulation: Increase customer total_due if due_amount > 0
    if (saleData.due_amount > 0 && targetCustomerId !== null) {
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

    // 4. Sync sale with backend API
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: targetCustomerId,
          walkInName: saleData.new_customer?.name,
          walkInPhone: saleData.new_customer?.phone,
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
        setSales((prev) => {
          const next = prev.map((s) =>
            s.id === tempSaleId
              ? {
                  ...s,
                  id: data.sale.id,
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
      // LocalStorage preserves the record
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

  const handleDeleteProduct = async (productId: number) => {
    setProducts((prev) => {
      const next = prev.filter((p) => p.id !== productId);
      saveStorage(STORAGE_KEYS.PRODUCTS, next);
      return next;
    });

    try {
      await fetch(`/api/products?id=${productId}`, {
        method: 'DELETE',
      });
    } catch (e) {
      // Offline fallback
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
                  ? (language === 'bn' ? 'অনলাইন সিঙ্ক' : 'Cloud Synced')
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
          onResetCategories={handleResetCategories}
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
        />
      </div>
    </div>
  );
};
