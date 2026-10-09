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
} from 'lucide-react';
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
import { NewSaleModal } from '@/components/modals/new-sale-modal';
import { AddStockModal } from '@/components/modals/add-stock-modal';
import { AddProductModal } from '@/components/modals/add-product-modal';
import { CollectDueModal } from '@/components/modals/collect-due-modal';
import { AddCategoryModal } from '@/components/modals/add-category-modal';
import { AddCustomerModal } from '@/components/modals/add-customer-modal';
import { CustomerProfileModal } from '@/components/modals/customer-profile-modal';
import { LanguageSwitcher } from '@/components/language-switcher';
import { useLanguage } from '@/context/language-context';

export const ExecutiveDashboard: React.FC = () => {
  const { t, formatNumber } = useLanguage();

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState<'overview' | 'daily_ledger' | 'due_khata'>('overview');
  const [overviewTimeframe, setOverviewTimeframe] = useState<TimeframePeriod>('overall');

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
  const handleAddCategory = (categoryName: string) => {
    const newCatId = categories.length > 0 ? Math.max(...categories.map((c) => c.id)) + 1 : 1;
    const newCat: Category = {
      id: newCatId,
      name: categoryName,
      created_at: new Date().toISOString(),
    };
    setCategories((prev) => [...prev, newCat]);
  };

  // Customer Addition Handler
  const handleAddCustomer = (customerData: {
    name: string;
    phone: string;
    address: string;
    initial_due: number;
  }): Customer => {
    const newCustId = customers.length > 0 ? Math.max(...customers.map((c) => c.id)) + 1 : 1;
    const newCustomer: Customer = {
      id: newCustId,
      name: customerData.name,
      phone: customerData.phone,
      address: customerData.address,
      total_due: customerData.initial_due,
      created_at: new Date().toISOString(),
    };
    setCustomers((prev) => [newCustomer, ...prev]);

    // Try sending to backend API if active
    fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(customerData),
    }).catch(() => {});

    // Automatically select newly created customer profile
    setSelectedCustomerId(newCustId);
    return newCustomer;
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

    setSales((prev) => [newSale, ...prev]);
    setSaleItems((prev) => [...prev, ...newItems]);

    // Trigger 2 Simulation: Deduct inventory stock
    setProducts((prevProducts) =>
      prevProducts.map((p) => {
        const itemMatch = saleData.items.find((i) => i.product_id === p.id);
        if (itemMatch) {
          const deductQty = itemMatch.quantity * itemMatch.multiplier;
          return {
            ...p,
            current_stock: Math.max(0, p.current_stock - deductQty),
          };
        }
        return p;
      })
    );

    // Trigger 3 Simulation: Increase customer total_due if due_amount > 0
    if (saleData.due_amount > 0 && saleData.customer_id !== null) {
      setCustomers((prevCustomers) =>
        prevCustomers.map((c) =>
          c.id === saleData.customer_id
            ? { ...c, total_due: c.total_due + saleData.due_amount }
            : c
        )
      );
    }
  };

  const handleAddStock = (purchaseData: {
    product_id: number;
    unit_type: string;
    quantity: number;
    multiplier: number;
    unit_cost: number;
    total_investment: number;
  }) => {
    const newPurchId = purchases.length > 0 ? Math.max(...purchases.map((p) => p.id)) + 1 : 1;
    const totalPieces = purchaseData.quantity * purchaseData.multiplier;
    const nowIso = new Date().toISOString();

    const newPurchase: Purchase = {
      id: newPurchId,
      product_id: purchaseData.product_id,
      unit_type: purchaseData.unit_type,
      quantity: purchaseData.quantity,
      multiplier: purchaseData.multiplier,
      total_pieces_added: totalPieces,
      unit_cost: purchaseData.unit_cost,
      total_investment: purchaseData.total_investment,
      purchase_date: nowIso,
    };

    setPurchases((prev) => [newPurchase, ...prev]);

    // Trigger 1 Simulation: Increment inventory stock
    setProducts((prevProducts) =>
      prevProducts.map((p) =>
        p.id === purchaseData.product_id
          ? {
              ...p,
              current_stock: p.current_stock + totalPieces,
              cost_price: purchaseData.unit_cost > 0 ? purchaseData.unit_cost : p.cost_price,
            }
          : p
      )
    );
  };

  const handleAddProduct = (prodData: {
    name: string;
    category_id: number;
    default_unit: string;
    cost_price: number;
    selling_price: number;
    initial_stock: number;
  }) => {
    const newProdId = products.length > 0 ? Math.max(...products.map((p) => p.id)) + 1 : 1;
    const nowIso = new Date().toISOString();

    const newProd: Product = {
      id: newProdId,
      category_id: prodData.category_id,
      name: prodData.name,
      default_unit: prodData.default_unit,
      cost_price: prodData.cost_price,
      selling_price: prodData.selling_price,
      current_stock: prodData.initial_stock,
      created_at: nowIso,
    };

    setProducts((prev) => [...prev, newProd]);
  };

  const handleCollectDue = (collectionData: {
    customer_id: number;
    amount_paid: number;
    note: string;
  }) => {
    const newColId = dueCollections.length > 0 ? Math.max(...dueCollections.map((c) => c.id)) + 1 : 1;
    const nowIso = new Date().toISOString();

    const newCollection: DueCollection = {
      id: newColId,
      customer_id: collectionData.customer_id,
      amount_paid: collectionData.amount_paid,
      note: collectionData.note,
      payment_date: nowIso,
    };

    setDueCollections((prev) => [newCollection, ...prev]);

    // Trigger 4 Simulation: Deduct customer total_due
    setCustomers((prevCustomers) =>
      prevCustomers.map((c) =>
        c.id === collectionData.customer_id
          ? { ...c, total_due: Math.max(0, c.total_due - collectionData.amount_paid) }
          : c
      )
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Top Header & Branding Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-3.5">
            <div className="relative p-1.5 rounded-2xl bg-gradient-to-tr from-emerald-500/20 via-teal-500/20 to-indigo-500/20 border border-emerald-500/30 shadow-lg shadow-emerald-950/40 flex items-center justify-center shrink-0">
              <Image
                src="/logo-transparent.png"
                alt="Aqua Place BD Logo"
                width={52}
                height={52}
                className="object-contain hover:scale-105 transition-transform duration-300 drop-shadow-md"
                priority
              />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {t('app.title')}
                </h1>
              </div>
              <p className="text-xs sm:text-sm text-slate-400 font-medium">
                {t('app.tagline')}
              </p>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex items-center flex-wrap gap-2.5">
            <LanguageSwitcher />

            <button
              onClick={handleOpenAddCustomer}
              className="px-3.5 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-300 hover:text-white flex items-center transition-all shadow-md"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              + {t('quickActions.addCustomer')}
            </button>

            <button
              onClick={() => handleOpenCustomerProfiles()}
              className="px-3.5 py-2 bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/30 rounded-xl text-xs font-semibold text-cyan-300 hover:text-white flex items-center transition-all shadow-md"
            >
              <Users className="w-3.5 h-3.5 mr-1.5" />
              {t('modal.customerProfile.title')} ({formatNumber(customers.length)})
            </button>

            <div className="px-3 py-2 bg-slate-800/80 border border-slate-700/80 rounded-xl text-xs text-slate-300 flex items-center">
              <Layers className="w-3.5 h-3.5 mr-1.5 text-emerald-400" />
              Items: <strong className="text-white ml-1">{formatNumber(products.length)}</strong>
            </div>
          </div>
        </div>

        {/* Navigation Bar Tabs */}
        <div className="flex items-center space-x-2 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 min-w-[140px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'overview'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg shadow-emerald-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>📊 {t('nav.overview')}</span>
          </button>

          <button
            onClick={() => setActiveTab('daily_ledger')}
            className={`flex-1 min-w-[170px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'daily_ledger'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>🗓️ {t('nav.dailyLedger')}</span>
          </button>

          <button
            onClick={() => setActiveTab('due_khata')}
            className={`flex-1 min-w-[150px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center space-x-2 ${
              activeTab === 'due_khata'
                ? 'bg-gradient-to-r from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-950'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>📖 {t('nav.dueKhata')}</span>
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
              />
            </section>
          </div>
        )}

        {/* TAB 2: DAILY & MONTHLY BUY/SELL ACTIVITY LEDGER */}
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
