'use client';

import React from 'react';
import { AlertOctagon, PackageCheck, ShieldAlert, ArrowRight } from 'lucide-react';
import { LowStockItemView } from '@/types/executive';
import { formatCurrency } from '@/lib/calculations';

interface LowStockWarningTableProps {
  lowStockItems: LowStockItemView[];
  onRestockItem?: (productId: number) => void;
}

export const LowStockWarningTable: React.FC<LowStockWarningTableProps> = ({
  lowStockItems,
  onRestockItem,
}) => {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-wide">
              Low Stock Warning Alert
            </h3>
            <p className="text-xs text-slate-400">Products requiring immediate inventory replenishment</p>
          </div>
        </div>
        <span className="text-xs text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 font-semibold">
          {lowStockItems.length} Low Items
        </span>
      </div>

      {lowStockItems.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
          <PackageCheck className="w-10 h-10 mb-2 text-emerald-400 opacity-60" />
          <p className="text-sm text-emerald-300 font-medium">All inventory levels are healthy!</p>
          <p className="text-xs text-slate-500 mt-1">No products are below the critical threshold (&le; 10 units).</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                <th className="py-2.5 px-3">Product Name & Category</th>
                <th className="py-2.5 px-3 text-center">Remaining Stock</th>
                <th className="py-2.5 px-3 text-right">Selling Price</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {lowStockItems.map((item) => {
                const isCritical = item.current_stock <= 5;
                const joraCount = (item.current_stock / 2).toFixed(1).replace(/\.0$/, '');
                const isPieceOrPair = ['piece', 'pcs', 'jora', 'pair'].includes((item.default_unit || '').toLowerCase());
                const stockLabel = isPieceOrPair
                  ? `${item.current_stock} Pcs (${joraCount} Jora / জোড়া)`
                  : `${item.current_stock} ${item.default_unit}s`;

                return (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors group"
                  >
                    <td className="py-3 px-3">
                      <div>
                        <div className="font-semibold text-slate-200 group-hover:text-white">
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-400">
                          {item.category_name}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
                          isCritical
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 animate-pulse'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                        }`}
                      >
                        <ShieldAlert className="w-3 h-3 mr-1" />
                        {stockLabel}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right font-medium text-slate-300 whitespace-nowrap">
                      <div>{formatCurrency(item.selling_price)} / pc</div>
                      <div className="text-[10px] text-indigo-400 font-semibold">
                        {formatCurrency(item.selling_price * 2)} / jora
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right whitespace-nowrap">
                      {onRestockItem && (
                        <button
                          onClick={() => onRestockItem(item.id)}
                          className="inline-flex items-center text-xs font-medium text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1 rounded-lg border border-indigo-500/20 transition-all"
                        >
                          Restock
                          <ArrowRight className="w-3 h-3 ml-1" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
