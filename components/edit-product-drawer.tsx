'use client';

import React, { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useInventory } from '@/context/inventory-context';
import { Product, UnitType } from '@/types/inventory';
import { Edit3, DollarSign, Hash } from 'lucide-react';

interface EditProductDrawerProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const EditProductDrawer: React.FC<EditProductDrawerProps> = ({ product, open, onOpenChange }) => {
  const { categories, editProduct } = useInventory();

  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [defaultUnit, setDefaultUnit] = useState<UnitType>('Piece');
  const [costPrice, setCostPrice] = useState<string>('');
  const [sellingPrice, setSellingPrice] = useState<string>('');
  const [currentStock, setCurrentStock] = useState<string>('0');

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (product) {
      setName(product.name);
      setCategoryId(product.category_id.toString());
      setDefaultUnit(product.default_unit);
      setCostPrice(product.cost_price.toString());
      setSellingPrice(product.selling_price.toString());
      setCurrentStock(product.current_stock.toString());
      setErrors({});
    }
  }, [product]);

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (!name.trim()) errs.name = 'Product name is required';
    if (!categoryId) errs.category = 'Category selection is required';

    const costNum = parseFloat(costPrice);
    if (isNaN(costNum) || costNum < 0) {
      errs.costPrice = 'Valid cost price required (≥ 0)';
    }

    const sellingNum = parseFloat(sellingPrice);
    if (isNaN(sellingNum) || sellingNum < 0) {
      errs.sellingPrice = 'Valid selling price required (≥ 0)';
    }

    const stockNum = parseFloat(currentStock);
    if (isNaN(stockNum) || stockNum < 0) {
      errs.currentStock = 'Current stock count must be ≥ 0';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !validate()) return;

    editProduct(product.id, {
      name: name.trim(),
      category_id: parseInt(categoryId, 10),
      default_unit: defaultUnit,
      cost_price: parseFloat(costPrice),
      selling_price: parseFloat(sellingPrice),
      current_stock: parseFloat(currentStock),
    });

    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <div className="flex items-center space-x-2">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle>Edit Product #{product?.id}</SheetTitle>
              <SheetDescription className="mt-1">
                Modify product parameters, category mapping, prices, and manual stock counts.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-6">
          {/* Product Name */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Product Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={errors.name ? 'border-rose-500' : ''}
            />
            {errors.name && <p className="text-xs text-rose-500 font-medium">{errors.name}</p>}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
            <Select value={categoryId} onValueChange={(val) => setCategoryId(val)}>
              <SelectTrigger className={errors.category ? 'border-rose-500' : ''}>
                <SelectValue placeholder="Select Category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-rose-500 font-medium">{errors.category}</p>}
          </div>

          {/* Default Unit */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Default Unit</label>
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

          {/* Buying & Selling Rates */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Buying Cost ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  className={`pl-9 ${errors.costPrice ? 'border-rose-500' : ''}`}
                />
              </div>
              {errors.costPrice && <p className="text-xs text-rose-500 font-medium">{errors.costPrice}</p>}
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Selling Price ($)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={sellingPrice}
                  onChange={(e) => setSellingPrice(e.target.value)}
                  className={`pl-9 ${errors.sellingPrice ? 'border-rose-500' : ''}`}
                />
              </div>
              {errors.sellingPrice && <p className="text-xs text-rose-500 font-medium">{errors.sellingPrice}</p>}
            </div>
          </div>

          {/* Current Stock */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Stock Count</label>
            <div className="relative">
              <Hash className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                step="1"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className={`pl-9 ${errors.currentStock ? 'border-rose-500' : ''}`}
              />
            </div>
            {errors.currentStock && <p className="text-xs text-rose-500 font-medium">{errors.currentStock}</p>}
          </div>

          <SheetFooter className="pt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save Changes</Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
};
