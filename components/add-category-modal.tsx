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
import { useInventory } from '@/context/inventory-context';
import { FolderPlus, Tag } from 'lucide-react';

interface AddCategoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({ open, onOpenChange }) => {
  const { addCategory } = useInventory();
  const [categoryName, setCategoryName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) {
      setError('Category name is required.');
      return;
    }

    addCategory(categoryName.trim());
    setCategoryName('');
    setError('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center space-x-2">
            <div className="rounded-lg bg-indigo-50 p-2 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <FolderPlus className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription className="mt-1">
                Create a category to group your products for easier tracking.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label htmlFor="categoryName" className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Category Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Tag className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                id="categoryName"
                placeholder="e.g. Footwear, Electronics, Winter Wear"
                value={categoryName}
                onChange={(e) => {
                  setCategoryName(e.target.value);
                  if (error) setError('');
                }}
                className="pl-9"
                autoFocus
              />
            </div>
            {error && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCategoryName('');
                setError('');
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Create Category</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
