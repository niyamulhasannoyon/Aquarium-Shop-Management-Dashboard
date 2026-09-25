'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Product, Category, Customer, CartItem, SaleReceipt } from '@/types/pos';
import { ProductGrid } from '@/components/pos/ProductGrid';
import { ProductAddModal } from '@/components/pos/ProductAddModal';
import { CartSummary } from '@/components/pos/CartSummary';
import { ReceiptModal } from '@/components/pos/ReceiptModal';
import { Store, RefreshCw, Clock, PlusCircle, CheckCircle2 } from 'lucide-react';

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Selected Product for Quick Add Modal
  const [activeProduct, setActiveProduct] = useState<Product | null>(null);
  const [editingCartItem, setEditingCartItem] = useState<CartItem | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);

  // Checkout & Receipt Modal
  const [isSubmittingSale, setIsSubmittingSale] = useState<boolean>(false);
  const [completedReceipt, setCompletedReceipt] = useState<SaleReceipt | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState<boolean>(false);

  // Toast / Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Live Clock
  const [currentTime, setCurrentTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch initial data
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [prodRes, catRes, custRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/categories'),
        fetch('/api/customers'),
      ]);

      const [prodData, catData, custData] = await Promise.all([
        prodRes.json(),
        catRes.json(),
        custRes.json(),
      ]);

      if (prodData.success) setProducts(prodData.products);
      if (catData.success) setCategories(catData.categories);
      if (custData.success) setCustomers(custData.customers);
    } catch (err) {
      console.error('Failed to load initial data:', err);
      showToast('Error connecting to database');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Open modal to add or edit product in cart
  const handleSelectProduct = (product: Product) => {
    const existingIndex = cart.findIndex((item) => item.productId === product.id);
    if (existingIndex >= 0) {
      setEditingCartItem(cart[existingIndex]);
    } else {
      setEditingCartItem(null);
    }
    setActiveProduct(product);
    setIsProductModalOpen(true);
  };

  const handleEditCartItem = (cartItem: CartItem) => {
    const product = products.find((p) => p.id === cartItem.productId);
    if (product) {
      setActiveProduct(product);
      setEditingCartItem(cartItem);
      setIsProductModalOpen(true);
    }
  };

  // Add / Update item in cart
  const handleAddToCart = (newItem: Omit<CartItem, 'subtotal'>) => {
    const subtotal = Number((newItem.quantity * newItem.price).toFixed(2));
    const fullItem: CartItem = { ...newItem, subtotal };

    setCart((prevCart) => {
      const index = prevCart.findIndex(
        (i) => i.productId === newItem.productId
      );
      if (index >= 0) {
        const updated = [...prevCart];
        updated[index] = fullItem;
        return updated;
      }
      return [...prevCart, fullItem];
    });

    showToast(`Added "${newItem.name}" (${newItem.unitType}) to cart`);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const handleClearCart = () => {
    setCart([]);
    showToast('Cart cleared');
  };

  // Submit sale transaction
  const handleCompleteSale = async (saleParams: {
    isWalkIn: boolean;
    customerId: number | null;
    walkInName: string;
    walkInPhone: string;
    paidAmount: number;
  }) => {
    setIsSubmittingSale(true);
    try {
      const grandTotal = cart.reduce((sum, i) => sum + i.subtotal, 0);
      const payload = {
        isWalkIn: saleParams.isWalkIn,
        customerId: saleParams.customerId,
        walkInName: saleParams.walkInName,
        walkInPhone: saleParams.walkInPhone,
        items: cart,
        totalAmount: grandTotal,
        paidAmount: saleParams.paidAmount,
      };

      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!data.success) {
        alert(data.error || 'Failed to process sale.');
        return;
      }

      // Success
      setCompletedReceipt(data.sale);
      setIsReceiptModalOpen(true);
      setCart([]);
      
      // Refresh products & customers so stock updates immediately
      fetchData();
    } catch (err: any) {
      console.error('Error completing sale:', err);
      alert('Network error while completing sale.');
    } finally {
      setIsSubmittingSale(false);
    }
  };

  const handleStartNewSale = () => {
    setIsReceiptModalOpen(false);
    setCompletedReceipt(null);
    setCart([]);
    setSearchQuery('');
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 overflow-hidden font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-500 text-slate-950 px-4 py-2.5 rounded-xl shadow-2xl text-xs font-extrabold flex items-center space-x-2 animate-in slide-in-from-top duration-200 border border-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Navigation Header */}
      <header className="h-16 bg-slate-900 border-b border-slate-800 px-6 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Store className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-100 tracking-tight leading-none">
              NILOY FRIEND SHOP
            </h1>
            <p className="text-[11px] text-slate-400 font-medium">Smart Retail POS System</p>
          </div>
        </div>

        {/* Center Live Clock & Quick Status */}
        <div className="hidden md:flex items-center space-x-6 text-xs text-slate-400">
          <div className="flex items-center space-x-2 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span className="font-mono font-bold text-slate-200">{currentTime || '00:00:00'}</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-3">
          <button
            onClick={fetchData}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5 text-xs font-semibold"
            title="Refresh Catalog Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          
          <button
            onClick={handleStartNewSale}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-extrabold flex items-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>New Sale</span>
          </button>
        </div>
      </header>

      {/* Main 2-Column POS Workspace */}
      <main className="flex-1 p-4 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-full">
          {/* Left Column (7 cols on lg, 8 cols on xl): Product Search & Grid */}
          <div className="lg:col-span-7 xl:col-span-8 h-full overflow-hidden">
            <ProductGrid
              products={products}
              categories={categories}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              onSelectProduct={handleSelectProduct}
              isLoading={isLoading}
            />
          </div>

          {/* Right Column (5 cols on lg, 4 cols on xl): Cart Summary & Checkout */}
          <div className="lg:col-span-5 xl:col-span-4 h-full overflow-hidden">
            <CartSummary
              cart={cart}
              customers={customers}
              onRemoveItem={handleRemoveFromCart}
              onEditItem={handleEditCartItem}
              onClearCart={handleClearCart}
              onCompleteSale={handleCompleteSale}
              isSubmitting={isSubmittingSale}
            />
          </div>
        </div>
      </main>

      {/* Quick Product Quantity & Price Modal */}
      <ProductAddModal
        product={activeProduct}
        existingCartItem={editingCartItem}
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onAddToCart={handleAddToCart}
      />

      {/* Printable Receipt Modal */}
      <ReceiptModal
        receipt={completedReceipt}
        isOpen={isReceiptModalOpen}
        onClose={() => setIsReceiptModalOpen(false)}
        onNewSale={handleStartNewSale}
      />
    </div>
  );
}
