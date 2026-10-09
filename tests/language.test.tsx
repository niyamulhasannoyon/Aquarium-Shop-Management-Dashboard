import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageProvider, useLanguage } from '@/context/language-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import { toBengaliDigits, formatCurrency, formatNumber } from '@/lib/i18n/formatters';

const TestComponent = () => {
  const { language, setLanguage, t, formatCurrency: fmtCurr, formatNumber: fmtNum } = useLanguage();
  return (
    <div>
      <span data-testid="lang-val">{language}</span>
      <span data-testid="translated-title">{t('app.title')}</span>
      <span data-testid="formatted-num">{fmtNum(12345)}</span>
      <span data-testid="formatted-curr">{fmtCurr(2500)}</span>
      <button onClick={() => setLanguage('bn')} data-testid="switch-to-bn">
        Switch to BN
      </button>
      <button onClick={() => setLanguage('en')} data-testid="switch-to-en">
        Switch to EN
      </button>
    </div>
  );
};

describe('Internationalization & Language Switch System', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('converts Western digits to Bengali digits accurately', () => {
    expect(toBengaliDigits(1234567890)).toBe('১২৩৪৫৬৭৮৯০');
    expect(toBengaliDigits('100.50')).toBe('১০০.৫০');
  });

  it('formats numbers and currency based on selected language', () => {
    expect(formatNumber(123, 'en')).toBe('123');
    expect(formatNumber(123, 'bn')).toBe('১২৩');

    expect(formatCurrency(1500, 'en')).toContain('1,500');
    expect(formatCurrency(1500, 'bn')).toContain('১,৫০০');
  });

  it('renders default English translation', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    expect(screen.getByTestId('lang-val').textContent).toBe('en');
    expect(screen.getByTestId('translated-title').textContent).toBe('Aqua Place BD');
    expect(screen.getByTestId('formatted-num').textContent).toBe('12345');
  });

  it('switches dynamically to Bangla and back to English', () => {
    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    // Switch to Bangla
    fireEvent.click(screen.getByTestId('switch-to-bn'));
    expect(screen.getByTestId('lang-val').textContent).toBe('bn');
    expect(screen.getByTestId('translated-title').textContent).toBe('অ্যাকোয়া প্লেস বিডি');
    expect(screen.getByTestId('formatted-num').textContent).toBe('১২৩৪৫');
    expect(screen.getByTestId('formatted-curr').textContent).toContain('২,৫০০');

    // Switch back to English
    fireEvent.click(screen.getByTestId('switch-to-en'));
    expect(screen.getByTestId('lang-val').textContent).toBe('en');
    expect(screen.getByTestId('translated-title').textContent).toBe('Aqua Place BD');
  });

  it('renders LanguageSwitcher pill component and switches language on button click', () => {
    render(
      <LanguageProvider>
        <LanguageSwitcher variant="pill" />
        <TestComponent />
      </LanguageProvider>
    );

    const banglaBtn = screen.getByRole('button', { name: /বাংলা/i });
    const englishBtn = screen.getByRole('button', { name: /English/i });

    expect(banglaBtn).toBeInTheDocument();
    expect(englishBtn).toBeInTheDocument();

    // Click Bangla
    fireEvent.click(banglaBtn);
    expect(screen.getByTestId('lang-val').textContent).toBe('bn');

    // Click English
    fireEvent.click(englishBtn);
    expect(screen.getByTestId('lang-val').textContent).toBe('en');
  });
});
