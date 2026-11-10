import React from 'react';
import { cn } from '@/lib/utils';
import { ShoppingBag, UtensilsCrossed, Hotel, Ticket, Pill } from 'lucide-react';
import { MAIN_CATEGORIES } from '@/lib/marketplaceSpaces';

const ICONS = {
  Marketplace: ShoppingBag,
  Nourriture: UtensilsCrossed,
  'Hotels/Piscine': Hotel,
  Tickets: Ticket,
  Pharmacie: Pill,
};

export default function CategoryTabs({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
      {MAIN_CATEGORIES.map((category) => {
        const Icon = ICONS[category.id] || ShoppingBag;
        const active = selected === category.id;
        return (
          <button
            key={category.id}
            type="button"
            onClick={() => onSelect?.(category.id)}
            className={cn(
              'flex items-center justify-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold transition',
              active
                ? 'border-red-700 bg-red-700 text-white shadow-md'
                : 'border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{category.label}</span>
          </button>
        );
      })}
    </div>
  );
}
