'use client';

import React, { useState, useMemo } from 'react';
import {
  Layers,
  Search,
  PlusCircle,
  PackagePlus,
  Edit3,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Tag,
  ArrowUpDown,
  Filter,
} from 'lucide-react';
import { Product, Category } from '@/types/executive';
import { useLanguage } from '@/context/language-context';

interface ProductInventoryLedgerProps {
  products: Product[];
  categories: Category[];
  onEditProduct: (product: Product) => void;
  onOpenAddStock: (productId?: number) => void;
  onOpenAddProduct: () => void;
}

export const ProductInventoryLedger: React.FC<ProductInventoryLedgerProps> = ({
  products,
  categories,
  onEditProduct,
  onOpenAddStock,
  onOpenAddProduct,
}) => {
  const { t, formatCurrency, formatNumber } = useLanguage();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'id' | 'name' | 'stock_asc' | 'stock_desc' | 'price_desc' | 'margin_desc'>('id');

  // Summary Metrics
  const summary = useMemo(() => {
    let totalUnits = 0;
    let totalValuation = 0;
    let outOfStockCount = 0;
    let lowStockCount = 0;

    for (const p of products) {
      const stock = Number(p.current_stock) || 0;
      const cost = Number(p.cost_price) || 0;
      totalUnits += stock;
      totalValuation += stock * cost;

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= 10) {
        lowStockCount++;
      }
    }

    return {
      totalProducts: products.length,
      totalUnits,
      totalValuation,
      outOfStockCount,
      lowStockCount,
    };
  }, [products]);

  // Category Map for quick lookup
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((c) => map.set(c.id, c.name));
    return map;
  }, [categories]);

  // Filter & Sort Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((p) => {
        // Search query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const catName = categoryMap.get(p.category_id)?.toLowerCase() || '';
          const matchName = p.name.toLowerCase().includes(q);
          const matchCat = catName.includes(q);
          const matchId = p.id.toString() === q;
          if (!matchName && !matchCat && !matchId) return false;
        }

        // Category filter
        if (selectedCategoryId !== 'all' && p.category_id !== selectedCategoryId) {
          return false;
        }

        // Stock filter
        const stock = Number(p.current_stock) || 0;
        if (stockFilter === 'out_of_stock' && stock !== 0) return false;
        if (stockFilter === 'low_stock' && (stock === 0 || stock > 10)) return false;
        if (stockFilter === 'in_stock' && stock === 0) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'id') return a.id - b.id;
        if (sortBy === 'name') return a.name.localeCompare(b.name);
        if (sortBy === 'stock_asc') return a.current_stock - b.current_stock;
        if (sortBy === 'stock_desc') return b.current_stock - a.current_stock;
        if (sortBy === 'price_desc') return b.selling_price - a.selling_price;
        if (sortBy === 'margin_desc') {
          const marginA = a.selling_price - a.cost_price;
          const marginB = b.selling_price - b.cost_price;
          return marginB - marginA;
        }
        return 0;
      });
  }, [products, searchQuery, selectedCategoryId, stockFilter, sortBy, categoryMap]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 sm:p-5 rounded-2xl">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
            <Layers className="w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h2 className="text-base sm:text-xl font-bold text-white tracking-wide">
              {t('products.title')}
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              {t('products.subtitle')}
            </p>
          </div>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={onOpenAddProduct}
            className="px-3.5 py-2 bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-md shadow-teal-950 transition-all"
          >
            <PlusCircle className="w-4 h-4" />
            <span>+ {t('quickActions.addProduct')}</span>
          </button>
          <button
            onClick={() => onOpenAddStock()}
            className="px-3.5 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center space-x-1.5 transition-all shadow-md"
          >
            <PackagePlus className="w-4 h-4" />
            <span>{t('quickActions.addStock')}</span>
          </button>
        </div>
      </div>

      {/* KPI / Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Products */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium mb-1">
            {t('products.totalItems')}
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            {formatNumber(summary.totalProducts)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {categories.length} Categories active
          </div>
        </div>

        {/* Card 2: Total Units in Stock */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium mb-1">
            {t('products.inStockUnits')}
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-400 font-mono">
            {formatNumber(summary.totalUnits)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Physical items on shelf
          </div>
        </div>

        {/* Card 3: Total Stock Valuation */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium mb-1">
            {t('products.inventoryValuation')}
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {formatCurrency(summary.totalValuation)}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            At purchase cost price
          </div>
        </div>

        {/* Card 4: Stock Alerts */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4">
          <div className="text-xs text-slate-400 font-medium mb-1">
            Stock Alerts
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg sm:text-xl font-black text-rose-400 font-mono">
              {formatNumber(summary.outOfStockCount)}
            </span>
            <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
              Empty (0)
            </span>
            <span className="text-slate-600">/</span>
            <span className="text-lg sm:text-xl font-black text-amber-400 font-mono">
              {formatNumber(summary.lowStockCount)}
            </span>
            <span className="text-[10px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Low (≤10)
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            Needs restock attention
          </div>
        </div>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('products.searchPlaceholder')}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors shadow-inner"
            />
          </div>

          {/* Stock Filter */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStockFilter('all')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                stockFilter === 'all'
                  ? 'bg-teal-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t('products.filterStockAll')}
            </button>
            <button
              onClick={() => setStockFilter('in_stock')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                stockFilter === 'in_stock'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t('products.filterInStock')}
            </button>
            <button
              onClick={() => setStockFilter('low_stock')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                stockFilter === 'low_stock'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t('products.filterLowStock')}
            </button>
            <button
              onClick={() => setStockFilter('out_of_stock')}
              className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                stockFilter === 'out_of_stock'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'bg-slate-950 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {t('products.filterOutOfStock')}
            </button>
          </div>

          {/* Sort Selector */}
          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-teal-500 transition-colors"
            >
              <option value="id">ID (#1 - #99)</option>
              <option value="name">Name (A-Z)</option>
              <option value="stock_asc">Stock (Low to High)</option>
              <option value="stock_desc">Stock (High to Low)</option>
              <option value="price_desc">Price (High to Low)</option>
              <option value="margin_desc">Highest Margin (Profit)</option>
            </select>
          </div>
        </div>

        {/* Category Filter Badges */}
        <div className="flex items-center space-x-1.5 overflow-x-auto pt-2 border-t border-slate-800/80 pb-1">
          <span className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mr-1 shrink-0 flex items-center">
            <Tag className="w-3 h-3 mr-1" />
            Cat:
          </span>
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              selectedCategoryId === 'all'
                ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {t('products.filterAll')} ({products.length})
          </button>
          {categories.map((cat) => {
            const count = products.filter((p) => p.category_id === cat.id).length;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategoryId === cat.id
                    ? 'bg-teal-500/20 text-teal-300 border border-teal-500/40 font-bold'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {cat.name} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Product List Table (Desktop View) */}
      <div className="hidden lg:block bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <table className="w-full text-left text-xs sm:text-sm">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800 uppercase tracking-wider text-[11px]">
            <tr>
              <th className="py-3.5 px-4 w-12 text-center">#</th>
              <th className="py-3.5 px-4">{t('table.productName')}</th>
              <th className="py-3.5 px-4">{t('table.category')}</th>
              <th className="py-3.5 px-3 text-right">{t('table.costPrice')}</th>
              <th className="py-3.5 px-3 text-right">{t('table.sellingPrice')}</th>
              <th className="py-3.5 px-3 text-right">{t('products.margin')}</th>
              <th className="py-3.5 px-4 text-center">{t('table.currentStock')}</th>
              <th className="py-3.5 px-4 text-right">{t('products.stockValue')}</th>
              <th className="py-3.5 px-4 text-center">{t('table.action')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-slate-300">
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500">
                  <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
                  <p className="text-sm font-semibold">{t('products.noProductsFound')}</p>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                const stock = Number(p.current_stock) || 0;
                const cost = Number(p.cost_price) || 0;
                const selling = Number(p.selling_price) || 0;
                const margin = selling - cost;
                const marginPercent = cost > 0 ? ((margin / cost) * 100).toFixed(0) : '0';
                const stockValuation = stock * cost;
                const catName = categoryMap.get(p.category_id) || 'Uncategorized';

                return (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    {/* ID */}
                    <td className="py-3.5 px-4 text-center font-mono text-slate-500 text-xs">
                      #{p.id}
                    </td>

                    {/* Product Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-white group-hover:text-teal-300 transition-colors">
                        {p.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono flex items-center space-x-1.5 mt-0.5">
                        <span className="bg-slate-800 px-1.5 py-0.2 rounded text-[10px] text-slate-300">
                          Unit: {p.default_unit || 'Piece'}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4">
                      <span className="inline-block bg-slate-800/90 text-slate-300 px-2.5 py-1 rounded-lg text-xs font-medium border border-slate-700/60">
                        {catName}
                      </span>
                    </td>

                    {/* Cost Price */}
                    <td className="py-3.5 px-3 text-right font-mono text-slate-400">
                      {formatCurrency(cost)}
                    </td>

                    {/* Selling Price */}
                    <td className="py-3.5 px-3 text-right font-mono font-bold text-white">
                      {formatCurrency(selling)}
                    </td>

                    {/* Margin */}
                    <td className="py-3.5 px-3 text-right font-mono">
                      <div className={`font-semibold ${margin >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {margin >= 0 ? '+' : ''}{formatCurrency(margin)}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {marginPercent}%
                      </div>
                    </td>

                    {/* Current Stock */}
                    <td className="py-3.5 px-4 text-center">
                      {stock === 0 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono">
                          <XCircle className="w-3.5 h-3.5 mr-1 shrink-0" />
                          0 {p.default_unit || 'Pcs'}
                        </span>
                      ) : stock <= 10 ? (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                          <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                          {formatNumber(stock)} {p.default_unit || 'Pcs'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono">
                          <CheckCircle2 className="w-3.5 h-3.5 mr-1 shrink-0" />
                          {formatNumber(stock)} {p.default_unit || 'Pcs'}
                        </span>
                      )}
                    </td>

                    {/* Stock Valuation */}
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400/90 font-medium">
                      {formatCurrency(stockValuation)}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <button
                          onClick={() => onEditProduct(p)}
                          title={t('btn.edit')}
                          className="p-1.5 rounded-lg bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 hover:text-white border border-teal-500/20 transition-all"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onOpenAddStock(p.id)}
                          title={t('quickActions.addStock')}
                          className="p-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 hover:text-white border border-indigo-500/20 transition-all"
                        >
                          <PackagePlus className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Product List Cards (Mobile & Tablet View) */}
      <div className="block lg:hidden space-y-3">
        {filteredProducts.length === 0 ? (
          <div className="p-8 bg-slate-900 border border-slate-800 rounded-2xl text-center text-slate-500">
            <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-slate-400" />
            <p className="text-sm font-semibold">{t('products.noProductsFound')}</p>
          </div>
        ) : (
          filteredProducts.map((p) => {
            const stock = Number(p.current_stock) || 0;
            const cost = Number(p.cost_price) || 0;
            const selling = Number(p.selling_price) || 0;
            const margin = selling - cost;
            const catName = categoryMap.get(p.category_id) || 'Uncategorized';

            return (
              <div
                key={p.id}
                className="p-4 bg-slate-900 border border-slate-800 rounded-2xl space-y-3 shadow-md"
              >
                {/* Header: ID, Name, Category */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-mono text-slate-500 mb-0.5">
                      #{p.id} • {catName}
                    </div>
                    <div className="text-sm font-bold text-white">
                      {p.name}
                    </div>
                  </div>
                  <div>
                    {stock === 0 ? (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                        Out of Stock (0)
                      </span>
                    ) : stock <= 10 ? (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        Low ({formatNumber(stock)})
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                        In Stock ({formatNumber(stock)})
                      </span>
                    )}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 font-mono">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Cost Price:</span>
                    <span className="text-slate-300">{formatCurrency(cost)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Selling Price:</span>
                    <span className="text-white font-bold">{formatCurrency(selling)}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Unit Margin:</span>
                    <span className={margin >= 0 ? 'text-emerald-400 font-semibold' : 'text-rose-400 font-semibold'}>
                      +{formatCurrency(margin)}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Stock Valuation:</span>
                    <span className="text-emerald-400">{formatCurrency(stock * cost)}</span>
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="flex items-center space-x-2 pt-1 border-t border-slate-800">
                  <button
                    onClick={() => onEditProduct(p)}
                    className="flex-1 py-2 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-500/30 text-teal-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{t('btn.edit')}</span>
                  </button>
                  <button
                    onClick={() => onOpenAddStock(p.id)}
                    className="flex-1 py-2 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/30 text-indigo-300 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all"
                  >
                    <PackagePlus className="w-3.5 h-3.5" />
                    <span>{t('quickActions.addStock')}</span>
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
