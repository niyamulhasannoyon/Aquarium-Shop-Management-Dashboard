'use client';

import React, { useState, useEffect } from 'react';
import { Product, CartItem } from '@/types/pos';
import { X, Plus, Minus, AlertCircle, ShoppingCart } from 'lucide-react';

interface ProductAddModalProps {
  product: Product | null;
  existingCartItem?: CartItem | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (item: Omit<CartItem, 'subtotal'>) => void;
}

export const ProductAddModal: React.FC<ProductAddModalProps> = ({
  product,
  existingCartItem,
  isOpen,
  onClose,
  onAddToCart,
}) => {
  const [unitType, setUnitType] = useState<'Single' | 'Pair'>('Single');
  const [quantity, setQuantity] = useState<number>(1);
  const [price, setPrice] = useState<number>(0);

  useEffect(() => {
    if (product) {
      if (existingCartItem) {
        setUnitType(existingCartItem.unitType);
        setQuantity(existingCartItem.quantity);
        setPrice(existingCartItem.price);
      } else {
        setUnitType(product.default_unit === 'pair' ? 'Pair' : 'Single');
        setQuantity(1);
        setPrice(product.selling_price);
      }
    }
  }, [product, existingCartItem, isOpen]);

  if (!isOpen || !product) return null;

  const multiplier = unitType === 'Pair' ? 2 : 1;
  const totalPiecesNeeded = quantity * multiplier;
  const isStockExceeded = totalPiecesNeeded > product.current_stock;
  const subtotal = Number((quantity * price).toFixed(2));

  const handleQuantityChange = (val: number) => {
    if (isNaN(val) || val < 1) {
      setQuantity(1);
    } else {
      setQuantity(val);
    }
  };

  const handlePriceChange = (val: number) => {
    if (isNaN(val) || val < 0) {
      setPrice(0);
    } else {
      setPrice(val);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isStockExceeded || quantity <= 0) return;

    onAddToCart({
      productId: product.id,
      name: product.name,
      categoryName: product.category_name || 'Uncategorized',
      unitType,
      quantity,
      multiplier,
      price,
      costPrice: product.cost_price,
      currentStock: product.current_stock,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950/60 border-b border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              {product.category_name || 'General'}
            </span>
            <h3 className="text-lg font-bold text-slate-100">{product.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-5">
          {/* Available Stock Indicator */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 text-xs">
            <span className="text-slate-400">Available Stock:</span>
            <span className="font-bold text-slate-200 px-2.5 py-0.5 rounded-full bg-slate-800 border border-slate-700">
              {product.current_stock} pieces
            </span>
          </div>

          {/* Unit Toggle: Single vs Pair */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
              Unit Type
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setUnitType('Single')}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center space-x-2 transition-all ${
                  unitType === 'Single'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>Single</span>
                <span className="text-xs opacity-70 font-mono">(1 pc)</span>
              </button>

              <button
                type="button"
                onClick={() => setUnitType('Pair')}
                className={`py-3 px-4 rounded-xl border text-sm font-semibold flex items-center justify-center space-x-2 transition-all ${
                  unitType === 'Pair'
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                }`}
              >
                <span>Pair</span>
                <span className="text-xs opacity-70 font-mono">(2 pcs)</span>
              </button>
            </div>
          </div>

          {/* Quantity Selector & Price Input Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Quantity ({unitType}s)
              </label>
              <div className="flex items-center rounded-xl bg-slate-950/80 border border-slate-800 p-1">
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity - 1)}
                  className="w-10 h-10 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-center active:scale-95 transition-all"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 0)}
                  className="w-full text-center bg-transparent text-slate-100 font-bold text-base outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  type="button"
                  onClick={() => handleQuantityChange(quantity + 1)}
                  className="w-10 h-10 rounded-lg bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-center active:scale-95 transition-all"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Price input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                Price per {unitType} (৳)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={price}
                  onChange={(e) => handlePriceChange(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2.5 bg-slate-950/80 text-slate-100 font-bold text-base rounded-xl border border-slate-800 focus:border-emerald-500/50 outline-none transition-all"
                />
              </div>
            </div>
          </div>

          {/* Stock Calculation & Validation Warning */}
          <div className="p-3.5 rounded-xl border transition-colors bg-slate-950/90 border-slate-800">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Total Stock Deduction:</span>
              <span className={`font-mono font-bold ${isStockExceeded ? 'text-rose-400' : 'text-slate-200'}`}>
                {quantity} {unitType} × {multiplier} = {totalPiecesNeeded} pcs
              </span>
            </div>

            {isStockExceeded && (
              <div className="mt-2.5 p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Cannot add! Requested {totalPiecesNeeded} pcs exceeds available stock ({product.current_stock} pcs).</span>
              </div>
            )}
          </div>

          {/* Subtotal Preview */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 uppercase font-semibold">Subtotal</span>
            <span className="text-xl font-black text-emerald-400">৳{subtotal.toLocaleString()}</span>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isStockExceeded || quantity <= 0}
              className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold flex items-center justify-center space-x-2 shadow-lg transition-all ${
                isStockExceeded || quantity <= 0
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 active:scale-[0.98]'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>{existingCartItem ? 'Update Cart' : 'Add to Cart'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
