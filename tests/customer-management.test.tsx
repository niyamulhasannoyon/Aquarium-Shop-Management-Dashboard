import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ExecutiveDashboard } from '@/components/executive-overview-dashboard';
import { DeleteCustomerModal } from '@/components/modals/delete-customer-modal';
import { NewSaleModal } from '@/components/modals/new-sale-modal';
import { LanguageProvider } from '@/context/language-context';
import { ThemeProvider } from '@/context/theme-context';
import { Customer, Sale } from '@/types/executive';

describe('Customer Management & Professional Deletion', () => {
  const renderDashboard = () =>
    render(
      <ThemeProvider>
        <LanguageProvider>
          <ExecutiveDashboard />
        </LanguageProvider>
      </ThemeProvider>
    );

  it('renders Walk-in option and allows quick selection in New Sale modal', () => {
    renderDashboard();
    const newSaleBtn = screen.getByText('New Sale');
    fireEvent.click(newSaleBtn);

    const walkInBtn = screen.getByText(/Walk-in \(Cash\)/i);
    expect(walkInBtn).toBeInTheDocument();

    fireEvent.click(walkInBtn);

    const nameInput = screen.getByPlaceholderText('e.g. Rahim Ahmed') as HTMLInputElement;
    expect(nameInput.value).toContain('General Customer');
  });

  it('allows adding customer automatically when typing new name and completing sale', () => {
    renderDashboard();
    const newSaleBtn = screen.getByText('New Sale');
    fireEvent.click(newSaleBtn);

    const nameInput = screen.getByPlaceholderText('e.g. Rahim Ahmed');
    fireEvent.change(nameInput, { target: { value: 'Auto Added VIP Customer' } });

    // Customer notice should appear indicating registration in Khata
    expect(screen.getAllByText(/Auto Added VIP Customer/i).length).toBeGreaterThan(0);

    const submitBtn = screen.getByText(/Confirm & Generate Invoice/i);
    fireEvent.click(submitBtn);

    expect(screen.queryByText('Create New Sale Invoice')).not.toBeInTheDocument();
    expect(screen.getAllByText('Auto Added VIP Customer')[0]).toBeInTheDocument();
  });

  it('opens DeleteCustomerModal when delete action is clicked in Due Khata', () => {
    renderDashboard();

    // Register a customer first via New Sale
    const newSaleBtn = screen.getByText('New Sale');
    fireEvent.click(newSaleBtn);

    const nameInput = screen.getByPlaceholderText('e.g. Rahim Ahmed');
    fireEvent.change(nameInput, { target: { value: 'Customer To Delete' } });
    const submitBtn = screen.getByText(/Confirm & Generate Invoice/i);
    fireEvent.click(submitBtn);

    // Navigate to Due Khata tab
    const khataTab = screen.getByText('Due Management (Khata)');
    fireEvent.click(khataTab);

    // Switch filter to show all customers including zero-due
    const allCustomersFilter = screen.getByRole('button', { name: /All Customers/i });
    fireEvent.click(allCustomersFilter);

    // Look for delete buttons on customers
    const deleteButtons = screen.getAllByTitle(/Delete Customer/i);
    expect(deleteButtons.length).toBeGreaterThan(0);

    // Click first delete button
    fireEvent.click(deleteButtons[0]);

    // Delete modal should open
    expect(screen.getByText('Delete Customer Account')).toBeInTheDocument();
    expect(screen.getByText(/Permanent removal from customer Khata/i)).toBeInTheDocument();
    expect(screen.getByText('Yes, Delete Customer')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders DeleteCustomerModal with due warning for customer with outstanding balance', () => {
    const mockCustomer: Customer = {
      id: 999,
      name: 'Mohammad Due Holder',
      phone: '01700112233',
      address: 'Mirpur, Dhaka',
      total_due: 4500,
      created_at: new Date().toISOString(),
    };

    const mockSales: Sale[] = [
      {
        id: 101,
        invoice_no: 'INV-TEST-001',
        customer_id: 999,
        total_amount: 5000,
        paid_amount: 500,
        due_amount: 4500,
        sale_date: new Date().toISOString(),
      },
    ];

    const onConfirmDelete = vi.fn();
    const onClose = vi.fn();

    render(
      <LanguageProvider>
        <DeleteCustomerModal
          isOpen={true}
          onClose={onClose}
          customer={mockCustomer}
          sales={mockSales}
          dueCollections={[]}
          onConfirmDelete={onConfirmDelete}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Mohammad Due Holder')).toBeInTheDocument();
    expect(screen.getByText('01700112233')).toBeInTheDocument();
    expect(screen.getByText(/Warning: Outstanding Debt Remaining!/i)).toBeInTheDocument();
    expect(screen.getByText(/Historical Sales Protection/i)).toBeInTheDocument();

    const deleteBtn = screen.getByText('Yes, Delete Customer');
    fireEvent.click(deleteBtn);

    expect(onConfirmDelete).toHaveBeenCalledWith(999);
  });

  it('renders DeleteCustomerModal with zero-due clean badge for customer with no debt', () => {
    const mockCustomer: Customer = {
      id: 888,
      name: 'Clean Customer',
      phone: '01800112233',
      address: 'Gulshan, Dhaka',
      total_due: 0,
      created_at: new Date().toISOString(),
    };

    render(
      <LanguageProvider>
        <DeleteCustomerModal
          isOpen={true}
          onClose={vi.fn()}
          customer={mockCustomer}
          sales={[]}
          dueCollections={[]}
          onConfirmDelete={vi.fn()}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Clean Customer')).toBeInTheDocument();
    expect(screen.getByText(/Zero outstanding due/i)).toBeInTheDocument();
  });

  it('does NOT erase customer name or phone while typing when customers prop updates from background sync', () => {
    const mockProducts = [
      {
        id: 1,
        category_id: 1,
        name: 'Guppy Blue',
        default_unit: 'Pair',
        cost_price: 100,
        selling_price: 150,
        current_stock: 10,
        created_at: '2026-01-01T10:00:00Z',
      },
    ];

    const initialCustomers: Customer[] = [
      {
        id: 1,
        name: 'Existing Customer',
        phone: '01711000000',
        address: 'Dhaka',
        total_due: 0,
        created_at: '2026-01-01T10:00:00Z',
      },
    ];

    const { rerender } = render(
      <LanguageProvider>
        <NewSaleModal
          isOpen={true}
          onClose={vi.fn()}
          customers={initialCustomers}
          products={mockProducts}
          onSubmitSale={vi.fn()}
        />
      </LanguageProvider>
    );

    const nameInput = screen.getByPlaceholderText('e.g. Rahim Ahmed') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: 'Typing New Customer Name' } });
    expect(nameInput.value).toBe('Typing New Customer Name');

    // Simulate background sync providing a brand new customers array reference
    const updatedCustomers: Customer[] = [
      ...initialCustomers,
      {
        id: 2,
        name: 'Another Customer from Sync',
        phone: '01811000000',
        address: 'Chittagong',
        total_due: 0,
        created_at: '2026-01-01T11:00:00Z',
      },
    ];

    rerender(
      <LanguageProvider>
        <NewSaleModal
          isOpen={true}
          onClose={vi.fn()}
          customers={updatedCustomers}
          products={mockProducts}
          onSubmitSale={vi.fn()}
        />
      </LanguageProvider>
    );

    // The name input must NOT be erased!
    expect(nameInput.value).toBe('Typing New Customer Name');
  });
});
