import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { LanguageProvider, useLanguage } from '@/context/language-context';
import { LanguageSwitcher } from '@/components/language-switcher';
import { DailyActivityLedger } from '@/components/daily-activity-ledger';
import { DueManagementLedger } from '@/components/due-management-ledger';
import {
  initialCustomers,
  initialSales,
  initialPurchases,
  initialDueCollections,
  initialProducts,
  initialSaleItems,
} from '@/lib/mock-data';
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

  it('renders DailyActivityLedger and DueManagementLedger in English without hardcoded Bengali', () => {
    // Render DailyActivityLedger in English (default)
    const { unmount: unmountLedger } = render(
      <LanguageProvider>
        <DailyActivityLedger
          sales={initialSales}
          purchases={initialPurchases}
          dueCollections={initialDueCollections}
          customers={initialCustomers}
          products={initialProducts}
          saleItems={initialSaleItems}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Day-by-Day Buy & Sell Log')).toBeInTheDocument();
    expect(screen.getByText('Total Sales')).toBeInTheDocument();
    expect(screen.getByText('Purchases')).toBeInTheDocument();
    expect(screen.getByText('Realized Profit')).toBeInTheDocument();
    unmountLedger();

    // Render DueManagementLedger in English
    const { unmount: unmountKhata } = render(
      <LanguageProvider>
        <DueManagementLedger
          customers={initialCustomers}
          sales={initialSales}
          dueCollections={initialDueCollections}
          saleItems={initialSaleItems}
          onOpenCollectDue={() => {}}
          onOpenCustomerProfile={() => {}}
          onOpenNewSaleForCustomer={() => {}}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Due Khata Ledger & Collection')).toBeInTheDocument();
    expect(screen.getByText('Total Outstanding Due')).toBeInTheDocument();
    expect(screen.getByText('Customers with Due')).toBeInTheDocument();
    expect(screen.getByText('Total Due Collected')).toBeInTheDocument();
    unmountKhata();
  });

  it('renders DailyActivityLedger and DueManagementLedger in Bengali when language is bn', () => {
    const BengaliWrapper = ({ children }: { children: React.ReactNode }) => {
      const { setLanguage } = useLanguage();
      React.useEffect(() => {
        setLanguage('bn');
      }, [setLanguage]);
      return <>{children}</>;
    };

    // Render DailyActivityLedger in Bengali
    const { unmount: unmountLedger } = render(
      <LanguageProvider>
        <BengaliWrapper>
          <DailyActivityLedger
            sales={initialSales}
            purchases={initialPurchases}
            dueCollections={initialDueCollections}
            customers={initialCustomers}
            products={initialProducts}
            saleItems={initialSaleItems}
          />
        </BengaliWrapper>
      </LanguageProvider>
    );

    expect(screen.getByText('দৈনিক ও মাসিক লেনদেন খাতা')).toBeInTheDocument();
    expect(screen.getByText('মোট বিক্রি')).toBeInTheDocument();
    expect(screen.getByText('মাল কেনা (স্টক ক্রয়)')).toBeInTheDocument();
    expect(screen.getByText('নিট অর্জিত লাভ')).toBeInTheDocument();
    unmountLedger();

    // Render DueManagementLedger in Bengali
    const { unmount: unmountKhata } = render(
      <LanguageProvider>
        <BengaliWrapper>
          <DueManagementLedger
            customers={initialCustomers}
            sales={initialSales}
            dueCollections={initialDueCollections}
            saleItems={initialSaleItems}
            onOpenCollectDue={() => {}}
            onOpenCustomerProfile={() => {}}
            onOpenNewSaleForCustomer={() => {}}
          />
        </BengaliWrapper>
      </LanguageProvider>
    );

    expect(screen.getByText('প্রফেশনাল বাকির খাতা ও লেজার ম্যানেজমেন্ট')).toBeInTheDocument();
    expect(screen.getByText('মোট বকেয়া বাকি')).toBeInTheDocument();
    expect(screen.getByText('বাকিদার খদ্দের সংখ্যা')).toBeInTheDocument();
    expect(screen.getByText('মোট আদায়কৃত বাকি')).toBeInTheDocument();
    unmountKhata();
  });
});
