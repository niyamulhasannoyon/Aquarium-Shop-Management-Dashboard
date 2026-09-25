import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ExecutiveDashboard } from '@/components/executive-overview-dashboard';

describe('ExecutiveOverviewDashboard Component', () => {
  it('renders the store title and dashboard header', () => {
    render(<ExecutiveDashboard />);
    expect(screen.getByText('Niloy Friend Shop')).toBeInTheDocument();
    expect(screen.getByText(/Executive Dashboard/i)).toBeInTheDocument();
  });

  it('renders all 5 top KPI summary cards', () => {
    render(<ExecutiveDashboard />);
    expect(screen.getByText('Total Stock Investment')).toBeInTheDocument();
    expect(screen.getByText('Total Sales Revenue')).toBeInTheDocument();
    expect(screen.getByText('Total Outstanding Due')).toBeInTheDocument();
    expect(screen.getByText('Realized Net Profit')).toBeInTheDocument();
    expect(screen.getByText('Available Inventory Valuation')).toBeInTheDocument();
  });

  it('renders quick action shortcut buttons', () => {
    render(<ExecutiveDashboard />);
    expect(screen.getByText('New Sale')).toBeInTheDocument();
    expect(screen.getByText('Add Stock')).toBeInTheDocument();
    expect(screen.getByText('Add Product')).toBeInTheDocument();
    expect(screen.getByText('Collect Due')).toBeInTheDocument();
  });

  it('renders recent sales invoices list section', () => {
    render(<ExecutiveDashboard />);
    expect(screen.getByText('Recent Sales Invoices')).toBeInTheDocument();
    expect(screen.getByText('INV-2026-005')).toBeInTheDocument();
  });

  it('renders low stock warning alert section', () => {
    render(<ExecutiveDashboard />);
    expect(screen.getByText('Low Stock Warning Alert')).toBeInTheDocument();
    expect(screen.getByText(/Soybean Oil/i)).toBeInTheDocument();
  });

  it('opens New Sale modal when New Sale button is clicked', () => {
    render(<ExecutiveDashboard />);
    const newSaleBtn = screen.getByText('New Sale');
    fireEvent.click(newSaleBtn);
    expect(screen.getByText('Create New Sale Invoice')).toBeInTheDocument();
  });

  it('opens Add Stock modal when Add Stock button is clicked', () => {
    render(<ExecutiveDashboard />);
    const addStockBtn = screen.getByText('Add Stock');
    fireEvent.click(addStockBtn);
    expect(screen.getByText('Restock Product Inventory')).toBeInTheDocument();
  });
});
