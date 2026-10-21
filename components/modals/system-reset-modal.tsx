'use client';

import React, { useState } from 'react';
import {
  X,
  AlertTriangle,
  ShieldAlert,
  Download,
  CheckCircle2,
  Lock,
  Eye,
  EyeOff,
  RotateCcw,
  Loader2,
  ShoppingBag,
  Package,
  Users,
  Truck,
  CreditCard,
  FileCheck2,
} from 'lucide-react';
import {
  Category,
  Product,
  Customer,
  Sale,
  SaleItem,
  Purchase,
  DueCollection,
} from '@/types/executive';
import { useLanguage } from '@/context/language-context';
import { downloadSystemBackup } from '@/lib/backup';

interface SystemResetModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  products: Product[];
  customers: Customer[];
  sales: Sale[];
  saleItems: SaleItem[];
  purchases: Purchase[];
  dueCollections: DueCollection[];
  onExecuteReset: (options: {
    mode: 'full' | 'transactions_only';
    passcode: string;
    confirmKeyword: string;
  }) => Promise<void>;
}

export const SystemResetModal: React.FC<SystemResetModalProps> = ({
  isOpen,
  onClose,
  categories,
  products,
  customers,
  sales,
  saleItems,
  purchases,
  dueCollections,
  onExecuteReset,
}) => {
  const { t, language, formatNumber } = useLanguage();

  const [mode, setMode] = useState<'full' | 'transactions_only'>('full');
  const [passcode, setPasscode] = useState<string>('');
  const [confirmKeyword, setConfirmKeyword] = useState<string>('');
  const [showPasscode, setShowPasscode] = useState<boolean>(false);
  const [autoDownloadBackup, setAutoDownloadBackup] = useState<boolean>(true);
  const [backupDownloaded, setBackupDownloaded] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleManualBackup = () => {
    const success = downloadSystemBackup({
      categories,
      products,
      customers,
      sales,
      saleItems,
      purchases,
      dueCollections,
    });
    if (success) {
      setBackupDownloaded(true);
    }
  };

  const isKeywordValid = confirmKeyword.trim().toUpperCase() === 'RESET';
  const isPasscodeValid = passcode.trim().length > 0;
  const canSubmit = isKeywordValid && isPasscodeValid && !isResetting;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setError(null);
    setIsResetting(true);

    try {
      // Auto-download backup if enabled and not already downloaded
      if (autoDownloadBackup && !backupDownloaded) {
        downloadSystemBackup({
          categories,
          products,
          customers,
          sales,
          saleItems,
          purchases,
          dueCollections,
        });
        setBackupDownloaded(true);
      }

      await onExecuteReset({
        mode,
        passcode: passcode.trim(),
        confirmKeyword: confirmKeyword.trim().toUpperCase(),
      });

      // Reset local state and close modal
      setPasscode('');
      setConfirmKeyword('');
      setBackupDownloaded(false);
      onClose();
    } catch (err: any) {
      setError(
        err?.message ||
          (language === 'bn'
            ? 'সিস্টেম রিসেট ব্যর্থ হয়েছে। পাসকোড পুনরায় যাচাই করুন।'
            : 'System reset failed. Please verify your admin passcode.')
      );
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl shadow-rose-950/20 flex flex-col max-h-[92dvh] sm:max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800/80 bg-slate-900/90 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-tr from-rose-500/20 to-red-500/10 text-rose-400 border border-rose-500/30 shadow-md shadow-rose-950/30 shrink-0">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  {t('systemReset.modalTitle')}
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  {t('systemReset.dangerBadge')}
                </span>
              </div>
              <p className="text-xs text-slate-400 line-clamp-1">
                {t('systemReset.modalSubtitle')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isResetting}
            className="text-slate-400 hover:text-white p-2 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-5 sm:p-6 space-y-5 flex-1 text-sm">
          
          {/* Warning Banner */}
          <div className="bg-rose-950/30 border border-rose-500/30 rounded-2xl p-4 flex items-start space-x-3 text-rose-200">
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="text-xs sm:text-sm leading-relaxed">
              <strong className="block text-rose-300 font-semibold mb-0.5">
                {language === 'bn' ? 'স্থায়ী পরিবর্তনের সতর্কতা:' : 'Irreversible Action Notice:'}
              </strong>
              {t('systemReset.irreversible')}
            </div>
          </div>

          {/* Current System Data Impact Cards */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
              {t('systemReset.currentData')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center">
                <ShoppingBag className="w-4 h-4 mx-auto text-emerald-400 mb-1" />
                <div className="text-base sm:text-lg font-mono font-bold text-white">
                  {formatNumber(sales.length)}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {t('systemReset.salesCount')}
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center">
                <Package className="w-4 h-4 mx-auto text-cyan-400 mb-1" />
                <div className="text-base sm:text-lg font-mono font-bold text-white">
                  {formatNumber(products.length)}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {t('systemReset.productsCount')}
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center">
                <Users className="w-4 h-4 mx-auto text-purple-400 mb-1" />
                <div className="text-base sm:text-lg font-mono font-bold text-white">
                  {formatNumber(customers.length)}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {t('systemReset.customersCount')}
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center">
                <Truck className="w-4 h-4 mx-auto text-indigo-400 mb-1" />
                <div className="text-base sm:text-lg font-mono font-bold text-white">
                  {formatNumber(purchases.length)}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {t('systemReset.purchasesCount')}
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-2.5 text-center col-span-2 sm:col-span-1">
                <CreditCard className="w-4 h-4 mx-auto text-amber-400 mb-1" />
                <div className="text-base sm:text-lg font-mono font-bold text-white">
                  {formatNumber(dueCollections.length)}
                </div>
                <div className="text-[10px] text-slate-400 leading-tight">
                  {t('systemReset.duesCount')}
                </div>
              </div>
            </div>
          </div>

          {/* Step 1: Pre-Reset Backup Download */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-200">
                  {t('systemReset.step1Backup')}
                </h4>
                <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5">
                  {t('systemReset.backupDesc')}
                </p>
              </div>

              <button
                type="button"
                onClick={handleManualBackup}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-500/50 rounded-xl text-xs font-semibold text-slate-200 hover:text-white flex items-center space-x-1.5 transition-all shadow-sm active:scale-95"
              >
                {backupDownloaded ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                ) : (
                  <Download className="w-4 h-4 text-cyan-400" />
                )}
                <span>
                  {backupDownloaded
                    ? t('systemReset.backupDownloaded')
                    : t('systemReset.downloadBackup')}
                </span>
              </button>
            </div>

            <label className="flex items-center space-x-2.5 cursor-pointer pt-1 border-t border-slate-800/60">
              <input
                type="checkbox"
                checked={autoDownloadBackup}
                onChange={(e) => setAutoDownloadBackup(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-500 bg-slate-900 border-slate-700 focus:ring-emerald-500 focus:ring-offset-slate-900 cursor-pointer"
              />
              <span className="text-xs text-slate-300 font-medium select-none">
                {t('systemReset.autoBackup')}
              </span>
            </label>
          </div>

          {/* Step 2: Select Reset Scope Mode */}
          <div className="space-y-2.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
              {t('systemReset.step2Mode')}
            </label>

            {/* Mode 1: Complete Factory Reset */}
            <div
              onClick={() => setMode('full')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                mode === 'full'
                  ? 'bg-rose-950/20 border-rose-500/50 shadow-lg shadow-rose-950/30'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between space-x-3">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      mode === 'full'
                        ? 'border-rose-400 bg-rose-500'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {mode === 'full' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs sm:text-sm">
                      {t('systemReset.modeFullTitle')}
                    </span>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {t('systemReset.modeFullDesc')}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 whitespace-nowrap shrink-0">
                  {t('systemReset.modeFullBadge')}
                </span>
              </div>
            </div>

            {/* Mode 2: Clear Transactions & Ledger Only */}
            <div
              onClick={() => setMode('transactions_only')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                mode === 'transactions_only'
                  ? 'bg-amber-950/20 border-amber-500/50 shadow-lg shadow-amber-950/30'
                  : 'bg-slate-800/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex items-start justify-between space-x-3">
                <div className="flex items-center space-x-3">
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      mode === 'transactions_only'
                        ? 'border-amber-400 bg-amber-500'
                        : 'border-slate-600 bg-transparent'
                    }`}
                  >
                    {mode === 'transactions_only' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                  <div>
                    <span className="font-bold text-white text-xs sm:text-sm">
                      {t('systemReset.modeTransactionsTitle')}
                    </span>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      {t('systemReset.modeTransactionsDesc')}
                    </p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 whitespace-nowrap shrink-0">
                  {t('systemReset.modeTransactionsBadge')}
                </span>
              </div>
            </div>
          </div>

          {/* Step 3: Security Authorization (PIN + "RESET" keyword) */}
          <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-4">
            <h4 className="text-xs sm:text-sm font-bold text-slate-200">
              {t('systemReset.step3Auth')}
            </h4>

            {/* Admin Passcode Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t('systemReset.passcodeLabel')}
                </label>
                <button
                  type="button"
                  onClick={() => setPasscode('1234')}
                  className="text-[11px] font-mono text-slate-400 hover:text-emerald-400"
                >
                  Quick PIN: 1234
                </button>
              </div>

              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPasscode ? 'text' : 'password'}
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  placeholder={t('systemReset.passcodePlaceholder')}
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-700/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30 rounded-xl text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPasscode(!showPasscode)}
                  className="absolute right-3 text-slate-400 hover:text-slate-200 p-1"
                >
                  {showPasscode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Type "RESET" Keyword Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300">
                  {t('systemReset.confirmKeywordLabel')}
                </label>
                {isKeywordValid && (
                  <span className="inline-flex items-center text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                    Verified
                  </span>
                )}
              </div>

              <input
                type="text"
                value={confirmKeyword}
                onChange={(e) => setConfirmKeyword(e.target.value)}
                placeholder={t('systemReset.confirmKeywordPlaceholder')}
                className={`w-full px-3.5 py-2.5 bg-slate-950 border ${
                  isKeywordValid
                    ? 'border-emerald-500/60 focus:border-emerald-500'
                    : 'border-slate-700/80 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30'
                } rounded-xl text-xs sm:text-sm font-mono tracking-wider uppercase text-white placeholder-slate-500 outline-none transition-all`}
              />
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 text-rose-300 text-xs flex items-center space-x-2 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Modal Footer Actions */}
          <div className="pt-2 flex flex-col-reverse sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={isResetting}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl border border-slate-700 text-xs sm:text-sm font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-50 min-h-[42px]"
            >
              {t('systemReset.cancel')}
            </button>

            <button
              type="submit"
              disabled={!canSubmit}
              className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center space-x-2 shadow-lg transition-all min-h-[42px] ${
                canSubmit
                  ? 'bg-gradient-to-r from-rose-600 via-red-600 to-rose-700 hover:from-rose-500 hover:to-red-600 text-white shadow-rose-950/50 active:scale-95 cursor-pointer'
                  : 'bg-slate-800 text-slate-500 border border-slate-700/50 cursor-not-allowed opacity-60'
              }`}
            >
              {isResetting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>{t('systemReset.resetting')}</span>
                </>
              ) : (
                <>
                  <RotateCcw className="w-4 h-4" />
                  <span>{t('systemReset.confirmBtn')}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
