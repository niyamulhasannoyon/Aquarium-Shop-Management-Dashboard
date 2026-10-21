'use client';

import React, { useState, useMemo } from 'react';
import {
  PackagePlus,
  Calendar,
  Search,
  Filter,
  Edit3,
  Trash2,
  DollarSign,
  Layers,
  Clock,
  ArrowUpDown,
  ShoppingBag,
  TrendingUp,
  Tag,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { Purchase, Product, Category } from '@/types/executive';
import { useLanguage } from '@/context/language-context';
import { groupPurchasesByMonth, MonthlyStockGroup } from '@/lib/calculations';

interface MonthlyStockLedgerProps {
  purchases: Purchase[];
  products: Product[];
  categories: Category[];
  onOpenAddStock: (productId?: number) => void;
  onEditStock: (purchase: Purchase) => void;
  onDeleteStock: (purchaseId: number) => void;
}

export const MonthlyStockLedger: React.FC<MonthlyStockLedgerProps> = ({
  purchases,
  products,
  categories,
  onOpenAddStock,
  onEditStock,
  onDeleteStock,
}) => {
  const { t, language, formatCurrency, formatNumber, formatDate } = useLanguage();

  // 1. Group all purchases by month
  const monthlyGroups = useMemo(() => {
    return groupPurchasesByMonth(purchases, products, categories);
  }, [purchases, products, categories]);

  // Available month keys
  const availableMonths = useMemo(() => {
    return monthlyGroups.map((g) => ({
      key: g.monthKey,
      label: g.monthLabel,
      count: g.purchasesCount,
      qty: g.totalQuantity,
    }));
  }, [monthlyGroups]);

  // Selected month state (default to first available month or 'all')
  const [selectedMonth, setSelectedMonth] = useState<string>(
    availableMonths[0]?.key || 'all'
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [activeSubTab, setActiveSubTab] = useState<'products' | 'entries'>('products');

  // Category map for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Product map for quick lookup
  const productMap = useMemo(() => {
    const map = new Map<number, Product>();
    products.forEach((p) => map.set(p.id, p));
    return map;
  }, [products]);

  // Filtered Purchases and Product Summaries based on selected month & search & category
  const activeMonthData = useMemo(() => {
    // 1. Collect purchases for the selected month or all
    let relevantPurchases: Purchase[] = [];
    if (selectedMonth === 'all') {
      relevantPurchases = [...purchases];
    } else {
      const match = monthlyGroups.find((g) => g.monthKey === selectedMonth);
      relevantPurchases = match ? [...match.purchases] : [];
    }

    // 2. Filter purchases by category and search query
    const filteredPurchases = relevantPurchases.filter((p) => {
      const prod = productMap.get(p.product_id);
      const catId = p.category_id !== undefined ? p.category_id : (prod?.category_id ?? null);

      if (selectedCategoryId !== 'all' && catId !== selectedCategoryId) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const pName = (p.product_name || prod?.name || '').toLowerCase();
        const catName = (p.category_name || (catId ? categoryMap.get(catId) || '' : '')).toLowerCase();
        if (!pName.includes(q) && !catName.includes(q)) {
          return false;
        }
      }

      return true;
    });

    // 3. Aggregate product-wise summary
    let totalQty = 0;
    let totalInv = 0;
    const prodMap = new Map<number, {
      productId: number;
      productName: string;
      categoryId: number | null;
      categoryName: string;
      totalQuantity: number;
      totalInvestment: number;
      purchasesCount: number;
      unitType: string;
      latestUnitCost: number;
      currentStock: number;
    }>();

    for (const p of filteredPurchases) {
      const mult = Number(p.multiplier) || 1;
      const qty = (Number(p.quantity) || 0) * mult;
      const cost = Number(p.unit_cost) || 0;
      const inv = Number(p.total_investment) || (qty * cost);

      totalQty += qty;
      totalInv += inv;

      const prod = productMap.get(p.product_id);
      const prodName = p.product_name || prod?.name || `Product #${p.product_id}`;
      const catId = p.category_id !== undefined ? p.category_id : (prod?.category_id ?? null);
      const catName = p.category_name || (catId ? categoryMap.get(catId) || 'Uncategorized' : 'Uncategorized');
      const unitType = p.unit_type || prod?.default_unit || 'piece';
      const curStock = Number(prod?.current_stock) || 0;

      if (!prodMap.has(p.product_id)) {
        prodMap.set(p.product_id, {
          productId: p.product_id,
          productName: prodName,
          categoryId: catId,
          categoryName: catName,
          totalQuantity: 0,
          totalInvestment: 0,
          purchasesCount: 0,
          unitType,
          latestUnitCost: cost,
          currentStock: curStock,
        });
      }

      const item = prodMap.get(p.product_id)!;
      item.totalQuantity += qty;
      item.totalInvestment += inv;
      item.purchasesCount += 1;
      if (cost > 0) item.latestUnitCost = cost;
    }

    const productSummaries = Array.from(prodMap.values()).sort(
      (a, b) => b.totalQuantity - a.totalQuantity
    );

    return {
      totalQuantity: totalQty,
      totalInvestment: totalInv,
      purchasesCount: filteredPurchases.length,
      uniqueProductsCount: productSummaries.length,
      purchases: filteredPurchases,
      productSummaries,
    };
  }, [selectedMonth, monthlyGroups, purchases, products, categories, selectedCategoryId, searchQuery, productMap, categoryMap]);

  // Format month name nicely for display
  const currentMonthDisplayName = useMemo(() => {
    if (selectedMonth === 'all') return t('stockLedger.allMonths');
    const match = availableMonths.find((m) => m.key === selectedMonth);
    return match ? match.label : selectedMonth;
  }, [selectedMonth, availableMonths, t]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <PackagePlus className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-white tracking-wide">
              {t('stockLedger.title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              {t('stockLedger.subtitle')}
            </p>
          </div>
        </div>

        <button
          onClick={() => onOpenAddStock()}
          className="w-full sm:w-auto px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-teal-600 hover:from-indigo-500 hover:to-teal-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-lg shadow-indigo-950/50 transition-all min-h-[44px]"
        >
          <PackagePlus className="w-4 h-4" />
          <span>{t('stockLedger.restockNow')}</span>
        </button>
      </div>

      {/* 2. Month Selector Tabs */}
      <div className="bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl">
        <div className="flex items-center space-x-2 mb-2.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <Calendar className="w-4 h-4 text-indigo-400" />
          <span>{t('stockLedger.selectMonth')}</span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none touch-pan-x">
          <button
            onClick={() => setSelectedMonth('all')}
            className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center space-x-2 min-h-[40px] ${
              selectedMonth === 'all'
                ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-md shadow-indigo-950'
                : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/80'
            }`}
          >
            <span>{t('stockLedger.allMonths')}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/40 text-slate-300 font-mono">
              {formatNumber(purchases.length)}
            </span>
          </button>

          {availableMonths.map((m) => (
            <button
              key={m.key}
              onClick={() => setSelectedMonth(m.key)}
              className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all shrink-0 flex items-center space-x-2 min-h-[40px] ${
                selectedMonth === m.key
                  ? 'bg-gradient-to-r from-indigo-600 to-teal-600 text-white shadow-md shadow-indigo-950'
                  : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700/80'
              }`}
            >
              <span>{m.label}</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-950/40 text-slate-300 font-mono">
                {formatNumber(m.qty)}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* 3. Monthly Key Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Units Stocked */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {t('stockLedger.totalItemsStocked')}
            </span>
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <PackagePlus className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {formatNumber(activeMonthData.totalQuantity)}
            </span>
            <span className="text-xs text-teal-400 font-medium">
              {language === 'bn' ? 'টি পিস/একক' : 'units'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {currentMonthDisplayName}
          </p>
        </div>

        {/* Card 2: Stock Investment */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {t('stockLedger.totalInvestment')}
            </span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-indigo-400">
              {formatCurrency(activeMonthData.totalInvestment)}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {language === 'bn' ? 'মোট মাল ক্রয়ের খরচ' : 'Total procurement cost'}
          </p>
        </div>

        {/* Card 3: Restock Entries */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {t('stockLedger.totalBatches')}
            </span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {formatNumber(activeMonthData.purchasesCount)}
            </span>
            <span className="text-xs text-purple-400 font-medium">
              {language === 'bn' ? 'বার চালান' : 'batches'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {language === 'bn' ? 'আলাদা আলাদা এন্ট্রি' : 'Individual restocks'}
          </p>
        </div>

        {/* Card 4: Unique Products Stocked */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-lg relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">
              {t('stockLedger.uniqueProducts')}
            </span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-xl sm:text-2xl font-bold font-mono text-white">
              {formatNumber(activeMonthData.uniqueProductsCount)}
            </span>
            <span className="text-xs text-amber-400 font-medium">
              {language === 'bn' ? 'টি আইটেম' : 'products'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1 truncate">
            {language === 'bn' ? 'যেসব পণ্য স্টক করা হয়েছে' : 'Distinct products restocked'}
          </p>
        </div>
      </div>

      {/* 4. Controls Bar: Search, Category Filter & Sub-Tab Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3.5 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          
          {/* Sub-Tab Switcher: Product Summary vs Detailed Log */}
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 w-full sm:w-auto">
            <button
              onClick={() => setActiveSubTab('products')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 min-h-[38px] ${
                activeSubTab === 'products'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{t('stockLedger.productSummaryTab')}</span>
            </button>
            <button
              onClick={() => setActiveSubTab('entries')}
              className={`flex-1 sm:flex-none px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center space-x-2 min-h-[38px] ${
                activeSubTab === 'entries'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{t('stockLedger.historyTab')}</span>
            </button>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full lg:w-auto">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t('stockLedger.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 min-h-[40px]"
              />
            </div>

            {/* Category Dropdown */}
            <select
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              className="w-full sm:w-auto bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-indigo-500 min-h-[40px]"
            >
              <option value="all">{language === 'bn' ? 'সকল ক্যাটাগরি' : 'All Categories'}</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {(searchQuery.trim() !== '' || selectedCategoryId !== 'all') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategoryId('all');
                }}
                className="w-full sm:w-auto px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all active:scale-95 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center justify-center space-x-1.5 min-h-[40px]"
                title={t('filter.resetDesc')}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{t('filter.reset')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. TAB A: PRODUCT-WISE MONTHLY BREAKDOWN */}
      {activeSubTab === 'products' && (
        <div className="space-y-4">
          {activeMonthData.productSummaries.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                <PackagePlus className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {t('stockLedger.noRecords')}
              </h3>
              <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                {language === 'bn'
                  ? 'এই মাসে কোনো স্টক বা পণ্য ক্রয়ের হিসাব নেই। নতুন স্টক যোগ করতে নিচের বাটনে চাপ দিন।'
                  : 'No restock records found for this period. Click below to add new stock.'}
              </p>
              <div className="flex items-center justify-center flex-wrap gap-2">
                <button
                  onClick={() => onOpenAddStock()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 shadow-md shadow-indigo-950 transition-all"
                >
                  <PackagePlus className="w-4 h-4" />
                  <span>{t('stockLedger.restockNow')}</span>
                </button>
                {(searchQuery.trim() !== '' || selectedCategoryId !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategoryId('all');
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-rose-300 rounded-xl text-xs font-bold inline-flex items-center space-x-1.5 border border-slate-700 transition-all"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{t('filter.reset')}</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="py-3 px-4">{t('stockLedger.productName')}</th>
                      <th className="py-3 px-4">{t('stockLedger.category')}</th>
                      <th className="py-3 px-4 text-center">{t('stockLedger.monthlyQty')}</th>
                      <th className="py-3 px-4 text-right">{t('stockLedger.unitCost')}</th>
                      <th className="py-3 px-4 text-right">{t('stockLedger.totalCost')}</th>
                      <th className="py-3 px-4 text-center">{t('stockLedger.currentStock')}</th>
                      <th className="py-3 px-4 text-center">{t('stockLedger.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeMonthData.productSummaries.map((item) => (
                      <tr key={item.productId} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <div className="font-bold text-white text-sm">
                            {item.productName}
                          </div>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.purchasesCount} {language === 'bn' ? 'বার রিস্টক' : 'restocks'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2.5 py-1 rounded-lg text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60">
                            {item.categoryName}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-3 py-1.5 rounded-xl font-mono font-bold text-sm bg-teal-500/10 text-teal-300 border border-teal-500/20 inline-block">
                            +{formatNumber(item.totalQuantity)} {item.unitType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-slate-300">
                          {formatCurrency(item.latestUnitCost)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-indigo-400 text-sm">
                          {formatCurrency(item.totalInvestment)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="font-mono font-bold text-slate-200">
                            {formatNumber(item.currentStock)} {item.unitType}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => onOpenAddStock(item.productId)}
                            className="px-2.5 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition-all"
                          >
                            <PackagePlus className="w-3.5 h-3.5" />
                            <span>{language === 'bn' ? '+ আরও স্টক' : '+ Restock'}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {activeMonthData.productSummaries.map((item) => (
                  <div
                    key={item.productId}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-bold text-white text-base">
                          {item.productName}
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700/60 inline-block mt-1">
                          {item.categoryName}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-xl font-mono font-bold text-xs bg-teal-500/10 text-teal-300 border border-teal-500/20">
                        +{formatNumber(item.totalQuantity)} {item.unitType}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                          {t('stockLedger.totalCost')}
                        </span>
                        <span className="font-mono font-bold text-indigo-400">
                          {formatCurrency(item.totalInvestment)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                          {t('stockLedger.unitCost')}
                        </span>
                        <span className="font-mono text-slate-300">
                          {formatCurrency(item.latestUnitCost)}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                          {t('stockLedger.currentStock')}
                        </span>
                        <span className="font-mono font-bold text-slate-200">
                          {formatNumber(item.currentStock)} {item.unitType}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                          {language === 'bn' ? 'চালান সংখ্যা' : 'Entries'}
                        </span>
                        <span className="font-mono text-slate-400">
                          {item.purchasesCount} {language === 'bn' ? 'বার' : 'times'}
                        </span>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => onOpenAddStock(item.productId)}
                        className="w-full py-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all min-h-[40px]"
                      >
                        <PackagePlus className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? '+ এই পণ্যে আরও স্টক যোগ করুন' : '+ Add More Stock'}</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 6. TAB B: DETAILED INDIVIDUAL RESTOCK ENTRIES (WITH EDIT & DELETE) */}
      {activeSubTab === 'entries' && (
        <div className="space-y-4">
          {activeMonthData.purchases.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 sm:p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white mb-1">
                {t('stockLedger.noRecords')}
              </h3>
              <p className="text-xs text-slate-400 mb-4 max-w-md mx-auto">
                {language === 'bn'
                  ? 'এই মাসে কোনো স্টক ক্রয়ের বিবরণ পাওয়া যায়নি।'
                  : 'No restock entry found matching the filters.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden md:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                      <th className="py-3 px-4">{language === 'bn' ? 'তারিখ ও সময়' : 'Date & Time'}</th>
                      <th className="py-3 px-4">{t('stockLedger.productName')}</th>
                      <th className="py-3 px-4 text-center">{language === 'bn' ? 'স্টক পরিমাণ' : 'Quantity'}</th>
                      <th className="py-3 px-4 text-right">{t('stockLedger.unitCost')}</th>
                      <th className="py-3 px-4 text-right">{t('stockLedger.totalCost')}</th>
                      <th className="py-3 px-4 text-center">{t('stockLedger.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {activeMonthData.purchases.map((p) => {
                      const prod = productMap.get(p.product_id);
                      const prodName = p.product_name || prod?.name || `Product #${p.product_id}`;
                      const catId = p.category_id !== undefined ? p.category_id : (prod?.category_id ?? null);
                      const catName = p.category_name || (catId ? categoryMap.get(catId) || 'Uncategorized' : 'Uncategorized');
                      const totalPieces = (Number(p.quantity) || 0) * (Number(p.multiplier) || 1);

                      return (
                        <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-3 px-4 font-mono text-slate-400">
                            {formatDate(p.purchase_date)}
                          </td>
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-sm">{prodName}</div>
                            <span className="text-[10px] text-slate-400">{catName}</span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="px-2.5 py-1 rounded-lg font-mono font-bold text-xs bg-teal-500/10 text-teal-300 border border-teal-500/20 inline-block">
                              +{formatNumber(totalPieces)} {p.unit_type || 'piece'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-slate-300">
                            {formatCurrency(p.unit_cost)}
                          </td>
                          <td className="py-3 px-4 text-right font-mono font-bold text-indigo-400 text-sm">
                            {formatCurrency(p.total_investment)}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center justify-center space-x-1.5">
                              <button
                                onClick={() => onEditStock(p)}
                                title={t('stockLedger.editStock')}
                                className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-xs font-semibold inline-flex items-center space-x-1 transition-all"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                                <span>{language === 'bn' ? 'এডিট' : 'Edit'}</span>
                              </button>
                              <button
                                onClick={() => onDeleteStock(p.id)}
                                title={t('stockLedger.deleteStock')}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-lg text-xs transition-all"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Cards */}
              <div className="md:hidden space-y-3">
                {activeMonthData.purchases.map((p) => {
                  const prod = productMap.get(p.product_id);
                  const prodName = p.product_name || prod?.name || `Product #${p.product_id}`;
                  const catId = p.category_id !== undefined ? p.category_id : (prod?.category_id ?? null);
                  const catName = p.category_name || (catId ? categoryMap.get(catId) || 'Uncategorized' : 'Uncategorized');
                  const totalPieces = (Number(p.quantity) || 0) * (Number(p.multiplier) || 1);

                  return (
                    <div
                      key={p.id}
                      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-md space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-bold text-white text-sm">{prodName}</div>
                          <span className="text-[10px] text-slate-400">{catName}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-xl font-mono font-bold text-xs bg-teal-500/10 text-teal-300 border border-teal-500/20">
                          +{formatNumber(totalPieces)} {p.unit_type || 'piece'}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                            {language === 'bn' ? 'তারিখ' : 'Date'}
                          </span>
                          <span className="font-mono text-slate-300">
                            {formatDate(p.purchase_date)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                            {t('stockLedger.totalCost')}
                          </span>
                          <span className="font-mono font-bold text-indigo-400">
                            {formatCurrency(p.total_investment)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                            {t('stockLedger.unitCost')}
                          </span>
                          <span className="font-mono text-slate-300">
                            {formatCurrency(p.unit_cost)}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase block font-semibold">
                            {language === 'bn' ? 'আইডি' : 'Entry #'}
                          </span>
                          <span className="font-mono text-slate-500">
                            #{p.id}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-800/80">
                        <button
                          onClick={() => onEditStock(p)}
                          className="flex-1 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1.5 transition-all min-h-[40px]"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>{t('stockLedger.editStock')}</span>
                        </button>
                        <button
                          onClick={() => onDeleteStock(p.id)}
                          className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center justify-center space-x-1 transition-all min-h-[40px]"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{language === 'bn' ? 'মুছুন' : 'Delete'}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
