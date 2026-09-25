'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory } from '@/context/inventory-context';
import { UnitType } from '@/types/inventory';
import { PackagePlus, DollarSign, Layers, Hash } from 'lucide-react';

interface AddProductModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({ open, onOpenChange }) => {
  const { categories, addProduct } = useInventory();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [defaultUnit, setDefaultUnit] = useState<UnitType>('Piece');
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [initialStock, setInitialStock] = useState<string>('0');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'Product name is required';
    if (!categoryId) errs.category = 'Category selection is required';

    const costNum = parseFloat(costPrice);
    if (isNaN(costNum) || costNum < 0) {
      errs.costPrice = 'Valid buying cost is required (≥ 0)';
    }

    const sellingNum = parseFloat(sellingPrice);
    if (isNaN(sellingNum) || sellingNum < 0) {
      errs.sellingPrice = 'Valid selling price is required (≥ 0)';
    }

    const stockNum = parseInt(initialStock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      errs.initialStock = 'Initial stock must be a non-negative integer';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const resetForm = () => {
    setName('');
    setCategoryId('');
    setDefaultUnit('Piece');
    setCostPrice('');
    setSellingPrice('');
    setInitialStock('0');
    setErrors({});
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    addProduct({
      name: name.trim(),
      category_id: parseInt(categoryId, 10),
      default_unit: defaultUnit,
      cost_price: parseFloat(costPrice),
      selling_price: parseFloat(sellingPrice),
      initial_stock: parseInt(initialStock, 10) || 0,
    });

    resetForm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <PackagePlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Add New Product</DialogTitle>
              <DialogDescription className="mt-1">
                Enter product details to add it to your inventory master catalog.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Product Name <span className="text-rose-500">*</span>
            </label>
            <Input
              placeholder="e.g. Nike Air Jordan 1 High"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'border-rose-500' : ''}
            />
            {errors.name && <p className="text-xs text-rose-500 font-medium">{errors.name}</p>}
          </div>

          {/* Category & Unit Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Category <span className="text-rose-500">*</span>
              </label>
              <Select value={categoryId} onValueChange={(val) => setCategoryId(val)}>
                <SelectTrigger className={errors.category ? 'border-rose-500' : ''}>
                  <SelectValue placeholder="Select Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 ? (
                    <div className="p-2 text-xs text-slate-500 text-center">No categories found. Add one first!</div>
                  ) : (
                    categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-rose-500 font-medium">{errors.category}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Default Unit <span className="text-rose-500">*</span>
              </label>
              <Select value={defaultUnit} onValueChange={(val: UnitType) => setDefaultUnit(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Piece">Piece</SelectItem>
                  <SelectItem value="Pair">Pair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Buying Cost Price ($) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className={`pl-9 ${errors.costPrice ? 'border-rose-500' : ''}`}
                />
              </div>
              {errors.costPrice && <p className="text-xs text-rose-500 font-medium">{errors.costPrice}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Selling Price ($) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className={`pl-9 ${errors.sellingPrice ? 'border-rose-500' : ''}`}
                />
              </div>
              {errors.sellingPrice && <p className="text-xs text-rose-500 font-medium">{errors.sellingPrice}</p>}
            </div>
          </div>

          {/* Initial Stock */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Initial Stock Count <span className="text-slate-400 text-xs">(Optional, default 0)</span>
            </label>
            <div className="relative">
              <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                min="0"
                placeholder="0"
                value={initialStock}
                onChange={(e) => setInitialStock(e.target.value)}
                className={`pl-9 ${errors.initialStock ? 'border-rose-500' : ''}`}
              />
            </div>
            {errors.initialStock && <p className="text-xs text-rose-500 font-medium">{errors.initialStock}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Save Product</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
