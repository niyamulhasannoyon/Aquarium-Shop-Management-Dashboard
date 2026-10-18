import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ExecutiveDashboard } from '@/components/executive-overview-dashboard';
import { LanguageProvider } from '@/context/language-context';
import { ThemeProvider } from '@/context/theme-context';
import { ManageCategoriesModal } from '@/components/modals/manage-categories-modal';

describe('Categories Management & Multi-Device Sync', () => {
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

  it('renders Cloud Sync status button in the header', () => {
    renderDashboard();
    const syncButton = screen.getByTitle(/Cloud Synced|Syncing/i);
    expect(syncButton).toBeInTheDocument();
  });

  it('displays fresh categories in the category management modal', () => {
    const mockCategories = [
      { id: 1, name: 'Live Fish (একুরিয়াম মাছ)', created_at: '2026-01-01T10:00:00Z' },
      { id: 2, name: 'Fish Food (মাছের খাবার)', created_at: '2026-01-01T10:00:00Z' },
      { id: 3, name: 'Aquarium Plants (জলজ উদ্ভিদ ও গাছ)', created_at: '2026-01-01T10:00:00Z' },
    ];
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

    render(
      <LanguageProvider>
        <ManageCategoriesModal
          isOpen={true}
          onClose={() => {}}
          categories={mockCategories}
          products={mockProducts}
          onAddCategory={vi.fn()}
          onEditCategory={vi.fn()}
          onDeleteCategory={vi.fn()}
        />
      </LanguageProvider>
    );

    expect(screen.getByText('Live Fish (একুরিয়াম মাছ)')).toBeInTheDocument();
    expect(screen.getByText('Fish Food (মাছের খাবার)')).toBeInTheDocument();
    expect(screen.getByText('Aquarium Plants (জলজ উদ্ভিদ ও গাছ)')).toBeInTheDocument();
    expect(screen.getByText('1 items')).toBeInTheDocument();
  });

  it('allows adding a new category from the ManageCategoriesModal', async () => {
    const onAddCategoryMock = vi.fn().mockResolvedValue(undefined);

    render(
      <LanguageProvider>
        <ManageCategoriesModal
          isOpen={true}
          onClose={() => {}}
          categories={[{ id: 1, name: 'Live Fish (একুরিয়াম মাছ)', created_at: '2026-01-01T10:00:00Z' }]}
          products={[]}
          onAddCategory={onAddCategoryMock}
          onEditCategory={vi.fn()}
          onDeleteCategory={vi.fn()}
        />
      </LanguageProvider>
    );

    const input = screen.getByPlaceholderText(/Enter new category name/i);
    fireEvent.change(input, { target: { value: 'Driftwood & Rocks' } });

    const addBtn = screen.getByRole('button', { name: /\+ Add|\+ যোগ করুন/i });
    fireEvent.click(addBtn);

    expect(onAddCategoryMock).toHaveBeenCalledWith('Driftwood & Rocks');
  });

  it('allows renaming a category via inline edit', async () => {
    const onEditCategoryMock = vi.fn().mockResolvedValue(undefined);

    render(
      <LanguageProvider>
        <ManageCategoriesModal
          isOpen={true}
          onClose={() => {}}
          categories={[{ id: 1, name: 'Old Fish Category', created_at: '2026-01-01T10:00:00Z' }]}
          products={[]}
          onAddCategory={vi.fn()}
          onEditCategory={onEditCategoryMock}
          onDeleteCategory={vi.fn()}
        />
      </LanguageProvider>
    );

    // Click edit button
    const editBtn = screen.getByTitle('Rename');
    fireEvent.click(editBtn);

    // Input should appear with existing name
    const editInput = screen.getByDisplayValue('Old Fish Category');
    fireEvent.change(editInput, { target: { value: 'Fresh Fish Category' } });

    // Click save check button
    const saveBtn = screen.getByTitle('Save');
    fireEvent.click(saveBtn);

    expect(onEditCategoryMock).toHaveBeenCalledWith(1, 'Fresh Fish Category');
  });

  it('does not display Reset to Fresh Aquarium Categories option', () => {
    render(
      <LanguageProvider>
        <ManageCategoriesModal
          isOpen={true}
          onClose={() => {}}
          categories={[{ id: 1, name: 'Custom Cat', created_at: '2026-01-01T10:00:00Z' }]}
          products={[]}
          onAddCategory={vi.fn()}
          onEditCategory={vi.fn()}
          onDeleteCategory={vi.fn()}
        />
      </LanguageProvider>
    );

    expect(
      screen.queryByText(/Reset to Fresh Aquarium Categories|ফ্রেশ ক্যাটাগরি সেট রিসেট করুন/i)
    ).not.toBeInTheDocument();
  });
});
