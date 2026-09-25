'use client';

import React, { useState, useEffect } from 'react';
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
import { Product, UnitType } from '@/types/inventory';
import { formatCurrency } from '@/lib/utils';
import { RefreshCw, DollarSign, Package, TrendingUp } from 'lucide-react';

interface QuickRestockModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const QuickRestockModal: React.FC<QuickRestockModalProps> = ({ product, open, onOpenChange }) => {
  const { quickRestock } = useInventory();

  const [quantity, setQuantity] = useState<string>('10');
  const [unitCost, setUnitCost] = useState<string>('');
  const [unitType, setUnitType] = useState<UnitType>('Piece');
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (product) {
      setQuantity('10');
      setUnitCost(product.cost_price.toString());
      setUnitType(product.default_unit);
      setErrors({});
    }
  }, [product]);

  const qtyNum = parseFloat(quantity) || 0;
  const costNum = parseFloat(unitCost) || 0;
  const totalInvestment = qtyNum * costNum;

  const validate = () => {
    const errs: { [key: string]: string } = {};
    if (isNaN(qtyNum) || qtyNum <= 0) {
      errs.quantity = 'Quantity must be greater than 0';
    }
    if (isNaN(costNum) || costNum < 0) {
      errs.unitCost = 'Unit cost must be ≥ 0';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!product || !validate()) return;

    quickRestock(product.id, qtyNum, costNum, unitType, 1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Quick Restock</DialogTitle>
              <DialogDescription className="mt-1">
                Add stock directly for <span className="font-semibold text-slate-900 dark:text-slate-100">{product?.name}</span>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {product && (
          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            {/* Current Stock Banner */}
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 flex items-center justify-between dark:border-slate-800 dark:bg-slate-900/60">
              <div className="flex items-center space-x-2.5">
                <Package className="h-4 w-4 text-slate-500" />
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Current Stock</span>
              </div>
              <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                {product.current_stock} {product.default_unit}(s)
              </div>
            </div>

            {/* Quantity and Unit Type */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Restock Qty <span className="text-rose-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className={errors.quantity ? 'border-rose-500' : ''}
                  autoFocus
                />
                {errors.quantity && <p className="text-xs text-rose-500 font-medium">{errors.quantity}</p>}
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Unit Type</label>
                <Select value={unitType} onValueChange={(val: UnitType) => setUnitType(val)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Piece">Piece</SelectItem>
                    <SelectItem value="Pair">Pair</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Unit Purchase Cost */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Unit Purchase Cost ($) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                  className={`pl-9 ${errors.unitCost ? 'border-rose-500' : ''}`}
                />
              </div>
              {errors.unitCost && <p className="text-xs text-rose-500 font-medium">{errors.unitCost}</p>}
            </div>

            {/* Total Investment Preview */}
            <div className="rounded-xl bg-emerald-50/70 border border-emerald-200/80 p-3.5 flex items-center justify-between dark:bg-emerald-950/30 dark:border-emerald-800/50">
              <div className="flex items-center space-x-2 text-emerald-800 dark:text-emerald-300">
                <TrendingUp className="h-4 w-4" />
                <span className="text-xs font-semibold">Total Purchase Cost:</span>
              </div>
              <span className="text-base font-extrabold text-emerald-900 dark:text-emerald-200">
                {formatCurrency(totalInvestment)}
              </span>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="success">
                Confirm Restock
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};
