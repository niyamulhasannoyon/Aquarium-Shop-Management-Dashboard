import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExecutiveDashboard } from '@/components/executive-overview-dashboard';
import { LanguageProvider } from '@/context/language-context';

describe('ExecutiveOverviewDashboard Component', () => {
  const renderDashboard = () =>
    render(
      <LanguageProvider>
        <ExecutiveDashboard />
      </LanguageProvider>
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
});
