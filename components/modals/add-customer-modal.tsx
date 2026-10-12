'use client';

import React, { useState } from 'react';
import { X, UserPlus, Phone, MapPin, DollarSign, Check, Tag } from 'lucide-react';
import { Customer } from '@/types/executive';
import { useLanguage } from '@/context/language-context';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddCustomer: (customerData: {
    name: string;
    phone: string;
    address: string;
    initial_due: number;
  }) => Customer | void | Promise<Customer | void>;
}

const POPULAR_LOCATIONS = ['Mirpur-10, Dhaka', 'Dhanmondi, Dhaka', 'Uttara, Dhaka', 'Gulshan-2, Dhaka', 'Banani, Dhaka', 'Old Dhaka'];

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({
  isOpen,
  onClose,
  onAddCustomer,
}) => {
  const { t, language } = useLanguage();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [initialDue, setInitialDue] = useState<number | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError(language === 'bn' ? 'কাস্টমারের নাম প্রদান করুন।' : 'Customer name is required.');
      return;
    }

    if (!phone.trim()) {
      setError(language === 'bn' ? 'কাস্টমারের মোবাইল নম্বর প্রদান করুন।' : 'Customer phone number is required.');
      return;
    }

    // Basic BD Phone Format check (e.g. 017xxxxxxxx or +88017xxxxxxxx)
    const cleanPhone = phone.trim();
    if (!/^(?:\+88)?01[3-9]\d{8}$/.test(cleanPhone) && cleanPhone.length < 11) {
      setError(language === 'bn' ? 'সঠিক ১১-সংখ্যার মোবাইল নম্বর দিন (যেমন: 01711223344)।' : 'Please enter a valid 11-digit mobile number (e.g. 01711223344).');
      return;
    }

    setIsSubmitting(true);
    try {
      await onAddCustomer({
        name: name.trim(),
        phone: cleanPhone,
        address: address.trim(),
        initial_due: Number(initialDue) || 0,
      });

      // Reset form
      setName('');
      setPhone('');
      setAddress('');
      setInitialDue('');
      onClose();
    } catch (err: any) {
      setError(err.message || (language === 'bn' ? 'কাস্টমার যুক্ত করতে ব্যর্থ হয়েছে।' : 'Failed to add customer. Please try again.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200 my-auto">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                {t('modal.addCustomer.title')}
              </h3>
              <p className="text-xs text-slate-400">
                {t('modal.addCustomer.subtitle')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors min-h-[36px] min-w-[36px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-rose-400 text-xs flex items-center">
              <span>{error}</span>
            </div>
          )}

          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
              {t('label.customerName')} <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder={language === 'bn' ? 'যেমন: রহিম অ্যাকুয়ারিয়াম ওয়ার্ল্ড / তানভীর আহমেদ' : 'e.g. Rahim Aquarium World / Tanvir Ahmed'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-base sm:text-sm focus:outline-none focus:border-blue-500 min-h-[44px]"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span>{t('label.mobileNumber')} <span className="text-rose-400">*</span></span>
              <span className="text-[10px] text-slate-500 font-normal">
                {language === 'bn' ? '১১ ডিজিটের মোবাইল নম্বর' : 'Bangladeshi 11-digit format'}
              </span>
            </label>
            <div className="relative">
              <Phone className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="tel"
                required
                placeholder="01711223344"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-slate-100 font-mono text-base sm:text-sm focus:outline-none focus:border-blue-500 min-h-[44px]"
              />
            </div>
          </div>

          {/* Address */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center">
              <MapPin className="w-3.5 h-3.5 mr-1 text-slate-500" />
              {t('label.address')}
            </label>
            <input
              type="text"
              placeholder={language === 'bn' ? 'যেমন: দোকান ১২, ধানমন্ডি প্লাজা, ঢাকা' : 'e.g. Shop 12, Level 2, Dhanmondi Plaza, Dhaka'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-slate-100 text-base sm:text-sm focus:outline-none focus:border-blue-500 min-h-[44px]"
            />
            {/* Quick Location Chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {POPULAR_LOCATIONS.map((loc) => (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setAddress(loc)}
                  className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 border border-slate-700/60 rounded-md px-2 py-1 transition-colors min-h-[28px] touch-manipulation"
                >
                  + {loc}
                </button>
              ))}
            </div>
          </div>

          {/* Initial Opening Due */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
              <span className="flex items-center">
                <DollarSign className="w-3.5 h-3.5 mr-1 text-slate-500" />
                {language === 'bn' ? 'পূর্বের বকেয়া (ঐচ্ছিক)' : 'Opening Outstanding Due (Optional)'}
              </span>
              <span className="text-[10px] text-slate-500">BDT (৳)</span>
            </label>
            <input
              type="number"
              min="0"
              step="10"
              placeholder="0.00"
              value={initialDue}
              onChange={(e) => setInitialDue(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-amber-400 font-bold font-mono text-base sm:text-sm focus:outline-none focus:border-blue-500 min-h-[44px]"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              {language === 'bn'
                ? 'আগের হিসাবের বকেয়া ব্যালেন্স থাকলে এখানে দিন।'
                : 'Enter any existing ledger due balance brought forward from previous records.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:bg-slate-800 transition-colors min-h-[44px]"
            >
              {t('btn.cancel')}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white flex items-center shadow-lg shadow-blue-900/40 transition-all disabled:opacity-50 min-h-[44px] active:scale-95"
            >
              <Check className="w-4 h-4 mr-1.5" />
              {isSubmitting
                ? (language === 'bn' ? 'সংরক্ষণ করা হচ্ছে...' : 'Saving Customer...')
                : (language === 'bn' ? 'কাস্টমার প্রোফাইল তৈরি করুন' : 'Save & Create Profile')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
