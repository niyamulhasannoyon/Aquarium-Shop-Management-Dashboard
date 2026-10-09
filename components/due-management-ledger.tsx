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
      `প্রিয় ${name}, অ্যাকোয়া প্লেস বিডিতে (Aqua Place BD) আপনার বকেয়া বাকি টাকার পরিমাণ ৳${amount}। অনুরোধপূর্বক বকেয়া টাকা পরিশোধ করুন। ধন্যবাদ!`
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
              <h2 className="text-lg font-bold text-white">প্রফেশনাল বাকির খাতা ও লেজার ম্যানেজমেন্ট (Due Khata Ledger)</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                গ্রাহকদের বকেয়া হিসাব, হোয়াটসঅ্যাপে তাগাদা পাঠানো এবং প্রফেশনাল বাকি আদায় সিস্টেম
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => onOpenCollectDue()}
          className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-emerald-600 hover:from-amber-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-amber-900/30 flex items-center justify-center transition-all"
        >
          <CreditCard className="w-4 h-4 mr-2" />
          + বাকি আদায় এনট্রি করুন
        </button>
      </div>

      {/* Top 4 Due Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Outstanding Due */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium">মোট বকেয়া বাকি (Total Due)</div>
          <div className="text-lg sm:text-2xl font-bold text-rose-400 font-mono mt-2">
            {formatCurrency(dueSummary.totalDue)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            বাজারের সর্বমোট বাকি টাকা
          </div>
        </div>

        {/* Total Customers With Due */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium">বাকিদার খদ্দের সংখ্যা</div>
          <div className="text-lg sm:text-2xl font-bold text-amber-300 font-mono mt-2">
            {dueSummary.customersWithDueCount} জন
          </div>
          <div className="text-[11px] text-amber-400 mt-1">
            যাদের একাউন্টে বকেয়া রয়েছে
          </div>
        </div>

        {/* Highest Due Customer */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium">সর্বোচ্চ বকেয়া খদ্দের</div>
          <div className="text-sm font-bold text-white truncate mt-2">
            {dueSummary.highestDueCustomer ? dueSummary.highestDueCustomer.name : 'নেই'}
          </div>
          <div className="text-xs font-mono font-bold text-rose-400 mt-0.5">
            {dueSummary.highestDueCustomer ? formatCurrency(dueSummary.highestDueCustomer.total_due) : '৳0.00'}
          </div>
        </div>

        {/* Total Due Collected */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 relative overflow-hidden">
          <div className="text-slate-400 text-xs font-medium">মোট আদায়কৃত বাকি</div>
          <div className="text-lg sm:text-2xl font-bold text-emerald-400 font-mono mt-2">
            {formatCurrency(dueSummary.totalCollected)}
          </div>
          <div className="text-[11px] text-emerald-400 mt-1">
            কাস্টমারদের থেকে ক্যাশ/বিকাশে আদায়
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
              বাকিদার কাস্টমার ({customers.filter((c) => c.total_due > 0).length})
            </button>
            <button
              onClick={() => setDueFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dueFilter === 'all'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              সকল কাস্টমার ({customers.length})
            </button>
            <button
              onClick={() => setDueFilter('cleared')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                dueFilter === 'cleared'
                  ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              পরিশোধিত একাউন্ট ({customers.filter((c) => c.total_due <= 0).length})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="নাম বা ফোন নাম্বার দিয়ে খুঁজুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>
        </div>

        {/* Customer Due Table */}
        <div className="overflow-x-auto">
          {customerDueList.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <User className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm font-semibold text-slate-400">কোন কাস্টমার তালিকা পাওয়া যায়নি</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 bg-slate-950/60">
                  <th className="py-3 px-4">কাস্টমার (Customer Name)</th>
                  <th className="py-3 px-4">যোগাযোগ (Contact)</th>
                  <th className="py-3 px-4 text-right">বকেয়া টাকার পরিমাণ (Total Due)</th>
                  <th className="py-3 px-4 text-center">স্ট্যাটাস (Status)</th>
                  <th className="py-3 px-4 text-center">তাগাদা (WhatsApp Reminder)</th>
                  <th className="py-3 px-4 text-right">অ্যাকশন (Actions)</th>
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
                          <span className="text-emerald-400 text-xs">৳0.00 (পরিশোধিত)</span>
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center">
                        {cust.total_due > 2000 ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/30">
                            <AlertCircle className="w-3 h-3 mr-1" /> High Due
                          </span>
                        ) : cust.total_due > 0 ? (
                          <span className="inline-flex items-center text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/30">
                            Pending Due
                          </span>
                        ) : (
                          <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Account Clear
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
                            <span>WhatsApp তাগাদা</span>
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
                              বাকি আদায়
                            </button>
                          )}
                          <button
                            onClick={() => onOpenCustomerProfile(cust.id)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold transition-colors flex items-center"
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            লেজার
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Due Collection Log History */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-white">সর্বশেষ বাকি পরিশোধের ইতিহাস (Due Receipts History)</h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            মোট {dueCollections.length} টি মানি রিসিট
          </span>
        </div>

        <div className="overflow-x-auto">
          {dueCollections.length === 0 ? (
            <div className="py-6 text-center text-slate-500 text-xs">
              কোন বাকি আদায়ের রেকর্ড পাওয়া যায়নি।
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                  <th className="py-2 px-3">রিসিট নং & তারিখ</th>
                  <th className="py-2 px-3">কাস্টমার</th>
                  <th className="py-2 px-3 text-right">আদায়কৃত টাকা</th>
                  <th className="py-2 px-3">নোট / পেমেন্ট মাধ্যম</th>
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
                          {new Date(col.payment_date).toLocaleDateString()}
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
          )}
        </div>
      </div>

    </div>
  );
};
