'use client';

import React, { useState } from 'react';
import { X, PlusCircle, Check, FolderPlus, Info } from 'lucide-react';
import { Category } from '@/types/executive';

interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  onSubmitProduct: (productData: {
    name: string;
    category_id: number;
    default_unit: string;
    cost_price: number;
    selling_price: number;
    initial_stock: number;
  }) => void;
  onAddCategory?: (categoryName: string) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  categories,
  onSubmitProduct,
  onAddCategory,
}) => {
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<number>(categories[0]?.id || 1);
  const [unit, setUnit] = useState('piece');
  const [costPrice, setCostPrice] = useState<number>(100);
  const [sellingPrice, setSellingPrice] = useState<number>(120);
  const [initialStock, setInitialStock] = useState<number>(20);

  // Inline Add Category state
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Jora (Pair = 2 pcs) pricing toggle
  const [priceMode, setPriceMode] = useState<'single' | 'jora'>('single');

  if (!isOpen) return null;

  const handleCreateInlineCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    if (onAddCategory) {
      onAddCategory(newCategoryName.trim());
    }
    setNewCategoryName('');
    setIsAddingCategory(false);
  };

  const handleSinglePriceChange = (val: number) => {
    setSellingPrice(val);
  };

  const handleJoraPriceChange = (joraPrice: number) => {
    setSellingPrice(joraPrice / 2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmitProduct({
      name: name.trim(),
      category_id: categoryId,
      default_unit: unit,
      cost_price: costPrice,
      selling_price: sellingPrice,
      initial_stock: initialStock,
    });

    onClose();
  };

  const joraPrice = sellingPrice * 2;
  const joraStock = (initialStock / 2).toFixed(1).replace(/\.0$/, '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <PlusCircle className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-white">Add New Product</h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              Product Title / Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Mens Leather Shoes / Fresh Milk"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Category & New Category Inline */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold uppercase text-slate-400">
                Category
              </label>
              <button
                type="button"
                onClick={() => setIsAddingCategory(!isAddingCategory)}
                className="text-[11px] font-semibold text-purple-400 hover:text-purple-300 flex items-center bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20"
              >
                <FolderPlus className="w-3 h-3 mr-1" />
                {isAddingCategory ? 'Cancel' : '+ Add New Category'}
              </button>
            </div>

            {isAddingCategory ? (
              <div className="flex items-center space-x-2 bg-slate-800/80 p-2 rounded-xl border border-purple-500/40">
                <input
                  type="text"
                  placeholder="Enter new category name..."
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="button"
                  onClick={handleCreateInlineCategory}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold"
                >
                  Save
                </button>
              </div>
            ) : (
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Unit & Jora / Pair Pricing Mode */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Default Unit
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              >
                <option value="piece">Piece (পিস / জোড়া option)</option>
                <option value="bag">Bag (বস্তা)</option>
                <option value="bottle">Bottle (বোতল)</option>
                <option value="box">Box (বাক্স)</option>
                <option value="packet">Packet (প্যাকেট)</option>
                <option value="pair">Pair (জোড়া)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Pricing Mode
              </label>
              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setPriceMode('single')}
                  className={`flex-1 py-1 rounded-lg text-xs font-medium transition-colors ${
                    priceMode === 'single'
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Single (1 Pc)
                </button>
                <button
                  type="button"
                  onClick={() => setPriceMode('jora')}
                  className={`flex-1 py-1 rounded-lg text-xs font-medium transition-colors ${
                    priceMode === 'jora'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  1 Jora (2 Pcs)
                </button>
              </div>
            </div>
          </div>

          {/* Prices & Stock */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Cost Price (1 Pc)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={costPrice}
                onChange={(e) => setCostPrice(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                Single Price (1 Pc)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={sellingPrice}
                onChange={(e) => handleSinglePriceChange(Number(e.target.value))}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
                1 Jora Price (2 Pcs)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={joraPrice}
                onChange={(e) => handleJoraPriceChange(Number(e.target.value))}
                className="w-full bg-slate-800 border border-indigo-500/50 rounded-xl px-3 py-2 text-indigo-300 font-bold text-xs focus:outline-none focus:border-indigo-400"
              />
            </div>
          </div>

          {/* Stock Input & Jora calculation preview */}
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase text-slate-400">
                Initial Stock Quantity
              </label>
              <span className="text-xs text-slate-400 flex items-center">
                <Info className="w-3 h-3 mr-1 text-blue-400" />
                1 Jora = 2 Pcs
              </span>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="number"
                min="0"
                value={initialStock}
                onChange={(e) => setInitialStock(Number(e.target.value))}
                placeholder="Total pieces in stock"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:outline-none focus:border-blue-500"
              />
              <div className="whitespace-nowrap px-3 py-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 rounded-xl text-xs font-bold">
                = {joraStock} Jora (জোড়া)
              </div>
            </div>
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
              className="px-5 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center shadow-lg shadow-blue-900/40"
            >
              <Check className="w-4 h-4 mr-1.5" /> Save Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
