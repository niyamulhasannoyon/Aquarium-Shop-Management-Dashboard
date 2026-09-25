'use client';

import React from 'react';
import { Product, Category } from '@/types/pos';
import { Search, X, Package, Tag, AlertCircle } from 'lucide-react';

interface ProductGridProps {
  products: Product[];
  categories: Category[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  selectedCategory: number | null;
  onSelectCategory: (categoryId: number | null) => void;
  onSelectProduct: (product: Product) => void;
  isLoading: boolean;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  categories,
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  onSelectProduct,
  isLoading,
}) => {
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  // Filter products by search and category
  const filteredProducts = React.useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.category_name &&
          product.category_name.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === null || product.category_id === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [products, searchQuery, selectedCategory]);

  return (
    <div className="flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
      {/* Top Header & Search Bar */}
      <div className="p-4 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Package className="w-5 h-5 text-emerald-400" />
            <h2 className="font-semibold text-slate-100 text-lg">Product Catalog</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-medium border border-slate-700">
              {filteredProducts.length} items
            </span>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline-flex items-center gap-1">
            Press <kbd className="px-1.5 py-0.5 text-[10px] bg-slate-800 text-slate-300 rounded border border-slate-700">/</kbd> to search
          </span>
        </div>

        {/* Search Bar Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search products by name or category..."
            className="w-full pl-10 pr-10 py-3 bg-slate-950/70 text-slate-100 placeholder-slate-500 rounded-xl border border-slate-800 focus:border-emerald-500/50 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Pills (Horizontal Scroll) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-700">
          <button
            onClick={() => onSelectCategory(null)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all flex items-center gap-1.5 ${
              selectedCategory === null
                ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-slate-100 border border-slate-700/50'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            All Products ({products.length})
          </button>

          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-md shadow-emerald-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-slate-100 border border-slate-700/50'
              }`}
            >
              {cat.name} ({cat.product_count})
            </button>
          ))}
        </div>
      </div>

      {/* Product Cards Grid Area */}
      <div className="flex-1 p-4 overflow-y-auto min-h-[350px]">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-slate-400 py-12">
            <div className="flex flex-col items-center space-y-3">
              <div className="w-8 h-8 border-3 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
              <p className="text-sm">Loading product catalog...</p>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 py-12">
            <AlertCircle className="w-12 h-12 mb-3 text-slate-600 stroke-[1.5]" />
            <p className="text-base font-medium text-slate-400">No products found</p>
            <p className="text-xs text-slate-500 mt-1">Try adjusting your search or category filter</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredProducts.map((product) => {
              const isOutOfStock = product.current_stock <= 0;
              const isLowStock = product.current_stock > 0 && product.current_stock <= 5;

              return (
                <button
                  key={product.id}
                  onClick={() => !isOutOfStock && onSelectProduct(product)}
                  disabled={isOutOfStock}
                  className={`group relative text-left p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between h-36 select-none ${
                    isOutOfStock
                      ? 'bg-slate-950/40 border-slate-800/60 opacity-60 cursor-not-allowed'
                      : 'bg-slate-950/80 border-slate-800 hover:border-emerald-500/60 hover:bg-slate-800/60 active:scale-[0.98] cursor-pointer shadow-lg hover:shadow-emerald-500/5'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1 mb-1.5">
                      <span className="text-[11px] font-medium text-slate-400 truncate max-w-[70%]">
                        {product.category_name || 'Uncategorized'}
                      </span>
                      {/* Stock Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          isOutOfStock
                            ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                            : isLowStock
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                        {isOutOfStock ? 'Out of Stock' : `${product.current_stock} pcs`}
                      </span>
                    </div>

                    <h3 className="font-semibold text-slate-100 text-sm group-hover:text-emerald-400 transition-colors line-clamp-2 leading-snug">
                      {product.name}
                    </h3>
                  </div>

                  <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-baseline justify-between">
                    <span className="text-xs text-slate-400 font-normal">Price</span>
                    <span className="text-base font-bold text-slate-100 group-hover:text-emerald-300">
                      ৳{product.selling_price.toLocaleString()}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
