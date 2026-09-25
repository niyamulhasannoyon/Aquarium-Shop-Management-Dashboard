'use client';

import React, { useState } from 'react';
import { useInventory } from '@/context/inventory-context';
import { Button } from '@/components/ui/button';
import { AddCategoryModal } from '@/components/add-category-modal';
import { Plus, LayoutGrid, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export const CategoryBar: React.FC = () => {
  const { categories, products, selectedCategoryId, setSelectedCategoryId } = useInventory();
  const [addCategoryOpen, setAddCategoryOpen] = useState(false);

  // Calculate count of products per category
  const getCategoryCount = (catId: number | null) => {
    if (catId === null) return products.length;
    return products.filter((p) => p.category_id === catId).length;
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Filter className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Categories Filter
          </h2>
        </div>

        {/* "+ Add Category" Button */}
        <Button
          onClick={() => setAddCategoryOpen(true)}
          size="sm"
          variant="outline"
          className="self-start sm:self-auto border-indigo-200 bg-indigo-50/50 text-indigo-700 hover:bg-indigo-100 hover:text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60"
        >
          <Plus className="mr-1.5 h-4 w-4" />
          Add Category
        </Button>
      </div>

      {/* Horizontal Pill Bar */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-2 scrollbar-none">
        {/* All Products Pill */}
        <button
          onClick={() => setSelectedCategoryId(null)}
          className={cn(
            'inline-flex items-center space-x-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all shadow-sm',
            selectedCategoryId === null
              ? 'bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
          )}
        >
          <LayoutGrid className="h-3.5 w-3.5" />
          <span>All Categories</span>
          <span
            className={cn(
              'ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
              selectedCategoryId === null
                ? 'bg-indigo-500 text-white'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
            )}
          >
            {getCategoryCount(null)}
          </span>
        </button>

        {/* Category Pills */}
        {categories.map((cat) => {
          const isSelected = selectedCategoryId === cat.id;
          const count = getCategoryCount(cat.id);

          return (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={cn(
                'inline-flex items-center space-x-2 whitespace-nowrap rounded-full px-4 py-2 text-xs font-semibold transition-all shadow-sm',
                isSelected
                  ? 'bg-indigo-600 text-white shadow-indigo-200 dark:shadow-none'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800 dark:hover:bg-slate-800'
              )}
            >
              <span>{cat.name}</span>
              <span
                className={cn(
                  'ml-1 rounded-full px-2 py-0.5 text-[10px] font-bold',
                  isSelected
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <AddCategoryModal open={addCategoryOpen} onOpenChange={setAddCategoryOpen} />
    </div>
  );
};
