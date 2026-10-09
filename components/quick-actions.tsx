'use client';

import React from 'react';
import { ShoppingBag, PackagePlus, PlusCircle, CreditCard, Sparkles, UserPlus, Users } from 'lucide-react';
import { useLanguage } from '@/context/language-context';

interface QuickActionsProps {
  onOpenNewSale: () => void;
  onOpenAddStock: () => void;
  onOpenAddProduct: () => void;
  onOpenCollectDue: () => void;
  onOpenAddCustomer?: () => void;
  onOpenCustomerProfiles?: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onOpenNewSale,
  onOpenAddStock,
  onOpenAddProduct,
  onOpenCollectDue,
  onOpenAddCustomer,
  onOpenCustomerProfiles,
}) => {
  const { t } = useLanguage();

  const actions = [
    {
      label: t('quickActions.newSale'),
      subtitle: t('quickActions.newSaleDesc'),
      icon: ShoppingBag,
      onClick: onOpenNewSale,
      cardStyle: 'bg-gradient-to-br from-emerald-500/10 via-emerald-950/20 to-slate-900/90 border border-emerald-500/30 hover:border-emerald-400/60 shadow-lg shadow-emerald-950/20 text-emerald-100',
      iconStyle: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 group-hover:bg-emerald-500 group-hover:text-white',
      badgeStyle: 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30',
      badge: 'POS',
    },
    {
      label: t('quickActions.addStock'),
      subtitle: t('quickActions.addStockDesc'),
      icon: PackagePlus,
      onClick: onOpenAddStock,
      cardStyle: 'bg-gradient-to-br from-indigo-500/10 via-indigo-950/20 to-slate-900/90 border border-indigo-500/30 hover:border-indigo-400/60 shadow-lg shadow-indigo-950/20 text-indigo-100',
      iconStyle: 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 group-hover:bg-indigo-500 group-hover:text-white',
      badgeStyle: 'bg-indigo-500/15 text-indigo-300 border border-indigo-500/30',
      badge: 'Stock',
    },
    {
      label: t('quickActions.addProduct'),
      subtitle: t('quickActions.addProductDesc'),
      icon: PlusCircle,
      onClick: onOpenAddProduct,
      cardStyle: 'bg-gradient-to-br from-cyan-500/10 via-cyan-950/20 to-slate-900/90 border border-cyan-500/30 hover:border-cyan-400/60 shadow-lg shadow-cyan-950/20 text-cyan-100',
      iconStyle: 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 group-hover:bg-cyan-500 group-hover:text-white',
      badgeStyle: 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30',
      badge: 'Item',
    },
    {
      label: t('quickActions.collectDue'),
      subtitle: t('quickActions.collectDueDesc'),
      icon: CreditCard,
      onClick: onOpenCollectDue,
      cardStyle: 'bg-gradient-to-br from-amber-500/10 via-amber-950/20 to-slate-900/90 border border-amber-500/30 hover:border-amber-400/60 shadow-lg shadow-amber-950/20 text-amber-100',
      iconStyle: 'bg-amber-500/20 text-amber-400 border border-amber-500/30 group-hover:bg-amber-500 group-hover:text-white',
      badgeStyle: 'bg-amber-500/15 text-amber-300 border border-amber-500/30',
      badge: 'Due',
    },
  ];

  if (onOpenAddCustomer) {
    actions.push({
      label: t('quickActions.addCustomer'),
      subtitle: t('quickActions.addCustomerDesc'),
      icon: UserPlus,
      onClick: onOpenAddCustomer,
      cardStyle: 'bg-gradient-to-br from-purple-500/10 via-purple-950/20 to-slate-900/90 border border-purple-500/30 hover:border-purple-400/60 shadow-lg shadow-purple-950/20 text-purple-100',
      iconStyle: 'bg-purple-500/20 text-purple-400 border border-purple-500/30 group-hover:bg-purple-500 group-hover:text-white',
      badgeStyle: 'bg-purple-500/15 text-purple-300 border border-purple-500/30',
      badge: 'Client',
    });
  }

  if (onOpenCustomerProfiles) {
    actions.push({
      label: t('modal.customerProfile.title'),
      subtitle: t('khata.customerList'),
      icon: Users,
      onClick: onOpenCustomerProfiles,
      cardStyle: 'bg-gradient-to-br from-teal-500/10 via-teal-950/20 to-slate-900/90 border border-teal-500/30 hover:border-teal-400/60 shadow-lg shadow-teal-950/20 text-teal-100',
      iconStyle: 'bg-teal-500/20 text-teal-400 border border-teal-500/30 group-hover:bg-teal-500 group-hover:text-white',
      badgeStyle: 'bg-teal-500/15 text-teal-300 border border-teal-500/30',
      badge: 'Khata',
    });
  }

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 mb-6 sm:mb-8 backdrop-blur-md shadow-lg">
      <div className="flex items-center justify-between mb-3.5 sm:mb-4">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <h2 className="text-sm sm:text-base font-bold text-white tracking-wide">
            {t('quickActions.title')}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {actions.map((act, index) => {
          const Icon = act.icon;
          return (
            <button
              key={index}
              onClick={act.onClick}
              className={`relative flex items-center justify-between p-3 sm:p-3.5 rounded-2xl font-medium transition-all duration-200 hover:-translate-y-1 active:scale-[0.98] text-left group overflow-hidden min-h-[68px] sm:min-h-[76px] ${act.cardStyle}`}
            >
              <div className="flex items-center space-x-2.5 sm:space-x-3 z-10">
                <div className={`p-2 sm:p-2.5 rounded-xl transition-all duration-200 shrink-0 ${act.iconStyle}`}>
                  <Icon className="w-4 h-4 sm:w-4 sm:h-4" />
                </div>
                <div>
                  <div className="text-xs sm:text-xs font-bold tracking-tight text-white">{act.label}</div>
                  <div className="text-[10px] sm:text-[10px] text-slate-400 group-hover:text-slate-300 transition-colors line-clamp-1">{act.subtitle}</div>
                </div>
              </div>

              <span className={`hidden xl:inline-block text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 rounded-full z-10 shrink-0 ml-1 ${act.badgeStyle}`}>
                {act.badge}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
