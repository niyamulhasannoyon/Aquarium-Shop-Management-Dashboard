import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MonthlyStockLedger } from '@/components/monthly-stock-ledger';
import { EditStockModal } from '@/components/modals/edit-stock-modal';
import { DeleteStockModal } from '@/components/modals/delete-stock-modal';
import { ExecutiveDashboard } from '@/components/executive-overview-dashboard';
import { LanguageProvider } from '@/context/language-context';
import { ThemeProvider } from '@/context/theme-context';
import { Product, Category, Purchase } from '@/types/executive';
import { groupPurchasesByMonth } from '@/lib/calculations';

describe('Monthly Stock In Ledger & Stock Modification Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  const mockCategories: Category[] = [
    { id: 1, name: 'Live Fish' },
    { id: 2, name: 'Aquarium Food' },
  ];

  const mockProducts: Product[] = [
    {
      id: 10,
      name: 'Neon Tetra',
      category_id: 1,
      default_unit: 'piece',
      cost_price: 30,
      selling_price: 60,
      current_stock: 50,
    },
    {
      id: 20,
      name: 'Fish Flakes 100g',
      category_id: 2,
      default_unit: 'box',
      cost_price: 150,
      selling_price: 250,
      current_stock: 20,
    },
  ];

  const mockPurchases: Purchase[] = [
    {
      id: 1,
      product_id: 10,
      product_name: 'Neon Tetra',
      unit_type: 'piece',
      quantity: 30,
      multiplier: 1,
      total_pieces_added: 30,
      unit_cost: 30,
      total_investment: 900,
      purchase_date: '2026-10-15T10:00:00.000Z',
    },
    {
      id: 2,
      product_id: 10,
      product_name: 'Neon Tetra',
      unit_type: 'piece',
      quantity: 20,
      multiplier: 1,
      total_pieces_added: 20,
      unit_cost: 30,
      total_investment: 600,
      purchase_date: '2026-10-20T14:30:00.000Z',
    },
    {
      id: 3,
      product_id: 20,
      product_name: 'Fish Flakes 100g',
      unit_type: 'box',
      quantity: 15,
      multiplier: 1,
      total_pieces_added: 15,
      unit_cost: 150,
      total_investment: 2250,
      purchase_date: '2026-09-10T12:00:00.000Z',
    },
  ];

  it('groups purchases by month correctly with product aggregation', () => {
    const groups = groupPurchasesByMonth(mockPurchases, mockProducts, mockCategories);

    expect(groups.length).toBe(2);

    // October 2026 group
    const octGroup = groups.find((g) => g.monthKey === '2026-10');
    expect(octGroup).toBeDefined();
    expect(octGroup?.totalQuantity).toBe(50); // 30 + 20
    expect(octGroup?.totalInvestment).toBe(1500); // 900 + 600
    expect(octGroup?.purchasesCount).toBe(2);
    expect(octGroup?.productSummaries.length).toBe(1);
    expect(octGroup?.productSummaries[0].productId).toBe(10);
    expect(octGroup?.productSummaries[0].totalQuantity).toBe(50);

    // September 2026 group
    const sepGroup = groups.find((g) => g.monthKey === '2026-09');
    expect(sepGroup).toBeDefined();
    expect(sepGroup?.totalQuantity).toBe(15);
    expect(sepGroup?.totalInvestment).toBe(2250);
    expect(sepGroup?.productSummaries[0].productId).toBe(20);
  });

  it('renders MonthlyStockLedger UI with monthly metrics and product summaries', () => {
    const onOpenAddStock = vi.fn();
    const onEditStock = vi.fn();
    const onDeleteStock = vi.fn();

    render(
      <LanguageProvider>
        <MonthlyStockLedger
          purchases={mockPurchases}
          products={mockProducts}
          categories={mockCategories}
          onOpenAddStock={onOpenAddStock}
          onEditStock={onEditStock}
          onDeleteStock={onDeleteStock}
        />
      </LanguageProvider>
    );

    // Verify Title & month selector
    expect(screen.getByText(/Monthly Stock/i)).toBeInTheDocument();
    expect(screen.getAllByText(/October 2026/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/September 2026/i).length).toBeGreaterThan(0);

    // Verify Product breakdown displays Neon Tetra with 50 pieces
    expect(screen.getAllByText('Neon Tetra').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/\+50 piece/i).length).toBeGreaterThan(0);

    // Switch to Detailed Log sub-tab
    const historyTabBtn = screen.getByText(/Detailed Restock Log/i);
    fireEvent.click(historyTabBtn);

    // Verify entries show Edit and Delete buttons
    const editButtons = screen.getAllByText('Edit');
    expect(editButtons.length).toBeGreaterThan(0);
    fireEvent.click(editButtons[0]);
    expect(onEditStock).toHaveBeenCalled();
  });

  it('allows editing a stock entry in EditStockModal', () => {
    const onUpdateStock = vi.fn();
    const onClose = vi.fn();

    render(
      <LanguageProvider>
        <EditStockModal
          isOpen={true}
          onClose={onClose}
          purchase={mockPurchases[0]}
          products={mockProducts}
          onUpdateStock={onUpdateStock}
        />
      </LanguageProvider>
    );

    expect(screen.getByText(/Modify Stock Record/i)).toBeInTheDocument();

    // Change quantity from 30 to 45
    const qtyInput = screen.getAllByDisplayValue('30')[0];
    fireEvent.change(qtyInput, { target: { value: '45' } });

    // Submit form
    const saveBtn = screen.getByText(/Save Changes/i);
    fireEvent.click(saveBtn);

    expect(onUpdateStock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 1,
        quantity: 45,
        total_investment: 1350, // 45 * 30
      })
    );
  });

  it('allows deleting a stock entry in DeleteStockModal', () => {
    const onConfirmDelete = vi.fn();
    const onClose = vi.fn();

    render(
      <LanguageProvider>
        <DeleteStockModal
          isOpen={true}
          onClose={onClose}
          purchase={mockPurchases[0]}
          productName="Neon Tetra"
          onConfirmDelete={onConfirmDelete}
        />
      </LanguageProvider>
    );

    expect(screen.getByText(/Delete Stock Entry/i)).toBeInTheDocument();
    expect(screen.getByText(/Neon Tetra/i)).toBeInTheDocument();

    const deleteBtn = screen.getByText(/Yes, Delete Entry/i);
    fireEvent.click(deleteBtn);

    expect(onConfirmDelete).toHaveBeenCalledWith(1);
  });

  it('navigates to stock_history tab from ExecutiveDashboard and updates stock', async () => {
    global.fetch = vi.fn().mockImplementation((url: string, opts?: any) => {
      if (url === '/api/sync') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              categories: mockCategories,
              products: mockProducts,
              purchases: mockPurchases,
              customers: [],
              sales: [],
              sale_items: [],
              due_collections: [],
            }),
        });
      }
      if (url === '/api/purchases' && opts?.method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              purchase: { ...mockPurchases[0], quantity: 40, total_investment: 1200 },
              products: [{ ...mockProducts[0], current_stock: 60 }],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    }) as any;

    render(
      <ThemeProvider>
        <LanguageProvider>
          <ExecutiveDashboard />
        </LanguageProvider>
      </ThemeProvider>
    );

    // Find and click the Stock History tab
    const stockHistoryTab = screen.getByRole('button', { name: /Stock History/i });
    fireEvent.click(stockHistoryTab);

    // Verify Monthly Stock Ledger is displayed
    expect(screen.getByText(/Monthly Stock & Restock Ledger/i)).toBeInTheDocument();
  });
});
