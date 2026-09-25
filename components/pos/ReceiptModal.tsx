'use client';

import React from 'react';
import { SaleReceipt } from '@/types/pos';
import { Printer, CheckCircle, PlusCircle, X } from 'lucide-react';

interface ReceiptModalProps {
  receipt: SaleReceipt | null;
  isOpen: boolean;
  onClose: () => void;
  onNewSale: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  receipt,
  isOpen,
  onClose,
  onNewSale,
}) => {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const formattedDate = new Date(receipt.saleDate).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Top Header - Screen view only */}
        <div className="px-5 py-4 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-emerald-400">
            <CheckCircle className="w-5 h-5" />
            <h3 className="text-base font-bold text-slate-100">Sale Completed Successfully!</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content Area (Used for Screen Preview & Native Print) */}
        <div className="p-6 overflow-y-auto space-y-6" id="printable-receipt">
          {/* Store Header */}
          <div className="text-center space-y-1 pb-4 border-b border-slate-800">
            <h2 className="text-2xl font-black tracking-tight text-slate-100">
              NILOY FRIEND SHOP
            </h2>
            <p className="text-xs text-slate-400">Retail & Footwear Management</p>
            <p className="text-[11px] text-slate-500">Dhaka, Bangladesh • Tel: +880 1700-000000</p>
          </div>

          {/* Invoice Info */}
          <div className="grid grid-cols-2 gap-2 text-xs py-2 bg-slate-950/50 p-3 rounded-xl border border-slate-800/80">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Invoice No</span>
              <span className="font-mono font-bold text-emerald-400 text-sm">{receipt.invoiceNo}</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Date & Time</span>
              <span className="font-medium text-slate-200">{formattedDate}</span>
            </div>
            <div className="mt-2">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer</span>
              <span className="font-semibold text-slate-200">{receipt.customerName}</span>
            </div>
            <div className="text-right mt-2">
              <span className="text-slate-400 block text-[10px] uppercase font-semibold">Phone</span>
              <span className="font-mono text-slate-300">{receipt.customerPhone || 'N/A'}</span>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                  <th className="py-2 font-semibold">Item</th>
                  <th className="py-2 text-center font-semibold">Unit</th>
                  <th className="py-2 text-center font-semibold">Qty</th>
                  <th className="py-2 text-right font-semibold">Price</th>
                  <th className="py-2 text-right font-semibold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {receipt.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-800/30">
                    <td className="py-2.5 font-medium pr-2">{item.name}</td>
                    <td className="py-2.5 text-center text-slate-400">{item.unitType}</td>
                    <td className="py-2.5 text-center font-mono">{item.quantity}</td>
                    <td className="py-2.5 text-right font-mono">৳{item.unitPrice.toLocaleString()}</td>
                    <td className="py-2.5 text-right font-bold font-mono text-slate-100">
                      ৳{item.subtotal.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary Totals */}
          <div className="space-y-2 pt-3 border-t border-slate-800 text-xs">
            <div className="flex justify-between text-slate-300">
              <span>Subtotal:</span>
              <span className="font-mono font-bold">৳{receipt.totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>Paid Amount:</span>
              <span className="font-mono font-bold text-emerald-400">৳{receipt.paidAmount.toLocaleString()}</span>
            </div>
            {receipt.dueAmount > 0 ? (
              <div className="flex justify-between text-amber-400 font-bold py-1 border-t border-slate-800/60">
                <span>Due Balance:</span>
                <span className="font-mono">৳{receipt.dueAmount.toLocaleString()}</span>
              </div>
            ) : (
              <div className="flex justify-between text-slate-400 py-1 border-t border-slate-800/60">
                <span>Due Balance:</span>
                <span className="font-mono text-emerald-400">৳0.00 (Paid in Full)</span>
              </div>
            )}
          </div>

          {/* Footer note */}
          <div className="text-center pt-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-0.5">
            <p className="font-semibold text-slate-400">Thank you for shopping with us!</p>
            <p>Please keep this receipt for future reference.</p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center space-x-2 transition-all active:scale-[0.98]"
          >
            <Printer className="w-4 h-4 text-emerald-400" />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onNewSale}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center justify-center space-x-2 shadow-lg shadow-emerald-500/20 transition-all active:scale-[0.98]"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Start New Sale</span>
          </button>
        </div>
      </div>
    </div>
  );
};
