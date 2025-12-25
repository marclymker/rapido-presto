import React from 'react';
import { cn } from "@/lib/utils";
import { UtensilsCrossed, Pill, Shirt, ShoppingBasket, Coffee, Croissant, Pizza, Flower, User, Smartphone, UserCircle, Home } from 'lucide-react';

const categories = [
  { id: 'Tout', label: 'Tout', icon: Home },
  { id: 'Fastfood', label: 'Fastfood', icon: Pizza },
  { id: 'Restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { id: 'Boutique Fleurs', label: 'Fleurs', icon: Flower },
  { id: 'Pharmacie', label: 'Pharmacie', icon: Pill },
  { id: 'Vêtements', label: 'Vêtements', icon: Shirt },
  { id: 'Epicerie', label: 'Épicerie', icon: ShoppingBasket },
  { id: 'Café', label: 'Café', icon: Coffee },
  { id: 'Pour Femme', label: 'Femme', icon: User },
  { id: 'Electronics', label: 'Electronics', icon: Smartphone },
  { id: 'Pour homme', label: 'Homme', icon: UserCircle },
  { id: 'Maison', label: 'Maison', icon: Home },
];

export default function CategoryTabs({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-2 rounded-lg transition-all duration-200",
              isActive 
                ? "bg-orange-500 text-white shadow-lg ring-2 ring-orange-300 scale-105" 
                : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-500 border border-slate-200"
            )}
          >
            <Icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
            <span className="text-[10px] font-medium text-center leading-tight">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}