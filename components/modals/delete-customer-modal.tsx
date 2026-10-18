'use client';

import React, { useState } from 'react';
import { X, Trash2, AlertTriangle, AlertCircle, CheckCircle2, User, Phone, MapPin, Receipt, Loader2 } from 'lucide-react';
import { Customer, Sale, DueCollection } from '@/types/executive';
import { useLanguage } from '@/context/language-context';

interface DeleteCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  sales?: Sale[];
  dueCollections?: DueCollection[];
  onConfirmDelete: (customerId: number) => Promise<void> | void;
}

export const DeleteCustomerModal: React.FC<DeleteCustomerModalProps> = ({
  isOpen,
  onClose,
  customer,
  sales = [],
  dueCollections = [],
  onConfirmDelete,
}) => {
  const { t, language, formatCurrency, formatNumber } = useLanguage();
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !customer) return null;

  const customerSales = sales.filter((s) => s.customer_id === customer.id);
  const customerCollections = dueCollections.filter((c) => c.customer_id === customer.id);
  const hasOutstandingDue = (Number(customer.total_due) || 0) > 0;

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      await onConfirmDelete(customer.id);
      onClose();
    } catch (err: any) {
      setError(err?.message || (language === 'bn' ? 'কাস্টমার ডিলিট করতে ব্যর্থ হয়েছে।' : 'Failed to delete customer.'));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92dvh] sm:max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/60 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {language === 'bn' ? 'কাস্টমার ডিলিট নিশ্চিতকরণ' : 'Delete Customer Account'}
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn' ? 'খাতা লেজার থেকে স্থায়ীভাবে মুছে ফেলা' : 'Permanent removal from customer Khata'}
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

          {/* Customer Summary Card */}
          <div className="bg-slate-800/60 border border-slate-700/70 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center font-bold text-sm shrink-0">
                {customer.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-sm sm:text-base text-white truncate">{customer.name}</div>
                {customer.phone && (
                  <div className="text-xs text-slate-400 font-mono flex items-center mt-0.5">
                    <Phone className="w-3 h-3 mr-1 text-slate-500" />
                    {customer.phone}
                  </div>
                )}
              </div>
            </div>

            {customer.address && (
              <div className="text-xs text-slate-400 flex items-center pt-1 border-t border-slate-700/50">
                <MapPin className="w-3.5 h-3.5 mr-1.5 text-slate-500 shrink-0" />
                <span className="truncate">{customer.address}</span>
              </div>
            )}
          </div>

          {/* Outstanding Due Warning or Clean Status */}
          {hasOutstandingDue ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3.5 space-y-2">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>
                  {language === 'bn' ? 'সতর্কতা: বকেয়া টাকা পাওনা রয়েছে!' : 'Warning: Outstanding Debt Remaining!'}
                </span>
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <span className="text-xs text-slate-300">
                  {language === 'bn' ? 'বর্তমান বকেয়া:' : 'Current Due Balance:'}
                </span>
                <span className="font-mono font-black text-rose-400 text-base">
                  {formatCurrency(customer.total_due)}
                </span>
              </div>
              <p className="text-[11px] text-amber-300/80 leading-relaxed">
                {language === 'bn'
                  ? 'এই কাস্টমারকে ডিলিট করলে খাতা থেকে তার বকেয়া হিসাব মুছে যাবে। আপনি কি নিশ্চিত যে আপনি এটি মুছে ফেলতে চান?'
                  : 'Deleting this customer will permanently wipe their outstanding debt from your active Khata ledger.'}
              </p>
            </div>
          ) : (
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-center space-x-2.5 text-emerald-400 text-xs">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>
                {language === 'bn'
                  ? 'সব বকেয়া পরিশোধিত (৳০.০০)। নিরাপদে ডিলিট করা যাবে।'
                  : 'Zero outstanding due (৳0.00). Account is fully settled and safe to delete.'}
              </span>
            </div>
          )}

          {/* Impact on Invoices & Ledger */}
          <div className="bg-slate-950/50 border border-slate-800 rounded-xl p-3 text-xs text-slate-400 space-y-1.5">
            <div className="font-semibold text-slate-300 flex items-center space-x-1.5">
              <Receipt className="w-3.5 h-3.5 text-purple-400" />
              <span>{language === 'bn' ? 'আগের বিক্রয় রসিদের বিবরণ' : 'Historical Sales Protection'}</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              {language === 'bn'
                ? `এই কাস্টমারের পূর্বের ${formatNumber(customerSales.length)} টি বিক্রয় ইনভয়েস সাধারণ ক্যাশ বিক্রয় হিসেবে অক্ষত থাকবে, যাতে দোকানের মোট হিসাব ও স্টক অপরিবর্তিত থাকে।`
                : `Past ${formatNumber(customerSales.length)} sales invoices will be retained as Walk-in records so total store income and stock records remain accurate.`}
            </p>
          </div>
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
                <span>{language === 'bn' ? 'হ্যাঁ, কাস্টমার ডিলিট করুন' : 'Yes, Delete Customer'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
