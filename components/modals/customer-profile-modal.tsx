'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  User,
  Phone,
  MapPin,
  Receipt,
  CreditCard,
  PlusCircle,
  MessageSquare,
  Search,
  CheckCircle2,
  AlertCircle,
  History,
  DollarSign,
  UserPlus,
} from 'lucide-react';
import { Customer, Sale, SaleItem, DueCollection } from '@/types/executive';
import { formatCurrency } from '@/lib/calculations';

interface CustomerProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  sales: Sale[];
  saleItems: SaleItem[];
  dueCollections: DueCollection[];
  selectedCustomerId: number | null;
  onSelectCustomer: (id: number) => void;
  onOpenCollectDueForCustomer?: (customerId: number) => void;
  onOpenNewSaleForCustomer?: (customerId: number) => void;
  onOpenAddCustomer?: () => void;
}

export const CustomerProfileModal: React.FC<CustomerProfileModalProps> = ({
  isOpen,
  onClose,
  customers,
  sales,
  saleItems: _saleItems,
  dueCollections,
  selectedCustomerId,
  onSelectCustomer,
  onOpenCollectDueForCustomer,
  onOpenNewSaleForCustomer,
  onOpenAddCustomer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'ledger' | 'sales'>('ledger');

  // Filter customers for selector
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const q = searchQuery.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q) || (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, searchQuery]);

  // Current selected customer
  const currentCustomer = useMemo(() => {
    if (selectedCustomerId) {
      const found = customers.find((c) => c.id === selectedCustomerId);
      if (found) return found;
    }
    return customers[0] || null;
  }, [customers, selectedCustomerId]);

  // Calculate Customer Specific Statistics & Ledger
  const { customerSales, customerCollections, ledgerEvents, totalSalesAmount, totalPaidAmount } = useMemo(() => {
    if (!currentCustomer) {
      return {
        customerSales: [],
        customerCollections: [],
        ledgerEvents: [],
        totalSalesAmount: 0,
        totalPaidAmount: 0,
      };
    }

    const cSales = sales.filter((s) => s.customer_id === currentCustomer.id);
    const cCollections = dueCollections.filter((dc) => dc.customer_id === currentCustomer.id);

    const salesSum = cSales.reduce((acc, s) => acc + s.total_amount, 0);
    const paidInSalesSum = cSales.reduce((acc, s) => acc + s.paid_amount, 0);
    const collectionsSum = cCollections.reduce((acc, dc) => acc + dc.amount_paid, 0);
    const overallPaid = paidInSalesSum + collectionsSum;

    // Combine into chronologically sorted ledger events
    interface RawEvent {
      id: string;
      type: 'sale' | 'collection';
      timestamp: number;
      dateStr: string;
      ref: string;
      amount: number;
      paid: number;
      due_added: number;
      note?: string;
    }

    const events: RawEvent[] = [];

    cSales.forEach((s) => {
      events.push({
        id: `sale-${s.id}`,
        type: 'sale',
        timestamp: new Date(s.sale_date).getTime(),
        dateStr: s.sale_date,
        ref: s.invoice_no,
        amount: s.total_amount,
        paid: s.paid_amount,
        due_added: s.due_amount,
      });
    });

    cCollections.forEach((c) => {
      events.push({
        id: `col-${c.id}`,
        type: 'collection',
        timestamp: new Date(c.payment_date).getTime(),
        dateStr: c.payment_date,
        ref: `REC-${c.id.toString().padStart(4, '0')}`,
        amount: c.amount_paid,
        paid: c.amount_paid,
        due_added: 0,
        note: c.note || 'Due Collection Payment',
      });
    });

    events.sort((a, b) => a.timestamp - b.timestamp);

    let runningBalance = 0;
    const computedLedger = events.map((e) => {
      if (e.type === 'sale') {
        runningBalance += e.due_added;
      } else {
        runningBalance -= e.paid;
      }
      return {
        ...e,
        runningBalance: Math.max(0, Number(runningBalance.toFixed(2))),
      };
    });

    // Reverse for descending order (newest first)
    computedLedger.reverse();

    return {
      customerSales: cSales,
      customerCollections: cCollections,
      ledgerEvents: computedLedger,
      totalSalesAmount: salesSum,
      totalPaidAmount: overallPaid,
    };
  }, [currentCustomer, sales, dueCollections]);

  if (!isOpen) return null;

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  };

  const formatWhatsAppNumber = (phoneStr: string) => {
    const digits = phoneStr.replace(/\D/g, '');
    if (digits.startsWith('880')) return digits;
    if (digits.startsWith('0')) return `88${digits}`;
    return `880${digits}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-slate-900/80">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">Customer Directory & Ledger Statement</h3>
              <p className="text-[11px] sm:text-xs text-slate-400">View complete transaction timeline & due ledgers</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {onOpenAddCustomer && (
              <button
                onClick={() => {
                  onClose();
                  onOpenAddCustomer();
                }}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>+ New Customer</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body (Grid Layout) */}
        <div className="flex-1 grid grid-cols-1 md:grid-cols-12 overflow-hidden">
          
          {/* Left Column: Customer Selector & Directory (4 cols) */}
          <div className="md:col-span-4 border-r border-slate-800 flex flex-col bg-slate-900/50 max-h-[35vh] md:max-h-full">
            {/* Search Input */}
            <div className="p-3 border-b border-slate-800">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search by name, phone..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-slate-200 text-xs focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            {/* Customer List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60 p-2 space-y-1">
              {filteredCustomers.length === 0 ? (
                <div className="p-6 text-center text-slate-500 text-xs">No customers found</div>
              ) : (
                filteredCustomers.map((cust) => {
                  const isSelected = currentCustomer?.id === cust.id;
                  return (
                    <button
                      key={cust.id}
                      onClick={() => onSelectCustomer(cust.id)}
                      className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group ${
                        isSelected
                          ? 'bg-purple-600/20 border border-purple-500/40 text-white'
                          : 'hover:bg-slate-800/60 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            isSelected
                              ? 'bg-purple-600 text-white'
                              : 'bg-slate-800 text-slate-300 group-hover:bg-slate-700'
                          }`}
                        >
                          {getInitials(cust.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs truncate">{cust.name}</div>
                          <div className="text-[10px] text-slate-400 font-mono truncate">{cust.phone}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0 ml-2">
                        {cust.total_due > 0 ? (
                          <span className="text-[10px] font-bold font-mono text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                            ৳{cust.total_due}
                          </span>
                        ) : (
                          <span className="text-[10px] text-emerald-400 font-medium">Clear</span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Customer Profile Details & Ledger (8 cols) */}
          <div className="md:col-span-8 flex flex-col flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
            {currentCustomer ? (
              <>
                {/* Profile Card Summary Header */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white text-lg font-bold flex items-center justify-center shadow-lg shadow-purple-900/30">
                      {getInitials(currentCustomer.name)}
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h4 className="text-base sm:text-lg font-bold text-white">{currentCustomer.name}</h4>
                        {currentCustomer.total_due > 0 ? (
                          <span className="text-[10px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-full flex items-center">
                            <AlertCircle className="w-3 h-3 mr-1" /> Outstanding Due
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Account Clear
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400 mt-1">
                        <a
                          href={`tel:${currentCustomer.phone}`}
                          className="flex items-center text-slate-300 hover:text-purple-400 font-mono transition-colors"
                        >
                          <Phone className="w-3.5 h-3.5 mr-1 text-purple-400" />
                          {currentCustomer.phone}
                        </a>
                        <a
                          href={`https://wa.me/${formatWhatsAppNumber(currentCustomer.phone)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center text-emerald-400 hover:text-emerald-300 transition-colors"
                        >
                          <MessageSquare className="w-3.5 h-3.5 mr-1" /> WhatsApp
                        </a>
                        {currentCustomer.address && (
                          <span className="flex items-center text-slate-400">
                            <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
                            {currentCustomer.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Customer Direct Quick Action Triggers */}
                  <div className="flex items-center space-x-2 w-full sm:w-auto">
                    {onOpenNewSaleForCustomer && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenNewSaleForCustomer(currentCustomer.id);
                        }}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-900/30 flex items-center justify-center transition-colors"
                      >
                        <PlusCircle className="w-3.5 h-3.5 mr-1.5" /> New Sale
                      </button>
                    )}
                    {onOpenCollectDueForCustomer && currentCustomer.total_due > 0 && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenCollectDueForCustomer(currentCustomer.id);
                        }}
                        className="flex-1 sm:flex-none px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow-md shadow-amber-900/30 flex items-center justify-center transition-colors"
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5" /> Collect Due
                      </button>
                    )}
                  </div>
                </div>

                {/* 3 Metric Cards for Selected Customer */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-slate-800/50 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">Total Lifetime Purchases</div>
                    <div className="text-sm sm:text-base font-bold text-slate-100 font-mono mt-0.5">
                      {formatCurrency(totalSalesAmount)}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">Total Amount Paid</div>
                    <div className="text-sm sm:text-base font-bold text-emerald-400 font-mono mt-0.5">
                      {formatCurrency(totalPaidAmount)}
                    </div>
                  </div>
                  <div className="bg-slate-800/50 border border-slate-800 p-3 rounded-xl">
                    <div className="text-[11px] text-slate-400 font-medium">Current Outstanding Due</div>
                    <div
                      className={`text-sm sm:text-base font-bold font-mono mt-0.5 ${
                        currentCustomer.total_due > 0 ? 'text-rose-400' : 'text-slate-300'
                      }`}
                    >
                      {formatCurrency(currentCustomer.total_due)}
                    </div>
                  </div>
                </div>

                {/* Tab Navigation & Ledger Header */}
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setActiveTab('ledger')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center ${
                          activeTab === 'ledger'
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <History className="w-3.5 h-3.5 mr-1.5" /> Customer Ledger Timeline
                      </button>
                      <button
                        onClick={() => setActiveTab('sales')}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center ${
                          activeTab === 'sales'
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Receipt className="w-3.5 h-3.5 mr-1.5" /> Sales Invoices ({customerSales.length})
                      </button>
                    </div>
                    <span className="text-[11px] text-slate-500 hidden sm:inline">
                      Auto-calculated running balance ledger
                    </span>
                  </div>

                  {/* Tab 1: Combined Ledger Events */}
                  {activeTab === 'ledger' && (
                    <div className="mt-3 overflow-x-auto">
                      {ledgerEvents.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">
                          No transactions or due receipts recorded for this customer.
                        </div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                              <th className="py-2 px-2.5">Date & Ref</th>
                              <th className="py-2 px-2.5">Type</th>
                              <th className="py-2 px-2.5 text-right">Invoice Amount</th>
                              <th className="py-2 px-2.5 text-right">Paid</th>
                              <th className="py-2 px-2.5 text-right">Due Added</th>
                              <th className="py-2 px-2.5 text-right">Running Due Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {ledgerEvents.map((evt) => (
                              <tr key={evt.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="py-2.5 px-2.5 font-mono">
                                  <div className="font-bold text-slate-200">{evt.ref}</div>
                                  <div className="text-[10px] text-slate-500">
                                    {new Date(evt.dateStr).toLocaleDateString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      year: 'numeric',
                                    })}
                                  </div>
                                </td>
                                <td className="py-2.5 px-2.5">
                                  {evt.type === 'sale' ? (
                                    <span className="inline-flex items-center text-[10px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                      Sale Invoice
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                                      Due Receipt
                                    </span>
                                  )}
                                  {evt.note && <div className="text-[10px] text-slate-500 mt-0.5">{evt.note}</div>}
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-mono text-slate-300">
                                  {evt.type === 'sale' ? formatCurrency(evt.amount) : '-'}
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-mono text-emerald-400 font-semibold">
                                  {formatCurrency(evt.paid)}
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-mono text-rose-400">
                                  {evt.due_added > 0 ? formatCurrency(evt.due_added) : '-'}
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-mono font-bold text-amber-400 bg-amber-500/5">
                                  {formatCurrency(evt.runningBalance)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}

                  {/* Tab 2: Sales Invoices Only */}
                  {activeTab === 'sales' && (
                    <div className="mt-3 overflow-x-auto">
                      {customerSales.length === 0 ? (
                        <div className="text-center py-8 text-slate-500 text-xs">No sales invoices found</div>
                      ) : (
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                              <th className="py-2 px-2.5">Invoice No</th>
                              <th className="py-2 px-2.5">Date</th>
                              <th className="py-2 px-2.5 text-right">Total Amount</th>
                              <th className="py-2 px-2.5 text-right">Paid Amount</th>
                              <th className="py-2 px-2.5 text-right">Due Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/60">
                            {customerSales.map((sale) => (
                              <tr key={sale.id} className="hover:bg-slate-800/30 transition-colors">
                                <td className="py-2.5 px-2.5 font-mono font-bold text-slate-200">
                                  {sale.invoice_no}
                                </td>
                                <td className="py-2.5 px-2.5 text-slate-400">
                                  {new Date(sale.sale_date).toLocaleDateString()}
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-mono text-white font-bold">
                                  {formatCurrency(sale.total_amount)}
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-mono text-emerald-400 font-semibold">
                                  {formatCurrency(sale.paid_amount)}
                                </td>
                                <td className="py-2.5 px-2.5 text-right font-mono text-rose-400 font-bold">
                                  {sale.due_amount > 0 ? formatCurrency(sale.due_amount) : '৳0.00'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
                <User className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium text-slate-400">Select a customer from the left directory</p>
                <p className="text-xs text-slate-500">or click "+ New Customer" to register a client.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
