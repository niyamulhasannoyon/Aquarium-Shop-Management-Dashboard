'use client';

import React, { useState, useEffect } from 'react';
import { X, PackagePlus, Check } from 'lucide-react';
import { Product } from '@/types/executive';
import { formatCurrency } from '@/lib/calculations';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProductId?: number | null;
  onSubmitStock: (stockData: {
    product_id: number;
    unit_type: string;
    quantity: number;
    unit_cost: number;
    total_investment: number;
  }) => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  products,
  initialProductId,
  onSubmitStock,
}) => {
  const [selectedProductId, setSelectedProductId] = useState<number>(
    initialProductId || products[0]?.id || 1
  );
  const [quantity, setQuantity] = useState<number>(10);
  const [unitCost, setUnitCost] = useState<number>(products[0]?.cost_price || 0);

  useEffect(() => {
    if (initialProductId) {
      setSelectedProductId(initialProductId);
      const prod = products.find((p) => p.id === initialProductId);
      if (prod) setUnitCost(prod.cost_price);
    }
  }, [initialProductId, products]);

  if (!isOpen) return null;

  const handleProductSelect = (id: number) => {
    setSelectedProductId(id);
    const prod = products.find((p) => p.id === id);
    if (prod) setUnitCost(prod.cost_price);
  };

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const totalInvestment = quantity * unitCost;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;

    onSubmitStock({
      product_id: selectedProductId,
      unit_type: selectedProduct.default_unit || 'piece',
      quantity,
      unit_cost: unitCost,
      total_investment: totalInvestment,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <PackagePlus className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Restock Product Inventory</h3>
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
              Select Product
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductSelect(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-indigo-500 text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (Current Stock: {p.current_stock} {p.default_unit}s)
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Restock Quantity
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                Unit Purchase Cost
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="bg-slate-800/80 rounded-xl p-3 border border-slate-700 flex justify-between items-center text-sm">
            <span className="text-slate-300">Total Purchase Investment:</span>
            <span className="font-bold text-indigo-400">{formatCurrency(totalInvestment)}</span>
          </div>

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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white flex items-center shadow-lg shadow-indigo-900/40"
            >
              <Check className="w-4 h-4 mr-1.5" /> Confirm Stock Addition
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
