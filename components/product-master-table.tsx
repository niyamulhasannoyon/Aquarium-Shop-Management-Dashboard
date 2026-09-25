'use client';

import React, { useState, useMemo } from 'react';
import { useInventory } from '@/context/inventory-context';
import { Product } from '@/types/inventory';
import { formatCurrency, cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditProductDrawer } from '@/components/edit-product-drawer';
import { QuickRestockModal } from '@/components/quick-restock-modal';
import { AddProductModal } from '@/components/add-product-modal';
import {
  Search,
  Plus,
  Edit3,
  RefreshCw,
  AlertTriangle,
  Package,
  X,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

export const ProductMasterTable: React.FC = () => {
  const {
    products,
    categories,
    selectedCategoryId,
    searchQuery,
    setSearchQuery,
    deleteProduct,
  } = useInventory();

  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [restockingProduct, setRestockingProduct] = useState<Product | null>(null);

  // Category ID to Name mapping helper
  const categoryMap = useMemo(() => {
    const map = new Map<number, string>();
    categories.forEach((cat) => map.set(cat.id, cat.name));
    return map;
  }, [categories]);

  // Fast client-side filtering by search query and category
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // Category filter
      if (selectedCategoryId !== null && product.category_id !== selectedCategoryId) {
        return false;
      }
      // Search query filter (matches product name or category name)
      if (searchQuery.trim() !== '') {
        const query = searchQuery.toLowerCase();
        const catName = categoryMap.get(product.category_id)?.toLowerCase() || '';
        return (
          product.name.toLowerCase().includes(query) ||
          catName.includes(query) ||
          `#${product.id}`.includes(query)
        );
      }
      return true;
    });
  }, [products, selectedCategoryId, searchQuery, categoryMap]);

  return (
    <div className="space-y-4">
      {/* Search & "+ Add New Product" Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Fast Client-side Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search products by name or #ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-9 shadow-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* "+ Add New Product" Button */}
        <Button
          onClick={() => setAddProductModalOpen(true)}
          className="shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Product
        </Button>
      </div>

      {/* Main Table Container */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden dark:border-slate-800 dark:bg-slate-900">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-slate-50/50">
              <TableHead className="w-[80px]"># ID</TableHead>
              <TableHead>Product Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Buying Rate</TableHead>
              <TableHead className="text-right">Selling Rate</TableHead>
              <TableHead className="text-center">Current Stock</TableHead>
              <TableHead className="text-right pr-6">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="h-48 text-center">
                  <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                    <Package className="h-10 w-10 text-slate-300 dark:text-slate-700" />
                    <p className="text-base font-medium text-slate-600 dark:text-slate-400">
                      No products found
                    </p>
                    <p className="text-xs text-slate-400">
                      {searchQuery
                        ? `No matches for "${searchQuery}"`
                        : 'Try adding a product or changing your category filter.'}
                    </p>
                    {searchQuery && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSearchQuery('')}
                        className="mt-2 text-xs"
                      >
                        Clear Search Filter
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredProducts.map((product) => {
                const categoryName = categoryMap.get(product.category_id) || 'Uncategorized';
                const isLowStock = product.current_stock < 5;

                return (
                  <TableRow key={product.id} className="group transition-colors">
                    {/* Auto ID */}
                    <TableCell className="font-mono text-xs font-bold text-slate-500">
                      #{product.id}
                    </TableCell>

                    {/* Product Name */}
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {product.name}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          Unit: {product.default_unit}
                        </span>
                      </div>
                    </TableCell>

                    {/* Category */}
                    <TableCell>
                      <Badge variant="secondary" className="font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {categoryName}
                      </Badge>
                    </TableCell>

                    {/* Buying Rate */}
                    <TableCell className="text-right font-mono text-sm font-medium text-slate-600 dark:text-slate-400">
                      {formatCurrency(product.cost_price)}
                    </TableCell>

                    {/* Selling Rate */}
                    <TableCell className="text-right font-mono text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {formatCurrency(product.selling_price)}
                    </TableCell>

                    {/* Current Stock & Low Stock Badge */}
                    <TableCell className="text-center">
                      {isLowStock ? (
                        <div className="inline-flex items-center space-x-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 shadow-sm animate-pulse dark:border-rose-900/50 dark:bg-rose-950/60 dark:text-rose-300">
                          <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
                          <span>{product.current_stock} {product.default_unit}(s)</span>
                          <span className="ml-1 text-[10px] uppercase tracking-wider font-extrabold bg-rose-200 text-rose-800 px-1.5 py-0.2 rounded-full dark:bg-rose-900 dark:text-rose-200">
                            Low
                          </span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center space-x-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/60 dark:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{product.current_stock} {product.default_unit}(s)</span>
                        </div>
                      )}
                    </TableCell>

                    {/* Action Buttons */}
                    <TableCell className="text-right pr-6">
                      <div className="flex items-center justify-end space-x-2">
                        {/* Quick Restock Action */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRestockingProduct(product)}
                          className="h-8 border-emerald-300 bg-emerald-50/70 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60"
                          title="Quick Restock product stock"
                        >
                          <RefreshCw className="mr-1 h-3.5 w-3.5" />
                          Quick Restock
                        </Button>

                        {/* Edit Action Drawer Trigger */}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingProduct(product)}
                          className="h-8 border-slate-300 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                          title="Edit Product"
                        >
                          <Edit3 className="mr-1 h-3.5 w-3.5" />
                          Edit
                        </Button>

                        {/* Delete Action */}
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to delete "${product.name}"?`)) {
                              deleteProduct(product.id);
                            }
                          }}
                          className="p-1.5 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors dark:hover:bg-rose-950/50"
                          title="Delete Product"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Table Footer Stats Summary */}
        <div className="border-t border-slate-200 bg-slate-50/60 px-6 py-3 flex flex-wrap items-center justify-between text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
          <span>
            Showing <strong className="text-slate-800 dark:text-slate-200">{filteredProducts.length}</strong> of{' '}
            <strong className="text-slate-800 dark:text-slate-200">{products.length}</strong> products
          </span>
          {filteredProducts.some((p) => p.current_stock < 5) && (
            <span className="flex items-center text-rose-600 dark:text-rose-400 font-semibold">
              <AlertTriangle className="mr-1 h-3.5 w-3.5" />
              {filteredProducts.filter((p) => p.current_stock < 5).length} item(s) require low stock restock
            </span>
          )}
        </div>
      </div>

      {/* Modals & Drawers */}
      <AddProductModal open={addProductModalOpen} onOpenChange={setAddProductModalOpen} />
      <EditProductDrawer
        product={editingProduct}
        open={!!editingProduct}
        onOpenChange={(open) => !open && setEditingProduct(null)}
      />
      <QuickRestockModal
        product={restockingProduct}
        open={!!restockingProduct}
        onOpenChange={(open) => !open && setRestockingProduct(null)}
      />
    </div>
  );
};
