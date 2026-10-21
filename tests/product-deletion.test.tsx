import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ExecutiveDashboard } from '@/components/executive-overview-dashboard';
import { DeleteProductModal } from '@/components/modals/delete-product-modal';
import { LanguageProvider } from '@/context/language-context';
import { ThemeProvider } from '@/context/theme-context';
import { Product, SaleItem } from '@/types/executive';

describe('Product Deletion & Anti-Resurrection Tests', () => {
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

  it('renders DeleteProductModal with product details and historical sales warning', () => {
    const mockProduct: Product = {
      id: 99,
      name: 'Super Neon Tetra',
      category_id: 1,
      default_unit: 'Piece',
      cost_price: 25,
      selling_price: 50,
      current_stock: 15,
    };

    const mockSaleItems: SaleItem[] = [
      {
        id: 1,
        sale_id: 1,
        product_id: 99,
        unit_type: 'Piece',
        quantity: 5,
        multiplier: 1,
        stock_deduct_qty: 5,
        unit_price: 50,
        cost_price_snapshot: 25,
        subtotal: 250,
      },
    ];

    const onConfirmDelete = vi.fn();
    const onClose = vi.fn();

    render(
      <LanguageProvider>
        <DeleteProductModal
          isOpen={true}
          onClose={onClose}
          product={mockProduct}
          categoryName="Live Fish"
          saleItems={mockSaleItems}
          onConfirmDelete={onConfirmDelete}
        />
      </LanguageProvider>
    );

    // Verify product name and category are displayed
    expect(screen.getByText('Super Neon Tetra')).toBeInTheDocument();
    expect(screen.getAllByText(/Live Fish/i)[0]).toBeInTheDocument();

    // Verify stock warning is shown because current_stock = 15
    expect(screen.getByText(/Warning: 15 items in stock!/i)).toBeInTheDocument();

    // Verify historical sales protection is shown
    expect(screen.getByText(/Sales History Protected/i)).toBeInTheDocument();

    // Click confirm delete button
    const deleteButton = screen.getByText(/Yes, Delete Product/i);
    fireEvent.click(deleteButton);

    expect(onConfirmDelete).toHaveBeenCalledWith(99);
  });

  it('deletes a product from the dashboard and prevents re-sync resurrection', async () => {
    // Seed initial products in localStorage
    const testProducts: Product[] = [
      {
        id: 101,
        name: 'Guppy Special Edition',
        category_id: null,
        default_unit: 'Piece',
        cost_price: 100,
        selling_price: 150,
        current_stock: 5,
      },
      {
        id: 102,
        name: 'Angel Fish Blue Zebra',
        category_id: null,
        default_unit: 'Piece',
        cost_price: 120,
        selling_price: 200,
        current_stock: 10,
      },
    ];

    localStorage.setItem('aqua_shop_products_v2', JSON.stringify(testProducts));

    // Mock fetch for sync and delete
    global.fetch = vi.fn((url: any, options?: any) => {
      const urlStr = String(url);
      if (urlStr.includes('/api/products') && options?.method === 'DELETE') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ success: true, deletedId: 101 }),
        });
      }
      if (urlStr.includes('/api/sync')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              success: true,
              products: [
                // Simulating server returning items including the deleted one before DB catchup
                testProducts[0],
                testProducts[1],
              ],
              categories: [],
              customers: [],
              sales: [],
              sale_items: [],
              purchases: [],
              due_collections: [],
            }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    }) as any;

    const { unmount } = renderDashboard();

    // Navigate to products tab
    const productsTab = screen.getByRole('button', { name: /Catalog/i });
    fireEvent.click(productsTab);

    // Verify both products are visible
    expect(screen.getAllByText('Guppy Special Edition').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Angel Fish Blue Zebra').length).toBeGreaterThan(0);

    // Find and click delete button for product 101
    const deleteButtons = screen.getAllByTitle('Delete Product');
    expect(deleteButtons.length).toBeGreaterThan(0);
    fireEvent.click(deleteButtons[0]);

    // DeleteProductModal opens with confirmation
    const confirmDeleteBtn = screen.getByText(/Yes, Delete Product/i);
    fireEvent.click(confirmDeleteBtn);

    // Product 101 should disappear immediately
    await waitFor(() => {
      expect(screen.queryByText('Guppy Special Edition')).not.toBeInTheDocument();
    });

    // Product 102 should still exist
    expect(screen.getAllByText('Angel Fish Blue Zebra').length).toBeGreaterThan(0);

    // Verify localStorage has saved deleted ID in DELETED_PRODUCT_IDS
    const deletedIds = localStorage.getItem('aqua_shop_deleted_product_ids_v2');
    expect(deletedIds).toBeTruthy();
    expect(JSON.parse(deletedIds!)).toContain(101);

    // Simulate page reload: unmount and remount
    unmount();
    renderDashboard();

    // Reopen Products tab
    fireEvent.click(screen.getByRole('button', { name: /Catalog/i }));

    // Product 101 must NEVER come back!
    expect(screen.queryByText('Guppy Special Edition')).not.toBeInTheDocument();
    expect(screen.getAllByText('Angel Fish Blue Zebra').length).toBeGreaterThan(0);
  });
});
