'use client';

import React from 'react';
import { Languages, Check } from 'lucide-react';
import { useLanguage } from '@/context/language-context';
import { Language } from '@/lib/i18n/translations';

interface LanguageSwitcherProps {
  variant?: 'pill' | 'dropdown' | 'minimal';
  className?: string;
}

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  variant = 'pill',
  className = '',
}) => {
  const { language, setLanguage, t } = useLanguage();

  if (variant === 'minimal') {
    return (
      <button
        onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 bg-slate-900/90 text-slate-200 text-xs font-semibold hover:border-emerald-500/50 hover:text-white transition-all shadow-sm ${className}`}
        title={t('lang.selectLanguage')}
        aria-label="Toggle Language"
      >
        <Languages className="w-3.5 h-3.5 text-emerald-400" />
        <span>{language === 'en' ? '🇧🇩 বাংলা' : '🇬🇧 English'}</span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center p-1 rounded-xl bg-slate-900/90 border border-slate-800 shadow-inner ${className}`}
      role="region"
      aria-label="Language Selector"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          language === 'en'
            ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <span className="text-sm leading-none">🇬🇧</span>
        <span>English</span>
        {language === 'en' && <Check className="w-3 h-3 ml-0.5 text-emerald-100" />}
      </button>

      <button
        type="button"
        onClick={() => setLanguage('bn')}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
          language === 'bn'
            ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-950/40 ring-1 ring-emerald-400/30'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
        }`}
      >
        <span className="text-sm leading-none">🇧🇩</span>
        <span>বাংলা</span>
        {language === 'bn' && <Check className="w-3 h-3 ml-0.5 text-emerald-100" />}
      </button>
    </div>
  );
};
