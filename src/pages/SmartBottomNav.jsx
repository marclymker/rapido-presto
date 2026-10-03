import React from 'react';
import { Home, Package, User, Truck } from 'lucide-react';
import { useTabNavigation } from '@/lib/TabNavigationContext';

// Barre du bas façon Instagram : icônes seules, noir sur blanc, icône pleine pour l'onglet actif.
export default function SmartBottomNav({ activeOrdersCount = 0 }) {
  const { activeTab, switchToTab } = useTabNavigation();

  const navItems = [
    { id: 'products', label: 'Accueil', icon: Home, badge: null },
    { id: 'tracking', label: 'Suivi', icon: Truck, badge: null },
    { id: 'dashboard', label: 'Boutique', icon: Package, badge: activeOrdersCount },
    { id: 'account', label: 'Compte', icon: User, badge: null },
  ];

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 safe-bottom z-50"
      aria-label="Navigation principale"
      role="navigation"
    >
      <div className="flex justify-around items-center h-12 max-w-lg mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = item.id === activeTab;
          return (
            <button
              key={item.id}
              onClick={() => switchToTab(item.id)}
              className="relative flex items-center justify-center w-full h-full min-h-11 min-w-11 touch-manipulation active:opacity-60"
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
            >
              <Icon
                className="w-[26px] h-[26px] text-neutral-900"
                strokeWidth={active ? 2.5 : 1.75}
                fill={active ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
              {item.badge > 0 && (
                <span className="absolute top-1.5 left-1/2 ml-2 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
