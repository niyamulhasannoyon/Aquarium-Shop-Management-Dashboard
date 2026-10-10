'use client';

import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Layers,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  Sale,
  Purchase,
  DueCollection,
  Customer,
  Product,
  SaleItem,
  TimeframePeriod,
  CombinedActivityEvent,
} from '@/types/executive';
import {
  getCombinedActivityFeed,
  formatCurrency,
  isDateInTimeframe,
} from '@/lib/calculations';

import { useLanguage } from '@/context/language-context';

interface DailyActivityLedgerProps {
  sales: Sale[];
  purchases: Purchase[];
  dueCollections: DueCollection[];
  customers: Customer[];
  products: Product[];
  saleItems: SaleItem[];
  onOpenNewSale?: () => void;
  onOpenAddStock?: () => void;
  onOpenCollectDue?: () => void;
}

export const DailyActivityLedger: React.FC<DailyActivityLedgerProps> = ({
  sales,
  purchases,
  dueCollections,
  customers,
  products,
  saleItems,
  onOpenNewSale,
  onOpenAddStock,
  onOpenCollectDue,
}) => {
  const { t, formatCurrency, formatNumber, formatDate } = useLanguage();
  const [selectedTimeframe, setSelectedTimeframe] = useState<TimeframePeriod>('overall');
  const [selectedType, setSelectedType] = useState<'all' | 'sale' | 'purchase' | 'collection'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 1. Get raw combined activity list
  const allEvents = useMemo(() => {
    return getCombinedActivityFeed({
      sales,
      purchases,
      dueCollections,
      customers,
      products,
      saleItems,
    });
  }, [sales, purchases, dueCollections, customers, products, saleItems]);

  // 2. Filter by timeframe, type, and search query
  const filteredEvents = useMemo(() => {
    return allEvents.filter((evt) => {
      // Timeframe filter
      const matchesTime = isDateInTimeframe(
        evt.dateStr,
        selectedTimeframe,
        customStartDate,
        customEndDate
      );
      if (!matchesTime) return false;

      // Type filter
      if (selectedType !== 'all' && evt.type !== selectedType) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const partyMatch = evt.partyName.toLowerCase().includes(q);
        const refMatch = evt.ref.toLowerCase().includes(q);
        const itemMatch = evt.itemsSummary?.toLowerCase().includes(q);
        const titleMatch = evt.title.toLowerCase().includes(q);
        if (!partyMatch && !refMatch && !itemMatch && !titleMatch) return false;
      }

      return true;
    });
  }, [allEvents, selectedTimeframe, selectedType, searchQuery, customStartDate, customEndDate]);

  // 3. Aggregate metrics for filtered events
  const summary = useMemo(() => {
    let salesTotal = 0;
    let purchasesTotal = 0;
    let collectionsTotal = 0;
    let profitTotal = 0;
    let salesCount = 0;
    let purchasesCount = 0;
    let collectionsCount = 0;

    filteredEvents.forEach((evt) => {
      if (evt.type === 'sale') {
        salesTotal += evt.totalAmount;
        profitTotal += evt.profit || 0;
        salesCount++;
      } else if (evt.type === 'purchase') {
        purchasesTotal += evt.totalAmount;
        purchasesCount++;
      } else if (evt.type === 'collection') {
        collectionsTotal += evt.totalAmount;
        collectionsCount++;
      }
    });

    return {
      salesTotal,
      purchasesTotal,
      collectionsTotal,
      profitTotal,
      salesCount,
      purchasesCount,
      collectionsCount,
      netCashFlow: salesTotal + collectionsTotal - purchasesTotal,
    };
  }, [filteredEvents]);

  // Group events by day for clean timeline display
  const groupedEventsByDay = useMemo(() => {
    const groups: { [dayKey: string]: CombinedActivityEvent[] } = {};
    filteredEvents.forEach((evt) => {
      const dateObj = new Date(evt.dateStr);
      const dayKey = dateObj.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      if (!groups[dayKey]) groups[dayKey] = [];
      groups[dayKey].push(evt);
    });
    return Object.entries(groups);
  }, [filteredEvents]);

  return (
    <div className="space-y-6">
      
      {/* Top Filter Bar & Timeframe Switcher */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-bold text-white">{t('ledger.title')}</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              {t('ledger.subtitle')}
            </p>
          </div>

          {/* Timeframe Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setSelectedTimeframe('today')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedTimeframe === 'today'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t('ledger.today')}
            </button>
            <button
              onClick={() => setSelectedTimeframe('this_month')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedTimeframe === 'this_month'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t('ledger.thisMonth')}
            </button>
            <button
              onClick={() => setSelectedTimeframe('overall')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedTimeframe === 'overall'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t('ledger.overall')}
            </button>
            <button
              onClick={() => setSelectedTimeframe('custom')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                selectedTimeframe === 'custom'
                  ? 'bg-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {t('ledger.customDate')}
            </button>
          </div>
        </div>

        {/* Custom Date Range Picker if selected */}
        {selectedTimeframe === 'custom' && (
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3 animate-in fade-in">
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">{t('ledger.from')}</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-slate-400">{t('ledger.to')}</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-white text-xs px-3 py-1.5 rounded-lg focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>
        )}
      </div>

      {/* Timeframe Financial Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Sales in Timeframe */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t('ledger.totalSales')}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-white font-mono mt-2">
            {formatCurrency(summary.salesTotal)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1 flex items-center">
            {t('ledger.salesInvoicesCount', { count: formatNumber(summary.salesCount) })}
          </div>
        </div>

        {/* Total Purchases in Timeframe */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t('ledger.purchases')}</span>
            <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-indigo-300 font-mono mt-2">
            {formatCurrency(summary.purchasesTotal)}
          </div>
          <div className="text-[11px] text-indigo-400 mt-1 flex items-center">
            {t('ledger.purchasesCount', { count: formatNumber(summary.purchasesCount) })}
          </div>
        </div>

        {/* Due Collected in Timeframe */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t('ledger.dueCollections')}</span>
            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-amber-300 font-mono mt-2">
            {formatCurrency(summary.collectionsTotal)}
          </div>
          <div className="text-[11px] text-amber-400 mt-1 flex items-center">
            {t('ledger.dueCollectionsCount', { count: formatNumber(summary.collectionsCount) })}
          </div>
        </div>

        {/* Net Profit in Timeframe */}
        <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-4 relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>{t('ledger.realizedProfit')}</span>
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-400 font-mono mt-2">
            {formatCurrency(summary.profitTotal)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {t('ledger.profitSub')}
          </div>
        </div>
      </div>

      {/* Activity Log Controls (Search & Activity Type Tabs) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Activity Type Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
              selectedType === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t('ledger.allTransactions')} ({formatNumber(allEvents.length)})
          </button>
          <button
            onClick={() => setSelectedType('sale')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center ${
              selectedType === 'sale'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> {t('ledger.salesOnly')}
          </button>
          <button
            onClick={() => setSelectedType('purchase')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center ${
              selectedType === 'purchase'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 mr-1" /> {t('ledger.purchasesOnly')}
          </button>
          <button
            onClick={() => setSelectedType('collection')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center ${
              selectedType === 'collection'
                ? 'bg-amber-600/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 mr-1" /> {t('ledger.collectionsOnly')}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder={t('ledger.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Timeline Day-by-Day Activity Feed List */}
      <div className="space-y-4">
        {groupedEventsByDay.length === 0 ? (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-500">
            <Clock className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-semibold text-slate-400">{t('ledger.noRecords')}</p>
            <p className="text-xs text-slate-500 mt-1">{t('ledger.noRecordsSub')}</p>
          </div>
        ) : (
          groupedEventsByDay.map(([dayLabel, events]) => (
            <div key={dayLabel} className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-lg">
              {/* Day Header */}
              <div className="bg-slate-800/60 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-slate-200">{dayLabel}</span>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {t('ledger.activityCount', { count: formatNumber(events.length) })}
                </div>
              </div>

              {/* Day's Event Table */}
              <div className="divide-y divide-slate-800/60 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-wider text-slate-400 border-b border-slate-800/80 bg-slate-950/40">
                      <th className="py-2 px-3.5">{t('ledger.tableTimeRef')}</th>
                      <th className="py-2 px-3.5">{t('ledger.tableType')}</th>
                      <th className="py-2 px-3.5">{t('ledger.tablePartyDesc')}</th>
                      <th className="py-2 px-3.5 text-right">{t('ledger.tableTotal')}</th>
                      <th className="py-2 px-3.5 text-right">{t('ledger.tablePaid')}</th>
                      <th className="py-2 px-3.5 text-right">{t('ledger.tableDue')}</th>
                      <th className="py-2 px-3.5 text-right">{t('ledger.tableProfit')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {events.map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-800/40 transition-colors">
                        {/* Time & Ref */}
                        <td className="py-3 px-3.5 font-mono">
                          <div className="font-bold text-slate-200">{evt.ref}</div>
                          <div className="text-[10px] text-slate-500">
                            {new Date(evt.dateStr).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </div>
                        </td>

                        {/* Event Type Badge */}
                        <td className="py-3 px-3.5">
                          {evt.type === 'sale' && (
                            <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              <ArrowUpRight className="w-3.5 h-3.5 mr-1" /> {t('ledger.badgeSell')}
                            </span>
                          )}
                          {evt.type === 'purchase' && (
                            <span className="inline-flex items-center text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                              <ArrowDownLeft className="w-3.5 h-3.5 mr-1" /> {t('ledger.badgeBuy')}
                            </span>
                          )}
                          {evt.type === 'collection' && (
                            <span className="inline-flex items-center text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              <CreditCard className="w-3.5 h-3.5 mr-1" /> {t('ledger.badgeDue')}
                            </span>
                          )}
                        </td>

                        {/* Party & Description */}
                        <td className="py-3 px-3.5 max-w-xs">
                          <div className="font-semibold text-slate-100">{evt.partyName}</div>
                          {evt.itemsSummary && (
                            <div className="text-[11px] text-slate-400 truncate mt-0.5">
                              {evt.itemsSummary}
                            </div>
                          )}
                          {evt.note && (
                            <div className="text-[10px] text-slate-500 italic mt-0.5">
                              {evt.note}
                            </div>
                          )}
                        </td>

                        {/* Total Amount */}
                        <td className="py-3 px-3.5 text-right font-mono font-bold text-white">
                          {formatCurrency(evt.totalAmount)}
                        </td>

                        {/* Paid Amount */}
                        <td className="py-3 px-3.5 text-right font-mono font-semibold text-emerald-400">
                          {formatCurrency(evt.paidAmount)}
                        </td>

                        {/* Due Added */}
                        <td className="py-3 px-3.5 text-right font-mono">
                          {evt.dueAmount > 0 ? (
                            <span className="font-bold text-rose-400">
                              {formatCurrency(evt.dueAmount)}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>

                        {/* Profit Generated */}
                        <td className="py-3 px-3.5 text-right font-mono">
                          {evt.type === 'sale' && evt.profit !== undefined ? (
                            <span className="font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              +{formatCurrency(evt.profit)}
                            </span>
                          ) : (
                            <span className="text-slate-500">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
};
