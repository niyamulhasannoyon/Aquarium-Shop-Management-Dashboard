'use client';

import React, { useState } from 'react';
import { X, ShoppingBag, Plus, Trash2, Check, Info } from 'lucide-react';
import { Customer, Product } from '@/types/executive';
import { formatCurrency } from '@/lib/calculations';

interface NewSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  products: Product[];
  onSubmitSale: (saleData: {
    customer_id: number | null;
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

export const NewSaleModal: React.FC<NewSaleModalProps> = ({
  isOpen,
  onClose,
  customers,
  products,
  onSubmitSale,
}) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('walk-in');
  const [cart, setCart] = useState<CartRow[]>([
    {
      product_id: products[0]?.id || 1,
      unit_type: 'single',
      quantity: 1,
      unit_price: products[0]?.selling_price || 0,
    },
  ]);
  const [paidAmount, setPaidAmount] = useState<number | ''>('');

  if (!isOpen) return null;

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    const items = cart.map((c) => {
      const prod = products.find((p) => p.id === c.product_id);
      const multiplier = c.unit_type === 'jora' ? 2 : 1;
      const unitCost = prod ? prod.cost_price : 0;
      return {
        product_id: c.product_id,
        unit_type: c.unit_type === 'jora' ? 'Jora (জোড়া)' : 'Single (পিস)',
        quantity: c.quantity,
        multiplier,
        unit_price: c.unit_price,
        cost_price_snapshot: unitCost * multiplier,
        subtotal: c.quantity * c.unit_price,
      };
    });

    onSubmitSale({
      customer_id: selectedCustomerId === 'walk-in' ? null : Number(selectedCustomerId),
      items,
      total_amount: totalAmount,
      paid_amount: actualPaid,
      due_amount: dueAmount,
    });

    onClose();
  };

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
          {/* Customer Selection */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Select Customer
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-emerald-500 text-xs sm:text-sm"
            >
              <option value="walk-in">Walk-in Customer (Cash Sale)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone}) - Current Due: {formatCurrency(c.total_due)}
                </option>
              ))}
            </select>
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
