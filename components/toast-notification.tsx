'use client';

import React from 'react';
import { useInventory } from '@/context/inventory-context';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export const ToastNotification: React.FC = () => {
  const { toast, setToast } = useInventory();

  if (!toast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-300">
      <div
        className={cn(
          'flex items-center space-x-3 rounded-xl p-4 shadow-xl border backdrop-blur-md max-w-sm',
          toast.type === 'success' && 'bg-emerald-900/90 border-emerald-700 text-white',
          toast.type === 'error' && 'bg-rose-900/90 border-rose-700 text-white',
          (!toast.type || toast.type === 'info') && 'bg-slate-900/90 border-slate-700 text-white'
        )}
      >
        {toast.type === 'success' && <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />}
        {toast.type === 'error' && <AlertCircle className="h-5 w-5 text-rose-400 shrink-0" />}
        {(!toast.type || toast.type === 'info') && <Info className="h-5 w-5 text-indigo-400 shrink-0" />}
        <span className="text-sm font-medium leading-snug flex-1">{toast.message}</span>
        <button
          onClick={() => setToast(null)}
          className="text-slate-400 hover:text-white p-1 rounded-full transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
