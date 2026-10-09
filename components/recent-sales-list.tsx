'use client';

import React from 'react';
import { Receipt, Calendar, User, ArrowUpRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { RecentSaleView } from '@/types/executive';
import { useLanguage } from '@/context/language-context';

interface RecentSalesListProps {
  sales: RecentSaleView[];
  onSelectCustomer?: (customerName: string) => void;
}

export const RecentSalesList: React.FC<RecentSalesListProps> = ({ sales, onSelectCustomer }) => {
  const { t, formatCurrency, formatDate } = useLanguage();

  const getBadge = (status: 'paid' | 'partial' | 'due') => {
    switch (status) {
      case 'paid':
        return (
          <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {t('status.paid')}
          </span>
        );
      case 'partial':
        return (
          <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3 mr-1" />
            {t('status.partial')}
          </span>
        );
      case 'due':
        return (
          <span className="inline-flex items-center px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/30">
            <AlertCircle className="w-3 h-3 mr-1" />
            {t('status.due')}
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 backdrop-blur-md shadow-lg flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 sm:mb-4 pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Receipt className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-semibold text-white tracking-wide">
              {t('sections.recentSales')}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400">{t('sections.recentSalesSub')}</p>
          </div>
        </div>
        <span className="text-[10px] sm:text-xs text-emerald-400 bg-emerald-500/10 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-lg border border-emerald-500/20 font-medium">
          {t('app.liveSystem')}
        </span>
      </div>

      {sales.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 text-center text-slate-500">
          <Receipt className="w-8 h-8 sm:w-10 sm:h-10 mb-2 opacity-40" />
          <p className="text-xs sm:text-sm">{t('sections.noData')}</p>
        </div>
      ) : (
        <>
          {/* Mobile Card View (screen sizes < md) */}
          <div className="block md:hidden space-y-3">
            {sales.map((sale) => (
              <div
                key={sale.id}
                className="p-3 bg-slate-800/40 rounded-xl border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="p-1 rounded-md bg-slate-800 text-slate-400">
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </div>
                    <span className="font-mono text-xs font-bold text-slate-200">
                      {sale.invoice_no}
                    </span>
                  </div>
                  {getBadge(sale.status)}
                </div>

                <div className="flex items-center justify-between text-xs text-slate-300">
                  <button
                    onClick={() => onSelectCustomer && onSelectCustomer(sale.customer_name)}
                    className="flex items-center text-slate-300 hover:text-purple-400 text-left transition-colors font-medium"
                  >
                    <User className="w-3 h-3 mr-1 text-slate-500" />
                    {sale.customer_name}
                  </button>
                  <span className="font-bold text-white">{formatCurrency(sale.total_amount)}</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1.5 border-t border-slate-800/60">
                  <span className="flex items-center">
                    <Calendar className="w-3 h-3 mr-1 text-slate-500" />
                    {formatDate(sale.sale_date)}
                  </span>
                  {sale.due_amount > 0 && (
                    <span className="text-rose-400 font-semibold">
                      {t('status.due')}: {formatCurrency(sale.due_amount)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View (screen sizes >= md) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800/80">
                  <th className="py-2.5 px-3">{t('table.invoiceNo')} & {t('table.customer')}</th>
                  <th className="py-2.5 px-3">{t('table.date')}</th>
                  <th className="py-2.5 px-3 text-right">{t('table.totalAmount')}</th>
                  <th className="py-2.5 px-3 text-center">{t('table.paymentStatus')}</th>
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
                          <button
                            onClick={() => onSelectCustomer && onSelectCustomer(sale.customer_name)}
                            className="text-xs text-slate-400 hover:text-purple-400 flex items-center mt-0.5 transition-colors"
                          >
                            <User className="w-3 h-3 mr-1 opacity-70" />
                            {sale.customer_name}
                          </button>
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
                          {t('status.due')}: {formatCurrency(sale.due_amount)}
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
        </>
      )}
    </div>
  );
};
