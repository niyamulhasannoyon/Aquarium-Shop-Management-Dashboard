'use client';

import React from 'react';
import { ShoppingBag, PackagePlus, PlusCircle, CreditCard, Sparkles } from 'lucide-react';

interface QuickActionsProps {
  onOpenNewSale: () => void;
  onOpenAddStock: () => void;
  onOpenAddProduct: () => void;
  onOpenCollectDue: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onOpenNewSale,
  onOpenAddStock,
  onOpenAddProduct,
  onOpenCollectDue,
}) => {
  const actions = [
    {
      label: 'New Sale',
      subtitle: 'Create customer invoice',
      icon: ShoppingBag,
      onClick: onOpenNewSale,
      bg: 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/30',
      badge: 'POS',
    },
    {
      label: 'Add Stock',
      subtitle: 'Receive supplier shipment',
      icon: PackagePlus,
      onClick: onOpenAddStock,
      bg: 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/30',
      badge: 'Purchase',
    },
    {
      label: 'Add Product',
      subtitle: 'New catalog entry',
      icon: PlusCircle,
      onClick: onOpenAddProduct,
      bg: 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/30',
      badge: 'Catalog',
    },
    {
      label: 'Collect Due',
      subtitle: 'Record customer payment',
      icon: CreditCard,
      onClick: onOpenCollectDue,
      bg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-900/30',
      badge: 'Receivable',
    },
  ];

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 sm:mb-8 backdrop-blur-md shadow-lg">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-semibold text-white tracking-wide">
            Quick Action Shortcuts
          </h2>
        </div>
        <span className="text-[11px] sm:text-xs text-slate-400 hidden xs:inline">Jump directly to common tasks</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {actions.map((act, index) => {
          const Icon = act.icon;
          return (
            <button
              key={index}
              onClick={act.onClick}
              className={`relative flex items-center justify-between p-3 sm:p-4 rounded-xl font-medium transition-all duration-200 shadow-md hover:shadow-xl hover:-translate-y-0.5 active:scale-[0.98] text-left ${act.bg} group overflow-hidden min-h-[64px] sm:min-h-[72px]`}
            >
              <div className="flex items-center space-x-2.5 sm:space-x-3.5 z-10">
                <div className="p-2 sm:p-2.5 rounded-lg bg-white/10 group-hover:scale-110 transition-transform shrink-0">
                  <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <div>
                  <div className="text-xs sm:text-sm font-bold tracking-tight">{act.label}</div>
                  <div className="text-[10px] sm:text-[11px] opacity-80 line-clamp-1">{act.subtitle}</div>
                </div>
              </div>

              <span className="hidden sm:inline-block text-[9px] sm:text-[10px] font-mono tracking-wider uppercase bg-white/20 text-white px-2 py-0.5 rounded-full z-10 shrink-0 ml-1">
                {act.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
