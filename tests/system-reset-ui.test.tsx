import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutiveDashboard } from '@/components/executive-overview-dashboard';
import { SystemResetModal } from '@/components/modals/system-reset-modal';
import { LanguageProvider } from '@/context/language-context';
import { ThemeProvider } from '@/context/theme-context';
import * as backupModule from '@/lib/backup';

describe('System Reset UI & Safety Modal', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const renderDashboard = () =>
    render(
      <ThemeProvider>
        <LanguageProvider>
          <ExecutiveDashboard />
        </LanguageProvider>
      </ThemeProvider>
    );

  it('renders the Reset System button in the dashboard top header', () => {
    renderDashboard();
    const resetButtons = screen.getAllByTitle(/Safely Reset System|নিরাপদ সিস্টেম/i);
    expect(resetButtons.length).toBeGreaterThan(0);
    expect(resetButtons[0]).toBeInTheDocument();
  });

  it('opens the SystemResetModal when Reset System header button is clicked', () => {
    renderDashboard();
    const resetBtn = screen.getAllByTitle(/Safely Reset System|নিরাপদ সিস্টেম/i)[0];
    fireEvent.click(resetBtn);

    // Modal should be visible
    expect(screen.getByText(/Safely Reset System|সিস্টেম নিরাপদ রিসেট/i)).toBeInTheDocument();
    expect(screen.getByText(/Dangerous Operation|সতর্কতামূলক ব্যবস্থা/i)).toBeInTheDocument();
  });

  it('displays accurate system counts and handles backup download in SystemResetModal', () => {
    const downloadSpy = vi.spyOn(backupModule, 'downloadSystemBackup').mockReturnValue(true);

    const mockProducts: any[] = [
      { id: 1, name: 'Guppy', category_id: 1, default_unit: 'Pair', cost_price: 10, selling_price: 20, current_stock: 5 },
    ];
    const mockCustomers: any[] = [
      { id: 1, name: 'Karim', phone: '01800000000', total_due: 0 },
    ];
    const mockSales: any[] = [
      { id: 1, invoice_no: 'INV-1', customer_id: 1, total_amount: 100, paid_amount: 100, due_amount: 0 },
    ];

    render(
      <ThemeProvider>
        <LanguageProvider>
          <SystemResetModal
            isOpen={true}
            onClose={vi.fn()}
            categories={[]}
            products={mockProducts}
            customers={mockCustomers}
            sales={mockSales}
            saleItems={[]}
            purchases={[]}
            dueCollections={[]}
            onExecuteReset={vi.fn()}
          />
        </LanguageProvider>
      </ThemeProvider>
    );

    // Counts should be displayed
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);

    // Click Download Backup button
    const backupBtn = screen.getByText(/Download Full Backup|সম্পূর্ণ ব্যাকআপ ডাউনলোড/i);
    fireEvent.click(backupBtn);

    expect(downloadSpy).toHaveBeenCalled();
    expect(screen.getByText(/Backup Downloaded Successfully|ব্যাকআপ সফলভাবে ডাউনলোড হয়েছে/i)).toBeInTheDocument();
  });

  it('keeps submit button disabled until valid passcode and RESET keyword are typed', () => {
    const mockExecuteReset = vi.fn().mockResolvedValue(undefined);

    render(
      <ThemeProvider>
        <LanguageProvider>
          <SystemResetModal
            isOpen={true}
            onClose={vi.fn()}
            categories={[]}
            products={[]}
            customers={[]}
            sales={[]}
            saleItems={[]}
            purchases={[]}
            dueCollections={[]}
            onExecuteReset={mockExecuteReset}
          />
        </LanguageProvider>
      </ThemeProvider>
    );

    const submitBtn = screen.getByText(/Execute Safe Reset|নিরাপদ রিসেট সম্পন্ন করুন/i);
    expect(submitBtn.closest('button')).toBeDisabled();

    // Fill only passcode
    const passInput = screen.getByPlaceholderText(/Enter Admin Passcode|অ্যাডমিন পাসকোড দিন/i);
    fireEvent.change(passInput, { target: { value: '1234' } });
    expect(submitBtn.closest('button')).toBeDisabled();

    // Type incorrect confirmation keyword
    const confirmInput = screen.getByPlaceholderText(/Type RESET here|এখানে RESET লিখুন/i);
    fireEvent.change(confirmInput, { target: { value: 'NOT_RESET' } });
    expect(submitBtn.closest('button')).toBeDisabled();

    // Type exact RESET keyword
    fireEvent.change(confirmInput, { target: { value: 'RESET' } });
    expect(submitBtn.closest('button')).not.toBeDisabled();
  });

  it('allows toggling between Full Factory Reset and Transactions Only scope', () => {
    render(
      <ThemeProvider>
        <LanguageProvider>
          <SystemResetModal
            isOpen={true}
            onClose={vi.fn()}
            categories={[]}
            products={[]}
            customers={[]}
            sales={[]}
            saleItems={[]}
            purchases={[]}
            dueCollections={[]}
            onExecuteReset={vi.fn()}
          />
        </LanguageProvider>
      </ThemeProvider>
    );

    const transOption = screen.getByText(/Clear Transactions & Ledger Only|শুধুমাত্র লেনদেন ও খাতা রিসেট/i);
    fireEvent.click(transOption);

    // Verify badge is highlighted
    expect(screen.getByText(/Preserve Products|পণ্য সংরক্ষিত/i)).toBeInTheDocument();

    const fullOption = screen.getByText(/Complete Factory Reset|সম্পূর্ণ ফ্যাক্টরি রিসেট/i);
    fireEvent.click(fullOption);
    expect(screen.getByText(/Clean Slate|নতুন শুরু/i)).toBeInTheDocument();
  });

  it('successfully executes reset and closes modal upon valid confirmation', async () => {
    const mockExecute = vi.fn().mockResolvedValue(undefined);
    const mockClose = vi.fn();
    vi.spyOn(backupModule, 'downloadSystemBackup').mockReturnValue(true);

    render(
      <ThemeProvider>
        <LanguageProvider>
          <SystemResetModal
            isOpen={true}
            onClose={mockClose}
            categories={[]}
            products={[]}
            customers={[]}
            sales={[]}
            saleItems={[]}
            purchases={[]}
            dueCollections={[]}
            onExecuteReset={mockExecute}
          />
        </LanguageProvider>
      </ThemeProvider>
    );

    // Click quick PIN
    const quickPinBtn = screen.getByText(/Quick PIN: 1234/i);
    fireEvent.click(quickPinBtn);

    // Type RESET keyword
    const confirmInput = screen.getByPlaceholderText(/Type RESET here|এখানে RESET লিখুন/i);
    fireEvent.change(confirmInput, { target: { value: 'RESET' } });

    // Submit
    const submitBtn = screen.getByText(/Execute Safe Reset|নিরাপদ রিসেট সম্পন্ন করুন/i);
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(mockExecute).toHaveBeenCalledWith({
        mode: 'full',
        passcode: '1234',
        confirmKeyword: 'RESET',
      });
      expect(mockClose).toHaveBeenCalled();
    });
  });

  it('cancels reset without executing when Cancel button is clicked', () => {
    const mockExecute = vi.fn();
    const mockClose = vi.fn();

    render(
      <ThemeProvider>
        <LanguageProvider>
          <SystemResetModal
            isOpen={true}
            onClose={mockClose}
            categories={[]}
            products={[]}
            customers={[]}
            sales={[]}
            saleItems={[]}
            purchases={[]}
            dueCollections={[]}
            onExecuteReset={mockExecute}
          />
        </LanguageProvider>
      </ThemeProvider>
    );

    const cancelBtn = screen.getByText(/Cancel|বাতিল/i);
    fireEvent.click(cancelBtn);

    expect(mockClose).toHaveBeenCalled();
    expect(mockExecute).not.toHaveBeenCalled();
  });
});
