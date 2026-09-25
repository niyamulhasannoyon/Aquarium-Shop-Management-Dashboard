'use client';

import React, { useState } from 'react';
import { CartItem, Customer } from '@/types/pos';
import {
  ShoppingCart,
  Trash2,
  Edit2,
  User,
  UserCheck,
  Search,
  Plus,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  UserPlus
} from 'lucide-react';

interface CartSummaryProps {
  cart: CartItem[];
  customers: Customer[];
  onRemoveItem: (index: number) => void;
  onEditItem: (item: CartItem) => void;
  onClearCart: () => void;
  onCompleteSale: (saleData: {
    isWalkIn: boolean;
    customerId: number | null;
    walkInName: string;
    walkInPhone: string;
    paidAmount: number;
  }) => Promise<void>;
  isSubmitting: boolean;
}

export const CartSummary: React.FC<CartSummaryProps> = ({
  cart,
  customers,
  onRemoveItem,
  onEditItem,
  onClearCart,
  onCompleteSale,
  isSubmitting,
}) => {
  const [isWalkIn, setIsWalkIn] = useState<boolean>(true);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [isSearchingCustomer, setIsSearchingCustomer] = useState<boolean>(false);
  
  // Walk-in mandatory customer details when due > 0
  const [walkInName, setWalkInName] = useState<string>('');
  const [walkInPhone, setWalkInPhone] = useState<string>('');
  const [walkInError, setWalkInError] = useState<string>('');

  // Financial calculations
  const grandTotal = React.useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const [paidAmountInput, setPaidAmountInput] = useState<string>('');
  
  // Update paid amount when grand total changes if paid input is empty
  React.useEffect(() => {
    if (!paidAmountInput && grandTotal > 0) {
      setPaidAmountInput(grandTotal.toString());
    }
  }, [grandTotal]);

  const paidAmount = parseFloat(paidAmountInput) || 0;
  const rawDifference = grandTotal - paidAmount;
  const dueAmount = rawDifference > 0 ? Number(rawDifference.toFixed(2)) : 0;
  const changeAmount = rawDifference < 0 ? Number(Math.abs(rawDifference).toFixed(2)) : 0;

  // Filter existing customers search
  const filteredCustomers = React.useMemo(() => {
    if (!customerSearchQuery.trim()) return customers;
    const q = customerSearchQuery.toLowerCase();
    return customers.filter(
      (c) => c.name.toLowerCase().includes(q) || c.phone.includes(q)
    );
  }, [customers, customerSearchQuery]);

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleQuickPay = (amount: number | 'exact') => {
    if (amount === 'exact') {
      setPaidAmountInput(grandTotal.toString());
    } else {
      setPaidAmountInput(amount.toString());
    }
  };

  const handleCheckoutSubmit = async () => {
    setWalkInError('');

    if (cart.length === 0) return;

    // Validate Walk-in due requirement
    if (isWalkIn && dueAmount > 0) {
      if (!walkInName.trim() || !walkInPhone.trim()) {
        setWalkInError(
          'Customer Name & Phone are required for Walk-in orders with a due balance!'
        );
        return;
      }
    }

    if (!isWalkIn && !selectedCustomerId) {
      setWalkInError('Please select a customer from the database or switch to Walk-in Customer.');
      return;
    }

    await onCompleteSale({
      isWalkIn,
      customerId: selectedCustomerId,
      walkInName,
      walkInPhone,
      paidAmount,
    });
  };

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Right Header */}
      <div className="p-4 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <ShoppingCart className="w-5 h-5 text-emerald-400" />
          <h2 className="font-semibold text-slate-100 text-lg">Order Summary</h2>
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium border border-slate-700">
            {cart.length} {cart.length === 1 ? 'item' : 'items'}
          </span>
        </div>
        {cart.length > 0 && (
          <button
            onClick={onClearCart}
            className="text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 border border-rose-500/20"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear Cart
          </button>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5 min-h-[180px]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-8">
            <ShoppingCart className="w-12 h-12 mb-2 text-slate-700 stroke-[1.5]" />
            <p className="text-sm font-medium text-slate-400">Cart is empty</p>
            <p className="text-xs text-slate-500 mt-1">Select items from the catalog on the left</p>
          </div>
        ) : (
          cart.map((item, index) => (
            <div
              key={`${item.productId}-${item.unitType}-${index}`}
              className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl hover:border-slate-700 transition-all flex items-center justify-between group"
            >
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold text-slate-100 text-sm truncate">
                    {item.name}
                  </h4>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shrink-0">
                    {item.unitType}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center gap-3">
                  <span>
                    Qty: <strong className="text-slate-200">{item.quantity}</strong> ({item.multiplier * item.quantity} pcs)
                  </span>
                  <span>×</span>
                  <span>৳{item.price.toLocaleString()}</span>
                </div>
              </div>

              {/* Subtotal & Controls */}
              <div className="flex items-center space-x-3 shrink-0">
                <span className="font-bold text-slate-100 text-sm">
                  ৳{item.subtotal.toLocaleString()}
                </span>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => onEditItem(item)}
                    className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Edit Item"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onRemoveItem(index)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition-colors"
                    title="Remove Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Checkout Section: Customer & Financial Summary */}
      <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-4">
        {/* Customer Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Customer Details
            </span>
            <div className="flex bg-slate-900 p-0.5 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsWalkIn(true);
                  setSelectedCustomerId(null);
                  setWalkInError('');
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  isWalkIn
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Walk-in
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsWalkIn(false);
                  setWalkInError('');
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                  !isWalkIn
                    ? 'bg-emerald-500 text-slate-950 font-semibold shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Existing
              </button>
            </div>
          </div>

          {/* If Existing Customer mode */}
          {!isWalkIn && (
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setIsSearchingCustomer(true);
                  }}
                  onFocus={() => setIsSearchingCustomer(true)}
                  placeholder="Search existing customer by name or phone..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-900 text-xs text-slate-100 placeholder-slate-500 rounded-xl border border-slate-800 focus:border-emerald-500 outline-none"
                />
              </div>

              {/* Customer Search Dropdown */}
              {isSearchingCustomer && (
                <div className="max-h-36 overflow-y-auto bg-slate-900 border border-slate-800 rounded-xl shadow-xl divide-y divide-slate-800/60">
                  {filteredCustomers.length === 0 ? (
                    <div className="p-3 text-xs text-slate-500 text-center">No customer matches search</div>
                  ) : (
                    filteredCustomers.map((cust) => (
                      <button
                        key={cust.id}
                        onClick={() => {
                          setSelectedCustomerId(cust.id);
                          setCustomerSearchQuery(`${cust.name} (${cust.phone})`);
                          setIsSearchingCustomer(false);
                        }}
                        className={`w-full text-left p-2.5 hover:bg-slate-800 transition-colors flex items-center justify-between text-xs ${
                          selectedCustomerId === cust.id ? 'bg-slate-800/80 border-l-2 border-emerald-500' : ''
                        }`}
                      >
                        <div>
                          <p className="font-semibold text-slate-200">{cust.name}</p>
                          <p className="text-slate-400 text-[11px]">{cust.phone}</p>
                        </div>
                        {cust.total_due > 0 && (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Due: ৳{cust.total_due.toLocaleString()}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}

              {selectedCustomer && (
                <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-emerald-400">{selectedCustomer.name}</span>
                    <span className="text-slate-400 ml-2">({selectedCustomer.phone})</span>
                  </div>
                  {selectedCustomer.total_due > 0 && (
                    <span className="text-amber-400 font-medium">Existing Due: ৳{selectedCustomer.total_due}</span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* If Walk-in customer mode AND due > 0 requirement */}
          {isWalkIn && dueAmount > 0 && (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2.5 animate-in fade-in">
              <div className="flex items-center space-x-1.5 text-xs text-amber-400 font-semibold">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Walk-in Due Order — Customer Details Required</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-300 block font-medium mb-1">
                    Customer Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={walkInName}
                    onChange={(e) => setWalkInName(e.target.value)}
                    placeholder="e.g. Shakib"
                    className="w-full px-3 py-1.5 bg-slate-900 text-xs text-slate-100 rounded-lg border border-amber-500/40 focus:border-amber-400 outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-300 block font-medium mb-1">
                    Phone Number <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={walkInPhone}
                    onChange={(e) => setWalkInPhone(e.target.value)}
                    placeholder="e.g. 01700000000"
                    className="w-full px-3 py-1.5 bg-slate-900 text-xs text-slate-100 rounded-lg border border-amber-500/40 focus:border-amber-400 outline-none"
                  />
                </div>
              </div>
            </div>
          )}

          {walkInError && (
            <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{walkInError}</span>
            </div>
          )}
        </div>

        {/* Financial Breakdown & Payment Input */}
        <div className="space-y-3 pt-2 border-t border-slate-800">
          <div className="flex justify-between items-baseline">
            <span className="text-xs text-slate-400 uppercase font-semibold">Grand Total</span>
            <span className="text-2xl font-black text-slate-100 tracking-tight">
              ৳{grandTotal.toLocaleString()}
            </span>
          </div>

          {/* Quick Pay Shortcuts */}
          <div className="space-y-1.5">
            <label className="text-[11px] text-slate-400 uppercase font-semibold block">
              Quick Pay Options
            </label>
            <div className="grid grid-cols-5 gap-1.5">
              <button
                type="button"
                onClick={() => handleQuickPay('exact')}
                className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-lg text-xs font-bold text-emerald-400 transition-colors"
              >
                Exact
              </button>
              {[100, 500, 1000, 5000].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleQuickPay(amt)}
                  className="py-1.5 px-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 rounded-lg text-xs font-semibold text-slate-300 transition-colors"
                >
                  ৳{amt}
                </button>
              ))}
            </div>
          </div>

          {/* Paid Amount Field */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Paid Amount (৳)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                min="0"
                value={paidAmountInput}
                onChange={(e) => setPaidAmountInput(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="0.00"
                className="w-full px-3 py-2.5 bg-slate-900 text-slate-100 font-extrabold text-lg rounded-xl border border-slate-700 focus:border-emerald-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Real-time Due / Change Status */}
          {dueAmount > 0 ? (
            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-amber-400">
              <span className="text-xs font-semibold uppercase">Remaining Due:</span>
              <span className="text-lg font-black">৳{dueAmount.toLocaleString()}</span>
            </div>
          ) : changeAmount > 0 ? (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-emerald-400">
              <span className="text-xs font-semibold uppercase">Change Return:</span>
              <span className="text-lg font-black">৳{changeAmount.toLocaleString()}</span>
            </div>
          ) : (
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-slate-400 text-xs">
              <span>Payment Status:</span>
              <span className="font-semibold text-emerald-400">Fully Paid</span>
            </div>
          )}
        </div>

        {/* Complete Sale Button */}
        <button
          onClick={handleCheckoutSubmit}
          disabled={cart.length === 0 || isSubmitting}
          className={`w-full py-4 px-6 rounded-xl text-base font-extrabold flex items-center justify-center space-x-3 shadow-xl transition-all ${
            cart.length === 0 || isSubmitting
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-[0.98]'
          }`}
        >
          {isSubmitting ? (
            <div className="flex items-center space-x-2">
              <div className="w-5 h-5 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
              <span>Processing Sale...</span>
            </div>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" />
              <span>Complete Sale</span>
              <ArrowRight className="w-5 h-5" />
            </>
          )}
        </button>
      </div>
    </div>
  );
};
