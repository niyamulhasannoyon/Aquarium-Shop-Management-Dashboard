'use client';

import React from 'react';
import {
  Wallet,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Boxes,
  Info,
} from 'lucide-react';
import { KpiSummaryMetrics } from '@/types/executive';
import { formatCurrency } from '@/lib/calculations';

interface KpiSummaryCardsProps {
  metrics: KpiSummaryMetrics;
}

export const KpiSummaryCards: React.FC<KpiSummaryCardsProps> = ({ metrics }) => {
  const cards = [
    {
      title: 'Total Stock Investment',
      amount: metrics.totalStockInvestment,
      description: 'Sum of all stock purchases (Qty × Unit Cost)',
      icon: Wallet,
      gradient: 'from-indigo-600/20 to-indigo-900/10 border-indigo-500/30 text-indigo-400',
      iconBg: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
      formula: 'Σ (purchases.quantity * unit_cost)',
    },
    {
      title: 'Total Sales Revenue',
      amount: metrics.totalSalesRevenue,
      description: 'Sum of all completed sales invoices',
      icon: DollarSign,
      gradient: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
      iconBg: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      formula: 'Σ (sales.total_amount)',
    },
    {
      title: 'Total Outstanding Due',
      amount: metrics.totalOutstandingDue,
      description: 'Total receivable due from all customers',
      icon: AlertTriangle,
      gradient: 'from-amber-600/20 to-amber-900/10 border-amber-500/30 text-amber-400',
      iconBg: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      formula: 'Σ (customers.total_due)',
    },
    {
      title: 'Realized Net Profit',
      amount: metrics.realizedNetProfit,
      description: 'Profit margin from completed item sales',
      icon: TrendingUp,
      gradient: 'from-cyan-600/20 to-cyan-900/10 border-cyan-500/30 text-cyan-400',
      iconBg: 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20',
      formula: 'Σ (unit_price - cost_price_snapshot) * quantity',
    },
    {
      title: 'Available Inventory Valuation',
      amount: metrics.availableInventoryValuation,
      description: 'Valuation of products currently in stock',
      icon: Boxes,
      gradient: 'from-purple-600/20 to-purple-900/10 border-purple-500/30 text-purple-400',
      iconBg: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
      formula: 'Σ (products.current_stock * cost_price)',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
      {cards.map((card, idx) => {
        const IconComponent = card.icon;
        return (
          <div
            key={idx}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${card.gradient} bg-slate-900/80 border p-5 backdrop-blur-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 group`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {card.title}
              </span>
              <div className={`p-2.5 rounded-xl ${card.iconBg}`}>
                <IconComponent className="w-5 h-5" />
              </div>
            </div>

            <div className="mb-2">
              <h3 className="text-2xl font-bold tracking-tight text-white group-hover:scale-[1.01] transition-transform">
                {formatCurrency(card.amount)}
              </h3>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800/80">
              <span className="truncate pr-1">{card.description}</span>
              <div className="group/tooltip relative flex items-center shrink-0">
                <Info className="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-pointer" />
                <div className="absolute bottom-full right-0 mb-2 hidden group-hover/tooltip:block w-48 p-2 text-[10px] bg-slate-800 text-slate-200 rounded-lg shadow-xl border border-slate-700 z-20">
                  <p className="font-semibold text-white mb-0.5">Calculation Rule:</p>
                  <code className="text-emerald-400 font-mono">{card.formula}</code>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
