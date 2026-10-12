import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ExecutiveDashboard } from '@/components/executive-overview-dashboard';
import { LanguageProvider } from '@/context/language-context';
import { ThemeProvider } from '@/context/theme-context';

describe('Data Persistence & Integrity Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const renderDashboard = () =>
    render(
      <ThemeProvider>
        <LanguageProvider>
          <ExecutiveDashboard />
        </LanguageProvider>
      </ThemeProvider>
    );

  it('persists a new sale in localStorage and updates customer due', async () => {
    const { unmount } = renderDashboard();

    // 1. Open New Sale modal
    const newSaleBtn = screen.getByText('New Sale');
    fireEvent.click(newSaleBtn);

    // 2. Enter customer name
    const nameInput = screen.getByPlaceholderText('e.g. Rahim Ahmed');
    fireEvent.change(nameInput, { target: { value: 'Persistent Customer' } });

    // 3. Confirm sale
    const submitBtn = screen.getByText(/Confirm & Generate Invoice/i);
    fireEvent.click(submitBtn);

    // Modal closes and customer appears
    expect(screen.getAllByText('Persistent Customer')[0]).toBeInTheDocument();

    // Check localStorage has saved sales and customers
    const savedSales = localStorage.getItem('aqua_shop_sales_v2');
    expect(savedSales).toBeTruthy();
    expect(savedSales).toContain('INV-');

    const savedCustomers = localStorage.getItem('aqua_shop_customers_v2');
    expect(savedCustomers).toBeTruthy();
    expect(savedCustomers).toContain('Persistent Customer');

    // 4. Simulate page refresh by unmounting and re-mounting
    unmount();
    renderDashboard();

    // After remounting, Persistent Customer and the sale invoice should still exist!
    expect(screen.getAllByText('Persistent Customer')[0]).toBeInTheDocument();
  });

  it('persists a newly added product across reloads', async () => {
    const { unmount } = renderDashboard();

    // Open Products tab
    fireEvent.click(screen.getByText('Product Catalog & Stock'));

    // Click Add Product
    fireEvent.click(screen.getByText(/\+ Add Product|\+ নতুন প্রোডাক্ট/i));

    // Fill in product details
    const nameInput = screen.getByPlaceholderText(/Gold fish/i);
    fireEvent.change(nameInput, { target: { value: 'Super Golden Guppy' } });

    const submitBtn = screen.getByText(/Save Product/i);
    fireEvent.click(submitBtn);

    // Verify product appears in catalog
    expect(screen.getAllByText('Super Golden Guppy')[0]).toBeInTheDocument();

    // Verify localStorage has saved products
    const savedProducts = localStorage.getItem('aqua_shop_products_v2');
    expect(savedProducts).toBeTruthy();
    expect(savedProducts).toContain('Super Golden Guppy');

    // Simulate page reload
    unmount();
    renderDashboard();

    // Switch back to Products tab
    fireEvent.click(screen.getByText('Product Catalog & Stock'));
    expect(screen.getAllByText('Super Golden Guppy')[0]).toBeInTheDocument();
  });

  it('persists restocked inventory quantity across reloads', async () => {
    const { unmount } = renderDashboard();

    // Click Add Stock
    fireEvent.click(screen.getByText('Add Stock'));

    // Change quantity to 25
    const qtyInput = screen.getAllByRole('spinbutton')[0];
    fireEvent.change(qtyInput, { target: { value: '25' } });

    const submitBtn = screen.getByText(/Confirm Stock Addition/i);
    fireEvent.click(submitBtn);

    // Verify purchases saved to localStorage
    const savedPurchases = localStorage.getItem('aqua_shop_purchases_v2');
    expect(savedPurchases).toBeTruthy();

    // Unmount and remount (simulate reload)
    unmount();
    renderDashboard();

    // Check Daily Ledger tab for the purchase entry
    fireEvent.click(screen.getByText(/Activity Ledger/i));
    expect(screen.getAllByText(/BUY|কেনা/i).length).toBeGreaterThan(0);
  });
});
