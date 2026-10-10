'use client';

import React, { useState, useEffect } from 'react';
import { X, Edit3, Check, FolderPlus, Info, TrendingUp, AlertCircle } from 'lucide-react';
import { Product, Category } from '@/types/executive';
import { useLanguage } from '@/context/language-context';

interface EditProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categories: Category[];
  onUpdateProduct: (product: Product) => void;
  onAddCategory?: (categoryName: string) => void;
}

export const EditProductModal: React.FC<EditProductModalProps> = ({
  isOpen,
  onClose,
  product,
  categories,
  onUpdateProduct,
  onAddCategory,
}) => {
  const { t, formatCurrency, formatNumber } = useLanguage();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(1);
  const [unit, setUnit] = useState('Piece');
  const [costPrice, setCostPrice] = useState<number>(0);
  const [sellingPrice, setSellingPrice] = useState<number>(0);
  const [currentStock, setCurrentStock] = useState<number>(0);

  // Inline Add Category state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name || '');
      setCategoryId(product.category_id || categories[0]?.id || 1);
      setUnit(product.default_unit || 'Piece');
      setCostPrice(Number(product.cost_price) || 0);
      setSellingPrice(Number(product.selling_price) || 0);
      setCurrentStock(Number(product.current_stock) || 0);
      setError(null);
      setIsAddingCategory(false);
    }
  }, [product, categories]);

  if (!isOpen || !product) return null;

  const handleCreateInlineCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    if (onAddCategory) {
      onAddCategory(newCategoryName.trim());
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Product name cannot be empty');
      return;
    }
    if (costPrice < 0 || sellingPrice < 0 || currentStock < 0) {
      setError('Prices and stock must be greater than or equal to 0');
      return;
    }

    onUpdateProduct({
      ...product,
      name: name.trim(),
      category_id: Number(categoryId),
      default_unit: unit,
      cost_price: Number(costPrice),
      selling_price: Number(sellingPrice),
      current_stock: Number(currentStock),
    });

    onClose();
  };

  const marginPerUnit = sellingPrice - costPrice;
  const marginPercent = costPrice > 0 ? ((marginPerUnit / costPrice) * 100).toFixed(1) : '0';
  const totalStockValue = currentStock * costPrice;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {t('modal.editProduct.title')}
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400">
                #{product.id} • {product.name}
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

        {error && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('label.productName')} *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError(null);
              }}
              required
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors shadow-inner"
              placeholder="e.g. Red Tail Dragon Guppy"
            />
          </div>

          {/* Category Selection & Add Category */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                {t('label.category')} *
              </label>
              {onAddCategory && (
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-[11px] text-teal-400 hover:text-teal-300 flex items-center space-x-1"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>{isAddingCategory ? t('btn.cancel') : `+ ${t('quickActions.addCategory')}`}</span>
                </button>
              )}
            </div>

            {isAddingCategory ? (
              <div className="flex items-center space-x-2 mb-2 p-2 bg-slate-950/60 rounded-xl border border-teal-500/30 animate-in fade-in">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="New category name..."
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-teal-500"
                />
                <button
                  type="button"
                  onClick={handleCreateInlineCategory}
                  className="px-3 py-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
                >
                  {t('btn.save')}
                </button>
              </div>
            ) : null}

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Default Unit */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              {t('label.unitType')}
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
              {['Piece', 'Pair', 'Pack', 'Bottle', 'Box'].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className={`py-2 px-3 rounded-xl text-xs font-medium border text-center transition-all ${
                    unit.toLowerCase() === u.toLowerCase()
                      ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          {/* Cost Price & Selling Price */}
          <div className="grid grid-cols-2 gap-3.5 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('label.costPrice')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">৳</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={costPrice || ''}
                  onChange={(e) => setCostPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors shadow-inner"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {t('label.sellingPrice')}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-slate-400 text-sm">৳</span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={sellingPrice || ''}
                  onChange={(e) => setSellingPrice(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-8 pr-3 py-2 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors shadow-inner"
                  placeholder="0"
                />
              </div>
            </div>
          </div>

          {/* Current Stock Field */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                {t('table.currentStock')} ({unit})
              </label>
              <span className="text-[11px] text-slate-400">
                Valuation: <strong className="text-emerald-400">{formatCurrency(totalStockValue)}</strong>
              </span>
            </div>
            <input
              type="number"
              min="0"
              step="1"
              value={currentStock || ''}
              onChange={(e) => setCurrentStock(Math.max(0, parseFloat(e.target.value) || 0))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition-colors shadow-inner font-mono font-bold"
              placeholder="0"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Directly adjusts product in-store available stock.
            </p>
          </div>

          {/* Profit Margin Preview Card */}
          <div className="p-3 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
            <div className="flex items-center justify-between text-slate-400">
              <span className="flex items-center space-x-1">
                <TrendingUp className="w-3.5 h-3.5 text-teal-400" />
                <span>Estimated Margin:</span>
              </span>
              <span className={`font-bold ${marginPerUnit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {marginPerUnit >= 0 ? '+' : ''}{formatCurrency(marginPerUnit)} / {unit} ({marginPercent}%)
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {t('btn.cancel')}
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 transition-all shadow-lg shadow-teal-950 flex items-center space-x-2"
            >
              <Check className="w-4 h-4" />
              <span>{t('btn.save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
