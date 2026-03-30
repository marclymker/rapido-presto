import React, { useState } from 'react';
import { cn } from "@/lib/utils";
import { UtensilsCrossed, Pill, Heart, ShoppingBasket, Coffee, Pizza, Flower, User, Smartphone, UserCircle, Home, Baby, Wrench, ChevronLeft } from 'lucide-react';

// Structure modifiée pour inclure les sous-catégories
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
];

export default function CategoryTabs({ selected, onSelect }) {
  const [viewMode, setViewMode] = useState('main'); // 'main' ou 'sub'
  const [selectedMainCategory, setSelectedMainCategory] = useState(null);

  // Gérer le clic sur une catégorie principale
  const handleCategoryClick = (cat) => {
    if (cat.subcategories && cat.subcategories.length > 0) {
      // Si la catégorie a des sous-catégories, passer en mode sous-catégories
      setSelectedMainCategory(cat);
      setViewMode('sub');
    } else {
      // Sinon, sélectionner normalement
      onSelect(cat.id);
    }
  };

  // Gérer le clic sur une sous-catégorie
  const handleSubcategoryClick = (subcatId) => {
    onSelect(subcatId);
  };

  // Revenir aux catégories principales
  const handleBackToMain = () => {
    setViewMode('main');
    setSelectedMainCategory(null);
  };

  // Afficher les sous-catégories
  if (viewMode === 'sub' && selectedMainCategory) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <button
            onClick={handleBackToMain}
            className="flex items-center gap-1 text-sm text-orange-500 hover:text-orange-600"
          >
            <ChevronLeft className="w-4 h-4" />
            Retour aux catégories
          </button>
        </div>
        
        <div className="grid grid-cols-4 sm:grid-cols-4 gap-1.5">
          {selectedMainCategory.subcategories.map((subcat) => {
            const Icon = subcat.icon;
            const isActive = selected === subcat.id;
            return (
              <button
                key={subcat.id}
                onClick={() => handleSubcategoryClick(subcat.id)}
                className={cn(
                  "flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-all duration-200",
                  isActive 
                    ? "bg-orange-500 text-white shadow-lg" 
                    : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-500 border border-slate-200"
                )}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[9px] font-medium text-center leading-tight">{subcat.label}</span>
              </button>
            );
          })}
        </div>
        
        {/* Optionnel : Afficher la catégorie principale elle-même comme option */}
        <div className="mt-3">
          <button
            onClick={() => {
              onSelect(selectedMainCategory.id);
              handleBackToMain();
            }}
            className={cn(
              "w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-200",
              selected === selectedMainCategory.id
                ? "bg-orange-500 text-white shadow-lg"
                : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-500 border border-slate-200"
            )}
          >
            <Heart className="w-4 h-4" />
            <span className="text-xs font-medium">Tous les articles Mariage</span>
          </button>
        </div>
      </div>
    );
  }

  // Afficher les catégories principales
  return (
    <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = selected === cat.id;
        const hasSubcategories = cat.subcategories && cat.subcategories.length > 0;
        
        return (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-1.5 py-1.5 rounded-lg transition-all duration-200 relative",
              isActive 
                ? "bg-orange-500 text-white shadow-lg" 
                : "bg-white text-slate-600 hover:bg-orange-50 hover:text-orange-500 border border-slate-200"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="text-[9px] font-medium text-center leading-tight">{cat.label}</span>
            
            {/* Indicateur pour les catégories avec sous-catégories */}
            {hasSubcategories && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></div>
            )}
          </button>
        );
      })}
    </div>
  );
}