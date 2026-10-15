'use client';

import React, { useState } from 'react';
import { X, FolderPlus, Check } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitCategory: (categoryName: string) => void;
}

export const AddCategoryModal: React.FC<AddCategoryModalProps> = ({
  isOpen,
  onClose,
  onSubmitCategory,
}) => {
  const { t, language } = useLanguage();
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSubmitCategory(name.trim());
    setName('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2.5 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90dvh] sm:max-h-[88vh]">
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FolderPlus className="w-5 h-5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              {t('modal.addCategory.title')}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-400 mb-1.5">
              {t('label.category')}
            </label>
            <input
              type="text"
              required
              placeholder={language === 'bn' ? 'যেমন: মাছ / ফিল্টার / খাবার' : 'e.g. Guppy Fish / Filter / Food'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-sm focus:outline-none focus:border-purple-500 min-h-[44px]"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors min-h-[44px] flex items-center justify-center"
            >
              {t('btn.cancel')}
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white flex items-center justify-center shadow-lg shadow-purple-900/40 active:scale-95 transition-all min-h-[44px]"
            >
              <Check className="w-4 h-4 mr-1.5" /> {language === 'bn' ? 'ক্যাটাগরি সংরক্ষণ করুন' : 'Save Category'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
