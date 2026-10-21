'use client';

import React from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Purchase } from '@/types/executive';
import { useLanguage } from '@/context/language-context';

interface DeleteStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchase: Purchase | null;
  productName: string;
  onConfirmDelete: (purchaseId: number) => void;
}

export const DeleteStockModal: React.FC<DeleteStockModalProps> = ({
  isOpen,
  onClose,
  purchase,
  productName,
  onConfirmDelete,
}) => {
  const { t, formatCurrency, formatNumber, formatDate, language } = useLanguage();

  if (!isOpen || !purchase) return null;

  const totalPieces = (Number(purchase.quantity) || 0) * (Number(purchase.multiplier) || 1);

  const handleDelete = () => {
    onConfirmDelete(purchase.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-rose-500/5">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {t('modal.deleteStock.title')}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
            {t('modal.deleteStock.desc', { qty: formatNumber(totalPieces) })}
          </p>

          <div className="bg-slate-950/60 rounded-xl p-3.5 border border-slate-800 space-y-2 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{t('stockLedger.productName')}:</span>
              <span className="font-bold text-white">{productName}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{t('stockLedger.monthlyQty')}:</span>
              <span className="font-bold font-mono text-rose-400">
                -{formatNumber(totalPieces)} {purchase.unit_type || 'piece'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">{t('stockLedger.totalCost')}:</span>
              <span className="font-bold font-mono text-slate-200">
                {formatCurrency(purchase.total_investment)}
              </span>
            </div>
            {purchase.purchase_date && (
              <div className="flex justify-between items-center">
                <span className="text-slate-400">{t('modal.editStock.purchaseDate')}:</span>
                <span className="font-mono text-slate-400">
                  {formatDate(purchase.purchase_date)}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors min-h-[44px] flex items-center justify-center"
            >
              {t('btn.cancel')}
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/40 active:scale-95 flex items-center justify-center min-h-[44px] transition-all"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              {t('modal.deleteStock.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
