import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExecutiveDashboard } from '@/components/executive-overview-dashboard';
import { LanguageProvider } from '@/context/language-context';
import { ThemeProvider } from '@/context/theme-context';

describe('ExecutiveOverviewDashboard Component', () => {
  const renderDashboard = () =>
    render(
      <ThemeProvider>
        <LanguageProvider>
          <ExecutiveDashboard />
        </LanguageProvider>
      </ThemeProvider>
    );

  it('renders the store title and dashboard header', () => {
    renderDashboard();
    expect(screen.getByText('Aqua Place BD')).toBeInTheDocument();
    expect(screen.getByText(/Smart POS & Ledger/i)).toBeInTheDocument();
  });

  it('renders all 5 top KPI summary cards', () => {
    renderDashboard();
    expect(screen.getAllByText('Total Stock Investment')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Total Sales Revenue')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Total Outstanding Due')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Realized Net Profit')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Available Inventory Valuation')[0]).toBeInTheDocument();
  });

  it('renders quick action shortcut buttons', () => {
    renderDashboard();
    expect(screen.getByText('New Sale')).toBeInTheDocument();
    expect(screen.getByText('Add Stock')).toBeInTheDocument();
    expect(screen.getByText('Add Product')).toBeInTheDocument();
    expect(screen.getByText('Collect Due')).toBeInTheDocument();
  });

  it('renders recent sales invoices list section', () => {
    renderDashboard();
    expect(screen.getByText('Recent Sales Invoices')).toBeInTheDocument();
  });

  it('renders low stock warning alert section', () => {
    renderDashboard();
    expect(screen.getByText('Low Stock Warning Alert')).toBeInTheDocument();
  });

  it('opens New Sale modal when New Sale button is clicked', () => {
    renderDashboard();
    const newSaleBtn = screen.getByText('New Sale');
    fireEvent.click(newSaleBtn);
    expect(screen.getByText('Create New Sale Invoice')).toBeInTheDocument();
  });

  it('opens Add Stock modal when Add Stock button is clicked', () => {
    renderDashboard();
    const addStockBtn = screen.getByText('Add Stock');
    fireEvent.click(addStockBtn);
    expect(screen.getAllByText('Restock Product Inventory')[0]).toBeInTheDocument();
  });

  it('automatically adds a new customer when typing customer name in New Sale modal', () => {
    renderDashboard();
    const newSaleBtn = screen.getByText('New Sale');
    fireEvent.click(newSaleBtn);

    const nameInput = screen.getByPlaceholderText('e.g. Rahim Ahmed');
    fireEvent.change(nameInput, { target: { value: 'New Test Customer' } });

    const submitBtn = screen.getByText(/Confirm & Generate Invoice/i);
    fireEvent.click(submitBtn);

    // Modal should close and the new customer should appear in recent sales / ledger
    expect(screen.queryByText('Create New Sale Invoice')).not.toBeInTheDocument();
    expect(screen.getAllByText('New Test Customer')[0]).toBeInTheDocument();
  });

  it('shows existing customer suggestions and allows selecting them', () => {
    renderDashboard();
    // First, register a customer by sale
    const newSaleBtn = screen.getByText('New Sale');
    fireEvent.click(newSaleBtn);

    const nameInput = screen.getByPlaceholderText('e.g. Rahim Ahmed');
    fireEvent.change(nameInput, { target: { value: 'Karim Ullah' } });
    const submitBtn = screen.getByText(/Confirm & Generate Invoice/i);
    fireEvent.click(submitBtn);

    // Now open New Sale modal again and type 'Kar'
    fireEvent.click(screen.getByText('New Sale'));
    const nameInput2 = screen.getByPlaceholderText('e.g. Rahim Ahmed');
    fireEvent.focus(nameInput2);
    fireEvent.change(nameInput2, { target: { value: 'Kar' } });

    // Suggestion dropdown should display 'Karim Ullah'
    const matchingElements = screen.getAllByText('Karim Ullah');
    expect(matchingElements.length).toBeGreaterThan(0);

    // Click on suggestion inside modal
    fireEvent.mouseDown(matchingElements[matchingElements.length - 1]);

    // Should indicate Existing Customer
    expect(screen.getByText(/Existing Customer/i)).toBeInTheDocument();
  });

  it('navigates to Products tab and displays all products with initial stock 0', () => {
    renderDashboard();
    const productsTabBtn = screen.getByText('Product Catalog & Stock');
    fireEvent.click(productsTabBtn);

    // Products header and products should appear
    expect(screen.getByText('Product Inventory & Catalog')).toBeInTheDocument();
    expect(screen.getAllByText('Dumbo Ear Red Tail Dragon Guppy (Pair / জোড়া)')[0]).toBeInTheDocument();
    expect(screen.getAllByText('Full Red Albino Guppy (Pair / জোড়া)')[0]).toBeInTheDocument();

    // Verify all products initial stock is 0 (Out of stock status displayed)
    const outOfStockBadges = screen.getAllByText(/0 Pair|0 Piece|Out of Stock \(0\)|0 Pcs/i);
    expect(outOfStockBadges.length).toBeGreaterThan(0);
  });

  it('opens Edit Product modal and updates product information successfully', () => {
    renderDashboard();
    const productsTabBtn = screen.getByText('Product Catalog & Stock');
    fireEvent.click(productsTabBtn);

    // Click first edit button
    const editBtns = screen.getAllByTitle('Edit');
    fireEvent.click(editBtns[0]);

    // Modal should be open
    expect(screen.getByText('Edit Product Details')).toBeInTheDocument();

    // Change selling price to 350
    const priceInputs = screen.getAllByPlaceholderText('0');
    // cost_price is index 0, selling_price is index 1, current_stock is index 2
    fireEvent.change(priceInputs[1], { target: { value: '350' } });

    // Submit changes
    const saveBtn = screen.getByText('Save');
    fireEvent.click(saveBtn);

    // Modal should close and new price should be visible in table
    expect(screen.queryByText('Edit Product Details')).not.toBeInTheDocument();
    expect(screen.getAllByText(/350/)[0]).toBeInTheDocument();
  });
});

