'use client';

import React from 'react';
import { Receipt, Calendar, User, ArrowUpRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { RecentSaleView } from '@/types/executive';
import { formatCurrency } from '@/lib/calculations';

interface RecentSalesListProps {
  sales: RecentSaleView[];
}

export const RecentSalesList: React.FC<RecentSalesListProps> = ({ sales }) => {
  const getBadge = (status: 'paid' | 'partial' | 'due') => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Partial
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            Due
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 backdrop-blur-md shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white tracking-wide">
              Recent Sales Invoices
            </h3>
            <p className="text-xs text-slate-400">Last 5 generated sales transactions</p>
          </div>
        </div>
        <span className="text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-medium">
          Live Feed
        </span>
      </div>

      {sales.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
          <Receipt className="w-10 h-10 mb-2 opacity-40" />
          <p className="text-sm">No sales invoices recorded yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                <th className="py-2.5 px-3">Invoice & Customer</th>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">Amount</th>
                <th className="py-2.5 px-3 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="hover:bg-slate-800/40 transition-colors group"
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center space-x-2.5">
                      <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white transition-colors">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-slate-200 group-hover:text-white font-mono text-xs">
                          {sale.invoice_no}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center mt-0.5">
                          <User className="w-3 h-3 mr-1 opacity-70" />
                          {sale.customer_name}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3 text-slate-400 text-xs whitespace-nowrap">
                    <div className="flex items-center">
                      <Calendar className="w-3 h-3 mr-1.5 text-slate-500" />
                      {formatDate(sale.sale_date)}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right font-semibold text-slate-100 whitespace-nowrap">
                    <div>{formatCurrency(sale.total_amount)}</div>
                    {sale.due_amount > 0 && (
                      <div className="text-[11px] text-rose-400 font-normal">
                        Due: {formatCurrency(sale.due_amount)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center whitespace-nowrap">
                    {getBadge(sale.status)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
