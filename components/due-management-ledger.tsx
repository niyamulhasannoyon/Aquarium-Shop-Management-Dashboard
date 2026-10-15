'use client';

import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Search,
  User,
  Phone,
  MessageSquare,
  CreditCard,
  PlusCircle,
  AlertCircle,
  CheckCircle2,
  FileText,
  Printer,
  History,
  TrendingDown,
  DollarSign,
  ArrowRight,
} from 'lucide-react';
import { Customer, Sale, DueCollection, SaleItem } from '@/types/executive';
import { formatCurrency } from '@/lib/calculations';

import { useLanguage } from '@/context/language-context';

interface DueManagementLedgerProps {
  customers: Customer[];
  sales: Sale[];
  dueCollections: DueCollection[];
  saleItems: SaleItem[];
  onOpenCollectDue: (customerId?: number) => void;
  onOpenCustomerProfile: (customerId: number) => void;
  onOpenNewSaleForCustomer: (customerId: number) => void;
}

export const DueManagementLedger: React.FC<DueManagementLedgerProps> = ({
  customers,
  sales,
  dueCollections,
  saleItems,
  onOpenCollectDue,
  onOpenCustomerProfile,
  onOpenNewSaleForCustomer,
}) => {
  const { t, formatCurrency, formatNumber, formatDate } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [dueFilter, setDueFilter] = useState<'all' | 'due_only' | 'cleared'>('due_only');

  // Customer List calculation & ranking
  const customerDueList = useMemo(() => {
    let list = [...customers];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.address && c.address.toLowerCase().includes(q))
      );
    }

    // Filter by Due status
    if (dueFilter === 'due_only') {
      list = list.filter((c) => c.total_due > 0);
    } else if (dueFilter === 'cleared') {
      list = list.filter((c) => c.total_due <= 0);
    }

    // Sort by total_due descending
    return list.sort((a, b) => b.total_due - a.total_due);
  }, [customers, searchQuery, dueFilter]);

  // Overall Due Metrics
  const dueSummary = useMemo(() => {
    const totalDue = customers.reduce((acc, c) => acc + c.total_due, 0);
    const customersWithDue = customers.filter((c) => c.total_due > 0);
    const totalCollected = dueCollections.reduce((acc, dc) => acc + dc.amount_paid, 0);

    const highestDueCustomer = customersWithDue.length > 0
      ? [...customersWithDue].sort((a, b) => b.total_due - a.total_due)[0]
      : null;

    return {
      totalDue,
      customersWithDueCount: customersWithDue.length,
      totalCollected,
      highestDueCustomer,
    };
  }, [customers, dueCollections]);

  const formatWhatsAppUrl = (phoneStr: string, name: string, amount: number) => {
    let digits = phoneStr.replace(/\D/g, '');
    if (digits.startsWith('0')) digits = `88${digits}`;
    else if (!digits.startsWith('88')) digits = `880${digits}`;

    const text = encodeURIComponent(
      t('khata.whatsappMessage', { name, amount: formatCurrency(amount) })
    );
    return `https://wa.me/${digits}?text=${text}`;
  };

  return (
    <div className="space-y-6">

      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white shadow-lg shadow-rose-900/30">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">{t('khata.title')}</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {t('khata.subtitle')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onOpenCollectDue()}
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-amber-900/30 flex items-center justify-center transition-all min-h-[44px]"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          {t('khata.recordDueBtn')}
        </button>
      </div>

      {/* Top 4 Due Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Outstanding Due */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium">{t('khata.totalDueCard')}</div>
          <div className="text-lg sm:text-2xl font-bold text-rose-400 font-mono mt-2">
            {formatCurrency(dueSummary.totalDue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {t('khata.totalDueSub')}
          </div>
        </div>

        {/* Total Customers With Due */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium">{t('khata.customersWithDueCard')}</div>
          <div className="text-lg sm:text-2xl font-bold text-amber-300 font-mono mt-2">
            {formatNumber(dueSummary.customersWithDueCount)}
          </div>
          <div className="text-[11px] text-amber-400 mt-1">
            {t('khata.customersWithDueSub')}
          </div>
        </div>

        {/* Highest Due Customer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium">{t('khata.highestDueCustomerCard')}</div>
          <div className="text-sm font-bold text-white truncate mt-2">
            {dueSummary.highestDueCustomer ? dueSummary.highestDueCustomer.name : t('khata.none')}
          </div>
          <div className="text-xs font-mono font-bold text-rose-400 mt-0.5">
            {dueSummary.highestDueCustomer ? formatCurrency(dueSummary.highestDueCustomer.total_due) : formatCurrency(0)}
          </div>
        </div>

        {/* Total Due Collected */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium">{t('khata.totalCollectedCard')}</div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-400 font-mono mt-2">
            {formatCurrency(dueSummary.totalCollected)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            {t('khata.totalCollectedSub')}
          </div>
        </div>
      </div>

      {/* Main Customer Due Table & Search Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Controls bar */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-950/40">
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            <button
              onClick={() => setDueFilter('due_only')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dueFilter === 'due_only'
                  ? 'bg-rose-600/20 text-rose-300 border border-rose-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('khata.dueOnly')} ({formatNumber(customers.filter((c) => c.total_due > 0).length)})
            </button>
            <button
              onClick={() => setDueFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dueFilter === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('khata.allCustomers')} ({formatNumber(customers.length)})
            </button>
            <button
              onClick={() => setDueFilter('cleared')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dueFilter === 'cleared'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {t('khata.cleared')} ({formatNumber(customers.filter((c) => c.total_due <= 0).length)})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder={t('khata.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Customer Due List (Mobile Cards on < md, Desktop Table on >= md) */}
        {customerDueList.length === 0 ? (
          <div className="p-8 sm:p-12 text-center text-slate-500">
            <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-slate-400">{t('khata.noCustomersFound')}</p>
          </div>
        ) : (
          <>
            {/* Mobile Card View (screen sizes < md) */}
            <div className="block md:hidden p-3 space-y-3">
              {customerDueList.map((cust) => {
                const hasDue = cust.total_due > 0;
                return (
                  <div
                    key={cust.id}
                    className="p-3.5 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3 shadow-md"
                  >
                    {/* Customer Header & Due Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <button
                          onClick={() => onOpenCustomerProfile(cust.id)}
                          className="font-bold text-sm text-white hover:text-purple-400 text-left transition-colors flex items-center"
                        >
                          <User className="w-3.5 h-3.5 mr-1.5 text-purple-400 shrink-0" />
                          <span className="truncate">{cust.name}</span>
                        </button>
                        {cust.address && (
                          <div className="text-[11px] text-slate-400 truncate pl-5 mt-0.5">
                            {cust.address}
                          </div>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        {hasDue ? (
                          <div className="font-mono font-black text-rose-400 text-sm sm:text-base">
                            {formatCurrency(cust.total_due)}
                          </div>
                        ) : (
                          <div className="font-mono text-emerald-400 text-xs font-semibold">
                            {formatCurrency(0)} ({t('khata.paidBadge')})
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Contact & Status Row */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center space-x-2">
                        <a
                          href={`tel:${cust.phone}`}
                          className="font-mono text-slate-300 hover:text-white flex items-center bg-slate-900 px-2 py-1 rounded-lg border border-slate-800"
                        >
                          <Phone className="w-3 h-3 mr-1 text-slate-400" />
                          {cust.phone}
                        </a>

                        {hasDue && (
                          <a
                            href={formatWhatsAppUrl(cust.phone, cust.name, cust.total_due)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold transition-all"
                          >
                            <MessageSquare className="w-3 h-3 mr-1" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>

                      <div>
                        {cust.total_due > 2000 ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                            <AlertCircle className="w-3 h-3 mr-1" /> {t('khata.highDueBadge')}
                          </span>
                        ) : cust.total_due > 0 ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                            {t('khata.pendingDueBadge')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> {t('khata.clearBadge')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions Row */}
                    <div className="flex items-center space-x-2 pt-1">
                      {hasDue && (
                        <button
                          onClick={() => onOpenCollectDue(cust.id)}
                          className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center justify-center space-x-1 active:scale-98"
                        >
                          <CreditCard className="w-3.5 h-3.5 mr-1" />
                          <span>{t('khata.collectDue')}</span>
                        </button>
                      )}
                      <button
                        onClick={() => onOpenCustomerProfile(cust.id)}
                        className={`${hasDue ? 'flex-1' : 'w-full'} py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center space-x-1 border border-slate-700/80 active:scale-98`}
                      >
                        <FileText className="w-3.5 h-3.5 mr-1" />
                        <span>{t('khata.ledger')}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table View (screen sizes >= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-950/60">
                    <th className="py-3 px-4">{t('khata.thCustomer')}</th>
                    <th className="py-3 px-4">{t('khata.thContact')}</th>
                    <th className="py-3 px-4 text-right">{t('khata.thTotalDue')}</th>
                    <th className="py-3 px-4 text-center">{t('khata.thStatus')}</th>
                    <th className="py-3 px-4 text-center">{t('khata.thReminder')}</th>
                    <th className="py-3 px-4 text-right">{t('khata.thActions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {customerDueList.map((cust) => {
                    const hasDue = cust.total_due > 0;
                    return (
                      <tr key={cust.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Name & Address */}
                        <td className="py-3 px-4">
                          <button
                            onClick={() => onOpenCustomerProfile(cust.id)}
                            className="font-bold text-slate-100 hover:text-purple-400 text-xs text-left transition-colors flex items-center"
                          >
                            <User className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                            {cust.name}
                          </button>
                          {cust.address && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate pl-5">
                              {cust.address}
                            </div>
                          )}
                        </td>

                        {/* Contact Phone */}
                        <td className="py-3 px-4 font-mono text-slate-300">
                          <a href={`tel:${cust.phone}`} className="hover:text-purple-300 flex items-center">
                            <Phone className="w-3 h-3 mr-1 text-slate-500" />
                            {cust.phone}
                          </a>
                        </td>

                        {/* Total Due Amount */}
                        <td className="py-3 px-4 text-right font-mono font-bold">
                          {hasDue ? (
                            <span className="text-rose-400 text-sm">{formatCurrency(cust.total_due)}</span>
                          ) : (
                            <span className="text-emerald-400 text-xs">{formatCurrency(0)} ({t('khata.paidBadge')})</span>
                          )}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3 px-4 text-center">
                          {cust.total_due > 2000 ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                              <AlertCircle className="w-3 h-3 mr-1" /> {t('khata.highDueBadge')}
                            </span>
                          ) : cust.total_due > 0 ? (
                            <span className="inline-flex items-center text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                              {t('khata.pendingDueBadge')}
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> {t('khata.clearBadge')}
                            </span>
                          )}
                        </td>

                        {/* WhatsApp Reminder Button */}
                        <td className="py-3 px-4 text-center">
                          {hasDue ? (
                            <a
                              href={formatWhatsAppUrl(cust.phone, cust.name, cust.total_due)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-400 text-[11px] font-semibold transition-all"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{t('khata.sendReminder')}</span>
                            </a>
                          ) : (
                            <span className="text-slate-600 text-[11px]">-</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            {hasDue && (
                              <button
                                onClick={() => onOpenCollectDue(cust.id)}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-[11px] font-bold transition-colors shadow-sm"
                              >
                                {t('khata.collectDue')}
                              </button>
                            )}
                            <button
                              onClick={() => onOpenCustomerProfile(cust.id)}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors flex items-center"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              {t('khata.ledger')}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Due Collection Log History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">{t('khata.receiptHistoryTitle')}</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {t('khata.totalMoneyReceipts', { count: formatNumber(dueCollections.length) })}
          </span>
        </div>

        {dueCollections.length === 0 ? (
          <div className="py-6 text-center text-slate-500 text-xs">
            {t('khata.noReceipts')}
          </div>
        ) : (
          <>
            {/* Mobile Receipts View (< md) */}
            <div className="block md:hidden space-y-2.5">
              {dueCollections.map((col) => {
                const cust = customers.find((c) => c.id === col.customer_id);
                return (
                  <div
                    key={col.id}
                    className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-slate-200">
                        REC-{col.id.toString().padStart(4, '0')}
                      </span>
                      <span className="font-mono font-bold text-emerald-400 text-xs">
                        {formatCurrency(col.amount_paid)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span className="font-medium text-white">
                        {cust ? cust.name : 'Unknown Customer'}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {formatDate(col.payment_date)}
                      </span>
                    </div>
                    {col.note && (
                      <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800/60">
                        {col.note}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Desktop Receipts Table (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <th className="py-2 px-3">{t('khata.thReceiptDate')}</th>
                    <th className="py-2 px-3">{t('khata.thCustomer')}</th>
                    <th className="py-2 px-3 text-right">{t('khata.thAmountPaid')}</th>
                    <th className="py-2 px-3">{t('khata.thNote')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {dueCollections.map((col) => {
                    const cust = customers.find((c) => c.id === col.customer_id);
                    return (
                      <tr key={col.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-2.5 px-3 font-mono">
                          <div className="font-bold text-slate-200">REC-{col.id.toString().padStart(4, '0')}</div>
                          <div className="text-[10px] text-slate-500">
                            {formatDate(col.payment_date)}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-200">
                          {cust ? cust.name : 'Unknown Customer'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          {formatCurrency(col.amount_paid)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 italic">
                          {col.note || 'Cash due collection payment'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

    </div>
  );
};
