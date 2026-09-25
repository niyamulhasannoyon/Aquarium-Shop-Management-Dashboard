'use client';

import React from 'react';
import { useInventory } from '@/context/inventory-context';
import { formatCurrency } from '@/lib/utils';
import { Package, AlertTriangle, Boxes, DollarSign } from 'lucide-react';

export const MetricsOverview: React.FC = () => {
  const { products } = useInventory();

  const totalProducts = products.length;
  const lowStockCount = products.filter((p) => p.current_stock < 5).length;
  const totalStockUnits = products.reduce((acc, p) => acc + p.current_stock, 0);
  const totalInventoryValue = products.reduce((acc, p) => acc + p.cost_price * p.current_stock, 0);

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Products */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Products
          </span>
          <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
            <Package className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{totalProducts}</div>
          <span className="text-xs text-slate-500">Catalog items</span>
        </div>
      </div>

      {/* Low Stock Items */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Low Stock Warnings
          </span>
          <div className="rounded-xl bg-rose-50 p-2.5 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <AlertTriangle className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">{lowStockCount}</div>
          <span className="text-xs font-medium text-rose-500">Stock &lt; 5 units</span>
        </div>
      </div>

      {/* Total Stock Units */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Total Stock Quantity
          </span>
          <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <Boxes className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">{totalStockUnits}</div>
          <span className="text-xs text-slate-500">Total units</span>
        </div>
      </div>

      {/* Total Inventory Value */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:shadow-md dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Inventory Cost Value
          </span>
          <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline justify-between">
          <div className="text-2xl font-bold text-slate-900 dark:text-slate-50">
            {formatCurrency(totalInventoryValue)}
          </div>
          <span className="text-xs text-slate-500">Capital invested</span>
        </div>
      </div>
    </div>
  );
};
