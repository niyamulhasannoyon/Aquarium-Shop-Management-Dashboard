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
import { AddCustomerModal } from '@/components/modals/add-customer-modal';
import { CustomerProfileModal } from '@/components/modals/customer-profile-modal';
import { LanguageSwitcher } from '@/components/language-switcher';
import { ThemeSwitcher } from '@/components/theme-switcher';
import { useLanguage } from '@/context/language-context';

export const ExecutiveDashboard: React.FC = () => {
  const { t, formatNumber } = useLanguage();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'daily_ledger' | 'due_khata'>('overview');
  const [overviewTimeframe, setOverviewTimeframe] = useState<TimeframePeriod>('overall');

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
    'none' | 'new_sale' | 'add_stock' | 'add_product' | 'collect_due' | 'add_category' | 'add_customer' | 'customer_profile'
  >('none');
  const [restockProductId, setRestockProductId] = useState<number | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isEditProductOpen, setIsEditProductOpen] = useState(false);

  // Hydrate from localStorage first and sync from PostgreSQL database
  useEffect(() => {
    // 1. Initial hydrate from localStorage for instantaneous rendering without data loss
    if (typeof window !== 'undefined') {
      try {
        const localCats = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
        if (localCats) {
          const parsed = JSON.parse(localCats);
          if (Array.isArray(parsed) && parsed.length > 0) setCategories(parsed);
        }

        const localProds = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
        if (localProds) {
          const parsed = JSON.parse(localProds);
          if (Array.isArray(parsed) && parsed.length > 0) setProducts(parsed);
        }

        const localPurchs = localStorage.getItem(STORAGE_KEYS.PURCHASES);
        if (localPurchs) {
          const parsed = JSON.parse(localPurchs);
          if (Array.isArray(parsed)) setPurchases(parsed);
        }

        const localCusts = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
        if (localCusts) {
          const parsed = JSON.parse(localCusts);
          if (Array.isArray(parsed)) setCustomers(parsed);
        }

        const localSales = localStorage.getItem(STORAGE_KEYS.SALES);
        if (localSales) {
          const parsed = JSON.parse(localSales);
          if (Array.isArray(parsed)) setSales(parsed);
        }

        const localItems = localStorage.getItem(STORAGE_KEYS.SALE_ITEMS);
        if (localItems) {
          const parsed = JSON.parse(localItems);
          if (Array.isArray(parsed)) setSaleItems(parsed);
        }

        const localDues = localStorage.getItem(STORAGE_KEYS.DUE_COLLECTIONS);
        if (localDues) {
          const parsed = JSON.parse(localDues);
          if (Array.isArray(parsed)) setDueCollections(parsed);
        }
      } catch (e) {
        console.error('Failed reading localStorage cache:', e);
      }
    }

    // 2. Fetch latest data from database API and sync
    async function loadBackendData() {
      try {
        const [prodRes, catRes, custRes, salesRes, purchRes, dueRes] = await Promise.all([
          fetch('/api/products').then((r) => r.json()).catch(() => null),
          fetch('/api/categories').then((r) => r.json()).catch(() => null),
          fetch('/api/customers?all=true').then((r) => r.json()).catch(() => null),
          fetch('/api/sales').then((r) => r.json()).catch(() => null),
          fetch('/api/purchases').then((r) => r.json()).catch(() => null),
          fetch('/api/due-collections').then((r) => r.json()).catch(() => null),
        ]);

        if (prodRes?.success && Array.isArray(prodRes.products) && prodRes.products.length > 0) {
          setProducts(prodRes.products);
          saveStorage(STORAGE_KEYS.PRODUCTS, prodRes.products);
        }

        if (catRes?.success && Array.isArray(catRes.categories) && catRes.categories.length > 0) {
          setCategories(catRes.categories);
          saveStorage(STORAGE_KEYS.CATEGORIES, catRes.categories);
        }

        if (custRes?.success && Array.isArray(custRes.customers) && custRes.customers.length > 0) {
          setCustomers(custRes.customers);
          saveStorage(STORAGE_KEYS.CUSTOMERS, custRes.customers);
        }

        if (salesRes?.success && Array.isArray(salesRes.sales) && salesRes.sales.length > 0) {
          setSales(salesRes.sales);
          saveStorage(STORAGE_KEYS.SALES, salesRes.sales);
          if (Array.isArray(salesRes.sale_items)) {
            setSaleItems(salesRes.sale_items);
            saveStorage(STORAGE_KEYS.SALE_ITEMS, salesRes.sale_items);
          }
        }

        if (purchRes?.success && Array.isArray(purchRes.purchases) && purchRes.purchases.length > 0) {
          setPurchases(purchRes.purchases);
          saveStorage(STORAGE_KEYS.PURCHASES, purchRes.purchases);
        }

        if (dueRes?.success && Array.isArray(dueRes.collections) && dueRes.collections.length > 0) {
          setDueCollections(dueRes.collections);
          saveStorage(STORAGE_KEYS.DUE_COLLECTIONS, dueRes.collections);
        }
      } catch (err) {
        // Fallback to local state
      }
    }

    loadBackendData();
  }, []);

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
  const handleOpenAddCategory = () => setActiveModal('add_category');
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

  // Category Addition Handler
  const handleAddCategory = async (categoryName: string) => {
    const trimmed = categoryName.trim();
    if (!trimmed) return;

    const existing = categories.find((c) => c.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) return;

    const tempId = categories.length > 0 ? Math.max(...categories.map((c) => c.id)) + 1 : 1;
    const newCat: Category = {
      id: tempId,
      name: trimmed,
      created_at: new Date().toISOString(),
    };

    setCategories((prev) => {
      const next = [...prev, newCat];
      saveStorage(STORAGE_KEYS.CATEGORIES, next);
      return next;
    });

    try {
      const res = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      const data = await res.json();
      if (data.success && data.category) {
        setCategories((prev) => {
          const next = prev.map((c) => (c.id === tempId ? { ...c, id: data.category.id, name: data.category.name } : c));
          saveStorage(STORAGE_KEYS.CATEGORIES, next);
          return next;
        });
      }
    } catch (e) {
      // LocalStorage backup already preserved
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
          <div className="flex items-center flex-wrap gap-2 sm:gap-2.5">
            <ThemeSwitcher />
            <LanguageSwitcher />

            <button
              onClick={lockSiteSystem}
              title={t('passcode.lockSystem')}
              className="px-2.5 sm:px-3 py-2 bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 rounded-xl text-xs font-semibold text-rose-300 hover:text-white flex items-center transition-all shadow-md active:scale-95"
            >
              <Lock className="w-3.5 h-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">{t('passcode.lockSystem')}</span>
            </button>

            <button
              onClick={handleOpenAddCustomer}
              className="px-3 sm:px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-300 hover:text-white flex items-center transition-all shadow-md active:scale-95"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span>+ {t('quickActions.addCustomer')}</span>
            </button>

            <button
              onClick={() => handleOpenCustomerProfiles()}
              className="px-3 sm:px-3.5 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white flex items-center transition-all shadow-md active:scale-95"
            >
              <Users className="w-3.5 h-3.5 mr-1.5 shrink-0" />
              <span className="hidden md:inline">{t('modal.customerProfile.title')}</span>
              <span className="md:hidden">{t('nav.customers') || 'Khata'}</span>
              <span className="ml-1 font-mono">({formatNumber(customers.length)})</span>
            </button>

            <button
              onClick={() => setActiveTab('products')}
              title="View Product Catalog & Stock"
              className={`px-3 py-2 border rounded-xl text-xs flex items-center transition-all cursor-pointer shadow-sm active:scale-95 ${
                activeTab === 'products'
                  ? 'bg-teal-600/30 border-teal-500/50 text-white font-bold'
                  : 'bg-slate-800/80 hover:bg-slate-700/80 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5 mr-1.5 text-teal-400 shrink-0" />
              <span>{t('products.itemsCount') || 'Items'}: <strong className="text-white ml-0.5">{formatNumber(products.length)}</strong></span>
            </button>
          </div>
        </div>

        {/* Navigation Bar Tabs */}
        <div className="flex items-center space-x-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto scrollbar-none touch-pan-x">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-[130px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>{t('nav.overview')}</span>
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'products'
                ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-lg shadow-teal-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>{t('nav.products')}</span>
          </button>

          <button
            onClick={() => setActiveTab('daily_ledger')}
            className={`flex-1 min-w-[150px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'daily_ledger'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>{t('nav.dailyLedger')}</span>
          </button>

          <button
            onClick={() => setActiveTab('due_khata')}
            className={`flex-1 min-w-[140px] px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'due_khata'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>{t('nav.dueKhata')}</span>
          </button>
        </div>

        {/* TAB 1: EXECUTIVE OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6 sm:space-y-8 animate-in fade-in duration-200">
            {/* Timeframe selector header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl">
              <div className="flex items-center space-x-2 text-xs font-semibold text-slate-300">
                <Clock className="w-4 h-4 text-emerald-400" />
                <span>{t('timeframe.label')}</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <button
                  onClick={() => setOverviewTimeframe('today')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    overviewTimeframe === 'today'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t('timeframe.today')}
                </button>
                <button
                  onClick={() => setOverviewTimeframe('this_month')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    overviewTimeframe === 'this_month'
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {t('timeframe.this_month')}
                </button>
                <button
                  onClick={() => setOverviewTimeframe('overall')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
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
