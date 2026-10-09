'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Language, translations } from '@/lib/i18n/translations';
import { formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil, formatDate as formatDateUtil } from '@/lib/i18n/formatters';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatCurrency: (amount: number) => string;
  formatNumber: (num: number | string) => string;
  formatDate: (dateString: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'niloy_shop_language';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [mounted, setMounted] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
    try {
      const savedLang = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language;
      if (savedLang === 'en' || savedLang === 'bn') {
        setLanguageState(savedLang);
        document.documentElement.lang = savedLang;
      }
    } catch (err) {
      console.error('Failed to read language from localStorage:', err);
    }
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      document.documentElement.lang = lang;
    } catch (err) {
      console.error('Failed to save language to localStorage:', err);
    }
  }, []);

  const toggleLanguage = useCallback(() => {
    setLanguage(language === 'en' ? 'bn' : 'en');
  }, [language, setLanguage]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const dict = translations[language] || translations.en;
      let text = dict[key] || translations.en[key] || key;

      if (params) {
        Object.entries(params).forEach(([pKey, pVal]) => {
          text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
        });
      }

      return text;
    },
    [language]
  );

  const formatCurrency = useCallback(
    (amount: number): string => {
      return formatCurrencyUtil(amount, language);
    },
    [language]
  );

  const formatNumber = useCallback(
    (num: number | string): string => {
      return formatNumberUtil(num, language);
    },
    [language]
  );

  const formatDate = useCallback(
    (dateString: string): string => {
      return formatDateUtil(dateString, language);
    },
    [language]
  );

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        toggleLanguage,
        t,
        formatCurrency,
        formatNumber,
        formatDate,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    // Provide fallback context if used outside provider during testing or initial renders
    return {
      language: 'en',
      setLanguage: () => {},
      toggleLanguage: () => {},
      t: (key: string, params?: Record<string, string | number>) => {
        let text = translations.en[key] || key;
        if (params) {
          Object.entries(params).forEach(([pKey, pVal]) => {
            text = text.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
          });
        }
        return text;
      },
      formatCurrency: (amount: number) => formatCurrencyUtil(amount, 'en'),
      formatNumber: (num: number | string) => formatNumberUtil(num, 'en'),
      formatDate: (dateString: string) => formatDateUtil(dateString, 'en'),
    };
  }
  return context;
};
