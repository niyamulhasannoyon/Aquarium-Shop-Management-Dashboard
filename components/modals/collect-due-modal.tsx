'use client';

import React, { useState } from 'react';
import { X, CreditCard, Check } from 'lucide-react';
import { Customer } from '@/types/executive';
import { formatCurrency } from '@/lib/calculations';

interface CollectDueModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onSubmitCollection: (collectionData: {
    customer_id: number;
    amount_paid: number;
    note: string;
  }) => void;
}

export const CollectDueModal: React.FC<CollectDueModalProps> = ({
  isOpen,
  onClose,
  customers,
  onSubmitCollection,
}) => {
  const dueCustomers = customers.filter((c) => c.total_due > 0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number>(
    dueCustomers[0]?.id || customers[0]?.id || 1
  );
  const [amount, setAmount] = useState<number>(dueCustomers[0]?.total_due || 500);
  const [note, setNote] = useState<string>('Cash Payment Collection');

  if (!isOpen) return null;

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  const handleCustomerChange = (id: number) => {
    setSelectedCustomerId(id);
    const c = customers.find((cust) => cust.id === id);
    if (c) setAmount(c.total_due);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || amount <= 0) return;

    onSubmitCollection({
      customer_id: selectedCustomerId,
      amount_paid: amount,
      note,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <CreditCard className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Collect Customer Outstanding Due</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Select Customer
            </label>
            <select
              value={selectedCustomerId}
              onChange={(e) => handleCustomerChange(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
            >
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} - Outstanding Due: {formatCurrency(c.total_due)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Collection Amount (BDT)
            </label>
            <input
              type="number"
              min="0.01"
              max={selectedCustomer?.total_due || 999999}
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-amber-400 font-bold text-lg focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              Payment Note / Reference
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Received via bKash / Cash / Bank"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
            />
          </div>

          {selectedCustomer && (
            <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 flex justify-between items-center text-xs">
              <span className="text-slate-300">Remaining Customer Due:</span>
              <span className="font-bold text-emerald-400">
                {formatCurrency(Math.max(0, selectedCustomer.total_due - amount))}
              </span>
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white flex items-center shadow-lg shadow-amber-900/40"
            >
              <Check className="w-4 h-4 mr-1.5" /> Record Collection Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
