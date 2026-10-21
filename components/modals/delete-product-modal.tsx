'use client';

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, AlertCircle, CheckCircle2, Package, Tag, ShieldCheck, Loader2 } from 'lucide-react';
import { Product, SaleItem } from '@/types/executive';
import { useLanguage } from '@/context/language-context';

interface DeleteProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  categoryName?: string;
  saleItems?: SaleItem[];
  onConfirmDelete: (productId: number) => Promise<void> | void;
}

export const DeleteProductModal: React.FC<DeleteProductModalProps> = ({
  isOpen,
  onClose,
  product,
  categoryName = 'Uncategorized',
  saleItems = [],
  onConfirmDelete,
}) => {
  const { language, formatCurrency, formatNumber } = useLanguage();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !product) return null;

  const currentStock = Number(product.current_stock) || 0;
  const productSales = saleItems.filter((si) => si.product_id === product.id);
  const hasHistoricalSales = productSales.length > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmDelete(product.id);
      onClose();
    } catch (err: any) {
      console.error('Failed to delete product in modal:', err);
      setError(
        err?.message ||
          (language === 'bn' ? 'পণ্য ডিলিট করতে ব্যর্থ হয়েছে।' : 'Failed to delete product.')
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {language === 'bn' ? 'পণ্য ডিলিট নিশ্চিতকরণ' : 'Delete Product Confirmation'}
              </h3>
              <p className="text-xs text-slate-400">
                #{product.id} • {categoryName}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Product Summary Card */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                <Package className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm sm:text-base text-white truncate">{product.name}</div>
                <div className="text-xs text-slate-400 flex items-center mt-0.5 space-x-2">
                  <span className="flex items-center">
                    <Tag className="w-3 h-3 mr-1 text-slate-500" />
                    {categoryName}
                  </span>
                  <span>•</span>
                  <span>{product.default_unit || 'Piece'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/50 text-xs">
              <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">
                  {language === 'bn' ? 'বিক্রয় মূল্য' : 'Selling Price'}
                </span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  {formatCurrency(product.selling_price)}
                </span>
              </div>
              <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
                <span className="text-slate-400 block text-[10px]">
                  {language === 'bn' ? 'বর্তমান স্টক' : 'Current Stock'}
                </span>
                <span
                  className={`font-mono font-bold text-sm ${
                    currentStock > 0 ? 'text-teal-400' : 'text-slate-400'
                  }`}
                >
                  {formatNumber(currentStock)} {product.default_unit || 'pcs'}
                </span>
              </div>
            </div>
          </div>

          {/* Current Stock Warning */}
          {currentStock > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 space-y-1.5">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'bn'
                    ? `সতর্কতা: স্টকে ${formatNumber(currentStock)} টি পণ্য রয়েছে!`
                    : `Warning: ${formatNumber(currentStock)} items in stock!`}
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                {language === 'bn'
                  ? 'এই পণ্যটি ডিলিট করলে এর বর্তমান স্টক ইনভেন্টরি থেকে অপসারিত হবে এবং মূলধনের হিসাব সমন্বয় হবে।'
                  : 'Deleting this product will remove its remaining inventory stock from active valuation.'}
              </p>
            </div>
          )}

          {/* Historical Sales Protection Notice */}
          {hasHistoricalSales ? (
            <div className="bg-indigo-500/10 border border-indigo-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-2 text-indigo-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'bn'
                    ? `বিক্রয় রসিদ সম্পূর্ণ সুরক্ষিত (${formatNumber(productSales.length)} টি বিক্রয়)`
                    : `Sales History Protected (${formatNumber(productSales.length)} sales)`}
                </span>
              </div>
              <p className="text-[11px] text-slate-300/90 leading-relaxed">
                {language === 'bn'
                  ? 'এই পণ্যটি পূর্বে বিক্রি করা হয়েছিল। নিরাপদ রিটেল স্ট্যান্ডার্ড অনুযায়ী পণ্যটি বিক্রয় কাউন্টার ও স্টক তালিকা থেকে স্থায়ীভাবে মুছে ফেলা হবে, তবে পূর্বের রসিদ ও লাভের হিসাব সম্পূর্ণ নির্ভুল ও অক্ষত থাকবে।'
                  : 'This item has historical sales. It will be permanently removed from your active catalog and sales counter, while previous invoices, customer receipts, and store profits remain 100% accurate.'}
              </p>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center space-x-2.5 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {language === 'bn'
                  ? 'এই পণ্যের কোনো পূর্ব বিক্রয় রেকর্ড নেই। নিরাপদে সম্পূর্ণ মুছে ফেলা যাবে।'
                  : 'Zero previous sales on record. Safe to permanently delete.'}
              </span>
            </div>
          )}
        </div>

        {/* Actions Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-end gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {language === 'bn' ? 'বাতিল করুন' : 'Cancel'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center space-x-2 shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50 min-h-[44px] active:scale-95"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>{language === 'bn' ? 'মুছে ফেলা হচ্ছে...' : 'Deleting...'}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'হ্যাঁ, পণ্য ডিলিট করুন' : 'Yes, Delete Product'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
