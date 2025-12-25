import React from 'react';
import { cn } from "@/lib/utils";
import { UtensilsCrossed, Pill, Shirt, ShoppingBasket, Coffee, Croissant, Pizza, Flower, User, Smartphone, UserCircle } from 'lucide-react';

const categories = [
  { id: 'Fastfood', label: 'Fastfood', icon: Pizza },
  { id: 'Restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { id: 'Boutique Fleurs', label: 'Boutique Fleurs', icon: Flower },
  { id: 'Pharmacie', label: 'Pharmacie', icon: Pill },
  { id: 'Vêtements', label: 'Vêtements', icon: Shirt },
  { id: 'Epicerie', label: 'Épicerie', icon: ShoppingBasket },
  { id: 'Café', label: 'Café', icon: Coffee },
  { id: 'Boulangerie', label: 'Boulangerie', icon: Croissant },
  { id: 'Pour Femme', label: 'Pour Femme', icon: User },
  { id: 'Electronics', label: 'Electronics', icon: Smartphone },
  { id: 'Pour homme', label: 'Pour homme', icon: UserCircle },
];

export default function CategoryTabs({ selected, onSelect }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={cn(
              "flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl transition-all duration-300 min-w-[80px] shrink-0",
              isActive 
                ? "bg-orange-500 text-white shadow-lg shadow-orange-200" 
                : "bg-white text-slate-600 hover:bg-orange-50 border border-slate-100"
            )}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium whitespace-nowrap">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}