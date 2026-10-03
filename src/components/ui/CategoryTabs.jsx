import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import {
  UtensilsCrossed, Pill, Heart, ShoppingBasket, Coffee, Pizza,
  Flower, User, Smartphone, UserCircle, Home, Baby, Wrench,
  ChevronLeft, Ticket
} from 'lucide-react';

const categories = [
  { id: 'Tout', label: 'Tout', icon: Home },
  { id: 'Fastfood', label: 'Fastfood', icon: Pizza },
  { id: 'Mode', label: 'Mode', icon: UtensilsCrossed },
  { id: 'Boutique Fleurs', label: 'Fleurs', icon: Flower },
  { id: 'Pharmacie', label: 'Pharmacie', icon: Pill },
  {
    id: 'Mariage',
    label: 'Mariage',
    icon: Heart,
    subcategories: [
      { id: 'Mariage_Demoiselle', label: 'Demoiselle', icon: Heart },
      { id: 'Mariage_Annonceuse', label: 'Annonceuse', icon: Heart },
      { id: 'Mariage_Temoins', label: 'Temoins', icon: Heart },
      { id: 'Mariage_Robe', label: 'Robe Mariée', icon: Heart },
      { id: 'Mariage_Bague', label: 'Bague', icon: Heart },
      { id: 'Mariage_Accessoires', label: 'Accessoires', icon: Heart },
      { id: 'Mariage_Carte', label: 'Carte & Prog', icon: Heart },
      { id: 'Mariage_Materiels', label: 'Matériels Décor', icon: Heart }
    ]
  },
  { id: 'Epicerie', label: 'Épicerie', icon: ShoppingBasket },
  { id: 'Café', label: 'Café', icon: Coffee },
  { id: 'Pour Femme', label: 'Femme', icon: User },
  { id: 'Electronics', label: 'Electronics', icon: Smartphone },
  { id: 'Pour homme', label: 'Homme', icon: UserCircle },
  { id: 'Maison', label: 'Maison', icon: Home },
  { id: 'Bébé', label: 'Bébé', icon: Baby },
  { id: 'Outils', label: 'Outils', icon: Wrench },
  { id: 'Tickets', label: 'Tickets', icon: Ticket }, // Catégorie Tickets ajoutée
];

export default function CategoryTabs({ selected, onSelect }) {
  const [viewMode, setViewMode] = useState('main');
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);

  const handleCategoryClick = (cat) => {
    if (cat.subcategories && cat.subcategories.length > 0) {
      setSelectedMainCategory(cat);
      setViewMode('sub');
    } else {
      onSelect(cat.id);
    }
  };

  const handleSubcategoryClick = (subcatId) => {
    onSelect(subcatId);
  };

  const handleBackToMain = () => {
    setViewMode('main');
    setSelectedMainCategory(null);
  };

  if (viewMode === 'sub' && selectedMainCategory) {
    const ParentIcon = selectedMainCategory.icon;
    return (
      <div className="space-y-3 animate-in fade-in duration-300">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={handleBackToMain}
            className="flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour
          </button>
        </div>

        <div className="grid grid-cols-4 gap-1.5">
          {selectedMainCategory.subcategories.map((subcat) => {
            const SubIcon = subcat.icon;
            const isActive = selected === subcat.id;
            return (
              <button
                key={subcat.id}
                onClick={() => handleSubcategoryClick(subcat.id)}
                className={cn(
                  "flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg transition-all",
                  isActive
                    ? "bg-orange-500 text-white shadow-md scale-95"
                    : "bg-white text-slate-600 border border-slate-200"
                )}
              >
                <SubIcon className="w-4 h-4" />
                <span className="text-[9px] font-medium text-center leading-tight">{subcat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mt-2">
          <button
            onClick={() => {
              onSelect(selectedMainCategory.id);
              handleBackToMain();
            }}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all",
              selected === selectedMainCategory.id
                ? "bg-orange-600 text-white"
                : "bg-slate-100 text-slate-700 border border-slate-200"
            )}
          >
            <ParentIcon className="w-4 h-4" />
            Voir tout dans {selectedMainCategory.label}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5 animate-in slide-in-from-bottom-2 duration-300">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = selected === cat.id;
        const hasSubcategories = cat.subcategories && cat.subcategories.length > 0;

        return (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat)}
            className={cn(
              "flex flex-col items-center gap-1 px-1.5 py-2 rounded-lg transition-all relative",
              isActive
                ? "bg-orange-500 text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200 hover:border-orange-200"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[9px] font-medium text-center leading-tight">{cat.label}</span>

            {hasSubcategories && (
              <span className="absolute top-1 right-1 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}