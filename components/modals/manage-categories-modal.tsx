'use client';

import React, { useState } from 'react';
import {
  X,
  FolderPlus,
  Edit2,
  Trash2,
  Check,
  Layers,
  Tag,
  Plus,
} from 'lucide-react';
import { Category, Product } from '@/types/executive';
import { useLanguage } from '@/context/language-context';

interface ManageCategoriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  products: Product[];
  onAddCategory: (name: string) => Promise<void>;
  onEditCategory: (id: number, newName: string) => Promise<void>;
  onDeleteCategory: (id: number) => Promise<void>;
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({
  isOpen,
  onClose,
  categories,
  products,
  onAddCategory,
  onEditCategory,
  onDeleteCategory,
}) => {
  const { language } = useLanguage();
  const [newCatName, setNewCatName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  if (!isOpen) return null;

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onAddCategory(newCatName.trim());
      setNewCatName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const startEdit = (cat: Category) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setConfirmDeleteId(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
  };

  const saveEdit = async (id: number) => {
    if (!editName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onEditCategory(id, editName.trim());
      setEditingId(null);
      setEditName('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: number) => {
    setIsSubmitting(true);
    try {
      await onDeleteCategory(id);
      setConfirmDeleteId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProductCount = (catId: number) => {
    return products.filter((p) => p.category_id === catId).length;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/50 shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center space-x-2">
                <span>{language === 'bn' ? 'ক্যাটাগরি ম্যানেজমেন্ট' : 'Category Management'}</span>
                <span className="text-xs font-mono font-bold bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                  {categories.length}
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'দোকানের ক্যাটাগরি তৈরি, নাম পরিবর্তন, ডিলিট বা ফ্রেশ করুন'
                  : 'Add, rename, delete, or reset shop categories'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Add Category Input */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-slate-950/40 shrink-0">
          <form onSubmit={handleAddSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Tag className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder={
                  language === 'bn'
                    ? 'নতুন ক্যাটাগরির নাম লিখুন (যেমন: লাইভ প্ল্যান্টস)'
                    : 'Enter new category name (e.g. Live Plants)...'
                }
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors min-h-[42px]"
              />
            </div>
            <button
              type="submit"
              disabled={!newCatName.trim() || isSubmitting}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white rounded-xl text-xs sm:text-sm font-bold flex items-center space-x-1.5 shadow-md shadow-purple-950 transition-all min-h-[42px] shrink-0 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'bn' ? '+ যোগ করুন' : '+ Add'}</span>
            </button>
          </form>
        </div>

        {/* Categories List */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-2.5 flex-1 divide-y divide-slate-800/40">
          {categories.length === 0 ? (
            <div className="text-center py-12 text-slate-500 space-y-2">
              <FolderPlus className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
              <p className="text-sm font-semibold">
                {language === 'bn' ? 'কোনো ক্যাটাগরি নেই' : 'No categories found'}
              </p>
              <p className="text-xs text-slate-400">
                {language === 'bn'
                  ? 'উপরে ক্যাটাগরির নাম লিখে যোগ করুন'
                  : 'Add a new category using the form above'}
              </p>
            </div>
          ) : (
            categories.map((cat, idx) => {
              const count = getProductCount(cat.id);
              const isEditing = editingId === cat.id;
              const isConfirmingDelete = confirmDeleteId === cat.id;

              return (
                <div
                  key={cat.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-2xl transition-all ${
                    isEditing
                      ? 'bg-purple-950/20 border border-purple-500/40'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
                  {isEditing ? (
                    <div className="flex-1 flex items-center gap-2 mb-2 sm:mb-0">
                      <input
                        type="text"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 bg-slate-900 border border-purple-500 rounded-xl px-3 py-1.5 text-xs sm:text-sm text-white focus:outline-none"
                        autoFocus
                      />
                      <button
                        onClick={() => saveEdit(cat.id)}
                        disabled={!editName.trim() || isSubmitting}
                        className="p-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all"
                        title="Save"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs transition-all"
                        title="Cancel"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-3 flex-1 min-w-0 pr-2">
                      <span className="text-[11px] font-mono font-bold text-slate-500 w-6 shrink-0 text-center">
                        #{idx + 1}
                      </span>
                      <span className="text-xs sm:text-sm font-semibold text-slate-200 truncate">
                        {cat.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/80 shrink-0">
                        {count} {language === 'bn' ? 'পণ্য' : 'items'}
                      </span>
                    </div>
                  )}

                  {!isEditing && (
                    <div className="flex items-center space-x-1.5 self-end sm:self-auto shrink-0 mt-2 sm:mt-0">
                      {isConfirmingDelete ? (
                        <div className="flex items-center space-x-1.5 bg-rose-950/40 border border-rose-500/40 p-1 rounded-xl animate-in fade-in">
                          <span className="text-[11px] text-rose-300 font-semibold px-2">
                            {language === 'bn' ? 'ডিলিট করবেন?' : 'Delete?'}
                          </span>
                          <button
                            onClick={() => handleDelete(cat.id)}
                            disabled={isSubmitting}
                            className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-all"
                          >
                            {language === 'bn' ? 'হ্যাঁ' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(null)}
                            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition-all"
                          >
                            {language === 'bn' ? 'না' : 'No'}
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => startEdit(cat)}
                            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                            title={language === 'bn' ? 'নাম পরিবর্তন' : 'Rename'}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDeleteId(cat.id)}
                            className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                            title={language === 'bn' ? 'ডিলিট করুন' : 'Delete'}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-5 border-t border-slate-800 bg-slate-950/60 flex items-center justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-white transition-colors"
          >
            {language === 'bn' ? 'বন্ধ করুন' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};
