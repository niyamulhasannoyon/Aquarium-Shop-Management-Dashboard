'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit3, Check, Calendar, AlertCircle } from 'lucide-react';
import { Product, Purchase } from '@/types/executive';
import { useLanguage } from '@/context/language-context';

interface EditStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  products: Product[];
  onUpdateStock: (updatedData: {
    id: number;
    product_id: number;
    quantity: number;
    multiplier: number;
    unit_type: string;
    unit_cost: number;
    total_investment: number;
    purchase_date: string;
  }) => void;
}

export const EditStockModal: React.FC<EditStockModalProps> = ({
  isOpen,
  onClose,
  purchase,
  products,
  onUpdateStock,
}) => {
  const { t, formatCurrency, formatNumber, language } = useLanguage();

  const [selectedProductId, setSelectedProductId] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(1);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [unitType, setUnitType] = useState<string>('piece');
  const [purchaseDate, setPurchaseDate] = useState<string>('');

  useEffect(() => {
    if (purchase && isOpen) {
      setSelectedProductId(purchase.product_id);
      setQuantity(Number(purchase.quantity) || 1);
      setUnitCost(Number(purchase.unit_cost) || 0);
      setUnitType(purchase.unit_type || 'piece');

      if (purchase.purchase_date) {
        try {
          const d = new Date(purchase.purchase_date);
          // Format as YYYY-MM-DDTHH:mm for datetime-local input
          const pad = (n: number) => String(n).padStart(2, '0');
          const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          setPurchaseDate(localIso);
        } catch {
          setPurchaseDate('');
        }
      } else {
        setPurchaseDate('');
      }
    }
  }, [purchase, isOpen]);

  if (!isOpen || !purchase) return null;

  const selectedProduct = products.find((p) => p.id === selectedProductId);
  const totalInvestment = Number((quantity * unitCost).toFixed(2));

  const handleProductSelect = (id: number) => {
    setSelectedProductId(id);
    const prod = products.find((p) => p.id === id);
    if (prod && unitCost === 0) {
      setUnitCost(prod.cost_price || 0);
    }
    if (prod?.default_unit) {
      setUnitType(prod.default_unit);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchase || !selectedProductId || quantity <= 0) return;

    let finalDateIso = purchase.purchase_date;
    if (purchaseDate) {
      const parsedDate = new Date(purchaseDate);
      if (!isNaN(parsedDate.getTime())) {
        finalDateIso = parsedDate.toISOString();
      }
    }

    onUpdateStock({
      id: purchase.id,
      product_id: selectedProductId,
      quantity,
      multiplier: Number(purchase.multiplier) || 1,
      unit_type: unitType || selectedProduct?.default_unit || 'piece',
      unit_cost: unitCost,
      total_investment: totalInvestment,
      purchase_date: finalDateIso,
    });

    onClose();
  };

  // Calculate stock diff impact preview
  const originalPieces = (Number(purchase.quantity) || 0) * (Number(purchase.multiplier) || 1);
  const newPieces = quantity * (Number(purchase.multiplier) || 1);
  const diffPieces = newPieces - originalPieces;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2.5 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90dvh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {t('modal.editStock.title')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('modal.editStock.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          
          {/* Target Product */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
              {t('modal.editStock.product')}
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => handleProductSelect(Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 focus:outline-none focus:border-amber-500 text-sm"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({language === 'bn' ? 'বর্তমান স্টক' : 'Stock'}: {formatNumber(Math.max(0, Number(p.current_stock) || 0))} {p.default_unit || 'Pcs'})
                </option>
              ))}
            </select>
          </div>

          {/* Quantity & Unit Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                {t('modal.editStock.qty')}
              </label>
              <input
                type="number"
                min="1"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                {t('modal.editStock.unitType')}
              </label>
              <input
                type="text"
                value={unitType}
                onChange={(e) => setUnitType(e.target.value)}
                placeholder="piece, box, kg..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Unit Cost & Total Investment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                {t('modal.editStock.unitCost')}
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={unitCost}
                onChange={(e) => setUnitCost(Math.max(0, Number(e.target.value)))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-2">
                {t('modal.editStock.totalCost')}
              </label>
              <div className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-2.5 text-amber-400 font-mono font-bold text-sm flex items-center">
                {formatCurrency(totalInvestment)}
              </div>
            </div>
          </div>

          {/* Purchase Date & Time */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-2 flex items-center space-x-1.5">
              <Calendar className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('modal.editStock.purchaseDate')}</span>
            </label>
            <input
              type="datetime-local"
              value={purchaseDate}
              onChange={(e) => setPurchaseDate(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>

          {/* Impact Alert */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/80 text-xs text-slate-300 flex items-start space-x-2.5">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <span>
                {language === 'bn'
                  ? 'এই পরিবর্তনের ফলে পণ্যটির ইনভেন্টরি স্টক স্বয়ংক্রিয়ভাবে সমন্বয় করা হবে।'
                  : 'Modifying this record will automatically adjust the product current stock balance.'}
              </span>
              {selectedProductId === purchase.product_id ? (
                <div className="mt-1 font-mono font-semibold text-slate-200">
                  {language === 'bn' ? 'স্টক পরিবর্তন:' : 'Stock change:'}{' '}
                  {diffPieces > 0 ? (
                    <span className="text-emerald-400">+{formatNumber(diffPieces)}</span>
                  ) : diffPieces < 0 ? (
                    <span className="text-rose-400">{formatNumber(diffPieces)}</span>
                  ) : (
                    <span className="text-slate-400">{language === 'bn' ? 'কোনো পরিবর্তন নেই' : 'No change'}</span>
                  )}
                </div>
              ) : (
                <div className="mt-1 text-amber-400 font-medium">
                  {language === 'bn'
                    ? 'পূর্বের পণ্য থেকে বাদ যাবে এবং নতুন পণ্যে যোগ হবে।'
                    : 'Stock will be transferred from previous product to new product.'}
                </div>
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors min-h-[44px] flex items-center justify-center"
            >
              {t('btn.cancel')}
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-amber-600 hover:bg-amber-500 shadow-lg shadow-amber-950/40 active:scale-95 flex items-center justify-center min-h-[44px] transition-all"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {t('modal.editStock.save')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
