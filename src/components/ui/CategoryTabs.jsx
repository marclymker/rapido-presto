import React from 'react';
import { cn } from "@/lib/utils";
import { UtensilsCrossed, Pill, Heart, ShoppingBasket, Coffee, Pizza, Flower, User, Smartphone, UserCircle, Home, Baby, Wrench } from 'lucide-react';

const categories = [
  { id: 'Tout', label: 'Tout', icon: Home },
  { id: 'Fastfood', label: 'Fastfood', icon: Pizza },
  { id: 'Restaurants', label: 'Restaurants', icon: UtensilsCrossed },
  { id: 'Boutique Fleurs', label: 'Fleurs', icon: Flower },
  { id: 'Pharmacie', label: 'Pharmacie', icon: Pill },
  { id: 'Mariage', label: 'Mariage', icon: Heart },
  { id: 'Epicerie', label: 'Épicerie', icon: ShoppingBasket },
  { id: 'Café', label: 'Café', icon: Coffee },
  { id: 'Pour Femme', label: 'Femme', icon: User },
  { id: 'Electronics', label: 'Electronics', icon: Smartphone },
  { id: 'Pour homme', label: 'Homme', icon: UserCircle },
  { id: 'Maison', label: 'Maison', icon: Home },
  { id: 'Bébé', label: 'Bébé', icon: Baby },
  { id: 'Outils', label: 'Outils', icon: Wrench },
];

export default function CategoryTabs({ selected, onSelect }) {
  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = selected === cat.id;
        return (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.id)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-all duration-200",
              isActive 
                ? "bg-orange-500 text-white shadow-lg" 
                : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-500 border border-slate-200"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[9px] font-medium text-center leading-tight">{cat.label}</span>
          </button>
        );
      })}
    </div>
  );
}