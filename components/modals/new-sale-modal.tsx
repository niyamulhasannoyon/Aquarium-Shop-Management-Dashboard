'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  X,
  ShoppingBag,
  Plus,
  Trash2,
  Check,
  Search,
  Phone,
  UserPlus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { Customer, Product } from '@/types/executive';
import { formatCurrency } from '@/lib/calculations';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  initialCustomerId?: number | null;
  onSubmitSale: (saleData: {
    customer_id: number | null;
    new_customer?: {
      name: string;
      phone?: string;
    };
    items: Array<{
      product_id: number;
      unit_type: string;
      quantity: number;
      multiplier: number;
      unit_price: number;
      cost_price_snapshot: number;
      subtotal: number;
    }>;
    total_amount: number;
    paid_amount: number;
    due_amount: number;
  }) => void;
}

interface CartRow {
  product_id: number;
  unit_type: 'single' | 'jora';
  quantity: number;
  unit_price: number;
}

import { useLanguage } from '@/context/language-context';

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  initialCustomerId,
  onSubmitSale,
}) => {
  const { t, formatCurrency, formatNumber, language } = useLanguage();
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
  const [customerError, setCustomerError] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [cart, setCart] = useState<CartRow[]>([
    {
      product_id: products[0]?.id || 1,
      unit_type: 'single',
      quantity: 1,
      unit_price: products[0]?.selling_price || 0,
    },
  ]);
  const [paidAmount, setPaidAmount] = useState<number | ''>('');

  useEffect(() => {
    if (isOpen) {
      if (initialCustomerId) {
        const found = customers.find((c) => c.id === initialCustomerId);
        if (found) {
          setSelectedCustomerId(found.id);
          setCustomerName(found.name);
          setCustomerPhone(found.phone || '');
        } else {
          setSelectedCustomerId(initialCustomerId);
          setCustomerName('');
          setCustomerPhone('');
        }
      } else {
        setSelectedCustomerId(null);
        setCustomerName('');
        setCustomerPhone('');
      }
      setShowSuggestions(false);
      setHighlightedIndex(-1);
      setCustomerError(null);
    }
  }, [isOpen, initialCustomerId, customers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddCartRow = () => {
    const firstProd = products[0];
    setCart((prev) => [
      ...prev,
      {
        product_id: firstProd?.id || 1,
        unit_type: 'single',
        quantity: 1,
        unit_price: firstProd?.selling_price || 0,
      },
    ]);
  };

  const handleRemoveCartRow = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, productId: number) => {
    const prod = products.find((p) => p.id === productId);
    setCart((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              product_id: productId,
              unit_price: prod
                ? item.unit_type === 'jora'
                  ? prod.selling_price * 2
                  : prod.selling_price
                : 0,
            }
          : item
      )
    );
  };

  const handleUnitTypeChange = (index: number, unitType: 'single' | 'jora') => {
    setCart((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const prod = products.find((p) => p.id === item.product_id);
        const singlePrice = prod ? prod.selling_price : item.unit_price;
        const price = unitType === 'jora' ? singlePrice * 2 : singlePrice;
        return {
          ...item,
          unit_type: unitType,
          unit_price: price,
        };
      })
    );
  };

  const handleQtyChange = (index: number, qty: number) => {
    setCart((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, qty) } : item))
    );
  };

  const handlePriceChange = (index: number, price: number) => {
    setCart((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unit_price: Math.max(0, price) } : item))
    );
  };

  const totalAmount = cart.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
  const actualPaid = paidAmount === '' ? totalAmount : Math.min(totalAmount, Number(paidAmount));
  const dueAmount = Math.max(0, totalAmount - actualPaid);

  const trimmedQuery = customerName.trim().toLowerCase();

  const matchingCustomers = useMemo(() => {
    if (!trimmedQuery) {
      return customers.slice(0, 8);
    }
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(trimmedQuery) ||
        (c.phone && c.phone.includes(trimmedQuery))
    );
  }, [customers, trimmedQuery]);

  const selectedCustomer = useMemo(() => {
    if (selectedCustomerId) {
      return customers.find((c) => c.id === selectedCustomerId) || null;
    }
    if (customerName.trim()) {
      return (
        customers.find(
          (c) => c.name.trim().toLowerCase() === customerName.trim().toLowerCase()
        ) || null
      );
    }
    return null;
  }, [selectedCustomerId, customerName, customers]);

  const handleSelectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setCustomerName(c.name);
    setCustomerPhone(c.phone || '');
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setCustomerError(null);
  };

  const handleNameChange = (val: string) => {
    setCustomerName(val);
    setCustomerError(null);
    setShowSuggestions(true);
    setHighlightedIndex(-1);

    if (selectedCustomerId) {
      const current = customers.find((c) => c.id === selectedCustomerId);
      if (!current || current.name.toLowerCase() !== val.trim().toLowerCase()) {
        setSelectedCustomerId(null);
      }
    } else {
      const exact = customers.find(
        (c) => c.name.trim().toLowerCase() === val.trim().toLowerCase()
      );
      if (exact) {
        setSelectedCustomerId(exact.id);
        if (!customerPhone && exact.phone) {
          setCustomerPhone(exact.phone);
        }
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showSuggestions || matchingCustomers.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < matchingCustomers.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : matchingCustomers.length - 1
      );
    } else if (e.key === 'Enter') {
      if (highlightedIndex >= 0 && highlightedIndex < matchingCustomers.length) {
        e.preventDefault();
        handleSelectCustomer(matchingCustomers[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomerError(null);

    if (cart.length === 0) return;

    const trimmedName = customerName.trim();
    if (!trimmedName) {
      setCustomerError('Customer name is required. Please enter a customer name.');
      return;
    }

    let finalCustomerId: number | null = selectedCustomerId;
    let newCustomerData: { name: string; phone?: string } | undefined = undefined;

    if (!finalCustomerId) {
      const existing = customers.find(
        (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase()
      );
      if (existing) {
        finalCustomerId = existing.id;
      } else {
        newCustomerData = {
          name: trimmedName,
          phone: customerPhone.trim(),
        };
      }
    }

    const items = cart.map((c) => {
      const prod = products.find((p) => p.id === c.product_id);
      const multiplier = c.unit_type === 'jora' ? 2 : 1;
      const unitCost = prod ? prod.cost_price : 0;
      return {
        product_id: c.product_id,
        unit_type: c.unit_type === 'jora' ? (language === 'bn' ? 'জোড়া' : 'Pair') : (language === 'bn' ? 'পিস' : 'Single'),
        quantity: c.quantity,
        multiplier,
        unit_price: c.unit_price,
        cost_price_snapshot: unitCost * multiplier,
        subtotal: c.quantity * c.unit_price,
      };
    });

    onSubmitSale({
      customer_id: finalCustomerId,
      new_customer: newCustomerData,
      items,
      total_amount: totalAmount,
      paid_amount: actualPaid,
      due_amount: dueAmount,
    });

    setCustomerName('');
    setCustomerPhone('');
    setSelectedCustomerId(null);
    setShowSuggestions(false);
    setCustomerError(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2.5 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">Create New Sale Invoice</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6 overflow-y-auto flex-1">
          {/* Customer Selection & Auto-Suggest */}
          <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700/70 space-y-3" ref={dropdownRef}>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold uppercase text-slate-400">
                {t('modal.newSale.customerInfo')} <span className="text-rose-400">*</span>
              </label>
              {selectedCustomer ? (
                <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> {t('modal.newSale.existingCustomer')}
                </span>
              ) : customerName.trim() ? (
                <span className="text-[11px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                  <UserPlus className="w-3 h-3" /> {t('modal.newSale.newCustomer')}
                </span>
              ) : (
                <span className="text-[11px] text-slate-400 font-medium">
                  {language === 'bn' ? 'খুঁজতে বা নতুন যোগ করতে নাম লিখুন' : 'Type name to search or auto-add'}
                </span>
              )}
            </div>

            {customerError && (
              <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-2.5 text-rose-400 text-xs flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{customerError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Customer Name Input with Floating Suggestions */}
              <div className="relative">
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  {t('label.customerName')} <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    ref={inputRef}
                    type="text"
                    required
                    placeholder="e.g. Rahim Ahmed"
                    value={customerName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={handleKeyDown}
                    autoComplete="off"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-8 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm font-medium transition-colors"
                  />
                  {customerName && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomerName('');
                        setCustomerPhone('');
                        setSelectedCustomerId(null);
                        setShowSuggestions(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-0.5"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && (
                  <div className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto divide-y divide-slate-800">
                    {matchingCustomers.length > 0 ? (
                      <>
                        <div className="px-3 py-1.5 bg-slate-950/80 text-[10px] font-semibold text-slate-400 uppercase tracking-wider sticky top-0 flex justify-between">
                          <span>{trimmedQuery ? t('modal.newSale.matchingCustomers', { count: formatNumber(matchingCustomers.length) }) : t('modal.newSale.existingCustomersList')}</span>
                          <span>{language === 'bn' ? 'বাছাই করতে ক্লিক করুন' : 'Click to select'}</span>
                        </div>
                        {matchingCustomers.map((c, idx) => (
                          <div
                            key={c.id}
                            onMouseDown={(e) => {
                              e.preventDefault();
                              handleSelectCustomer(c);
                            }}
                            className={`px-3 py-2 text-xs flex items-center justify-between cursor-pointer transition-colors ${
                              highlightedIndex === idx
                                ? 'bg-emerald-500/20 text-white'
                                : 'hover:bg-slate-800/80 text-slate-200'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center text-[10px] font-bold">
                                {c.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="font-semibold text-white">{c.name}</div>
                                {c.phone && <div className="text-[10px] text-slate-400 font-mono">{c.phone}</div>}
                              </div>
                            </div>
                            <div>
                              {c.total_due > 0 ? (
                                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-1.5 py-0.5 rounded">
                                  Due: {formatCurrency(c.total_due)}
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-500">No due</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </>
                    ) : trimmedQuery ? (
                      <div
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setShowSuggestions(false);
                        }}
                        className="p-3 text-xs text-indigo-300 hover:bg-slate-800/60 cursor-pointer flex items-center gap-2"
                      >
                        <UserPlus className="w-4 h-4 text-indigo-400 shrink-0" />
                        <div>
                          <div>Add <span className="font-bold text-white">"{customerName.trim()}"</span> as New Customer</div>
                          <div className="text-[10px] text-slate-400">Will be automatically registered when invoice is confirmed</div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 text-xs text-slate-400 text-center">
                        No previous customers found. Type to add new customer.
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Phone Input */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1 flex items-center justify-between">
                  <span>{t('modal.newSale.mobileOptional')}</span>
                  {selectedCustomer?.phone && (
                    <span className="text-[10px] text-emerald-400">{language === 'bn' ? 'প্রোফাইলের সাথে যুক্ত' : 'Linked to profile'}</span>
                  )}
                </label>
                <div className="relative">
                  <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="tel"
                    placeholder="01711223344"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm font-mono"
                  />
                </div>
              </div>
            </div>

            {/* Selected Existing Customer Active Info Banner */}
            {selectedCustomer && (
              <div className="p-2.5 rounded-xl bg-slate-900/90 border border-emerald-500/30 flex items-center justify-between text-xs animate-in fade-in">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-semibold text-emerald-400">{selectedCustomer.name}</span>
                  {selectedCustomer.phone && (
                    <span className="text-slate-400 font-mono">({selectedCustomer.phone})</span>
                  )}
                  {selectedCustomer.total_due > 0 ? (
                    <span className="text-amber-400 font-bold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded text-[10px]">
                      Previous Due: {formatCurrency(selectedCustomer.total_due)}
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[10px] font-medium">✓ No Prior Due</span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCustomerId(null);
                    setCustomerName('');
                    setCustomerPhone('');
                  }}
                  className="text-slate-400 hover:text-rose-400 text-[11px] underline ml-2 transition-colors"
                >
                  Clear / Change
                </button>
              </div>
            )}
          </div>

          {/* Cart Items */}
          <div>
            <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
              <label className="text-xs font-semibold uppercase text-slate-400 flex items-center">
                Sale Line Items
              </label>
              <button
                type="button"
                onClick={handleAddCartRow}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 active:scale-95 transition-all"
              >
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Item
              </button>
            </div>

            <div className="space-y-2.5 sm:space-y-3">
              {cart.map((item, idx) => {
                return (
                  <div
                    key={idx}
                    className="p-3 bg-slate-800/60 rounded-xl border border-slate-700/60 space-y-2"
                  >
                    {/* Product Selection */}
                    <div className="w-full">
                      <select
                        value={item.product_id}
                        onChange={(e) => handleProductChange(idx, Number(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        {products.map((p) => {
                          const pStockJora = (p.current_stock / 2).toFixed(1).replace(/\.0$/, '');
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} (Stock: {p.current_stock} Pcs / {pStockJora} Jora)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="grid grid-cols-12 gap-2 items-center">
                      {/* Unit Option: Single (1 Pc) vs Jora (2 Pcs) */}
                      <div className="col-span-5 sm:col-span-4">
                        <select
                          value={item.unit_type}
                          onChange={(e) =>
                            handleUnitTypeChange(idx, e.target.value as 'single' | 'jora')
                          }
                          className="w-full bg-slate-900 border border-indigo-500/40 rounded-lg px-2 py-1.5 text-[11px] sm:text-xs text-indigo-300 font-bold"
                        >
                          <option value="single">Single (1 Pc)</option>
                          <option value="jora">1 Jora (2 Pcs)</option>
                        </select>
                      </div>

                      {/* Quantity */}
                      <div className="col-span-3 sm:col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                          placeholder="Qty"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-center font-bold"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="col-span-4 sm:col-span-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.unit_price}
                          onChange={(e) => handlePriceChange(idx, Number(e.target.value))}
                          placeholder="Price"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white text-right font-medium"
                        />
                      </div>

                      {/* Subtotal & Delete (Mobile Row 2) */}
                      <div className="col-span-12 sm:col-span-3 flex items-center justify-between sm:justify-end gap-2 pt-1 sm:pt-0 border-t sm:border-0 border-slate-800">
                        <span className="text-[11px] text-slate-400 sm:hidden">Subtotal:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-emerald-400 text-xs">
                            {formatCurrency(item.quantity * item.unit_price)}
                          </span>
                          {cart.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCartRow(idx)}
                              className="text-slate-400 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Totals & Payments */}
          <div className="bg-slate-800/80 rounded-xl p-3.5 space-y-2 border border-slate-700">
            <div className="flex justify-between text-xs sm:text-sm text-slate-300">
              <span>Total Invoice Amount:</span>
              <span className="font-bold text-white">{formatCurrency(totalAmount)}</span>
            </div>

            <div className="flex items-center justify-between text-xs sm:text-sm">
              <span className="text-slate-300">Amount Paid Now:</span>
              <div className="w-32 sm:w-36">
                <input
                  type="number"
                  min="0"
                  max={totalAmount}
                  step="0.01"
                  placeholder={totalAmount.toString()}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-emerald-400 font-bold text-right focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between text-xs sm:text-sm pt-2 border-t border-slate-700">
              <span className="text-slate-300">Calculated Due:</span>
              <span className={`font-bold ${dueAmount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {formatCurrency(dueAmount)}
              </span>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white flex items-center shadow-lg shadow-emerald-900/40 active:scale-95 transition-all"
            >
              <Check className="w-4 h-4 mr-1.5" /> Confirm & Generate Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
