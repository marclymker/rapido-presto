import React from 'react';

const TABS = [
  { label: 'Tout', icon: '🎊', sub: null },
  { label: 'Sirène', icon: '👰', sub: 'Robe Sirène' },
  { label: 'Catalina', icon: '💃', sub: 'Robe Catalina' },
  { label: 'Princesse', icon: '👸', sub: 'Robe Ponpon (Princesse)' },
  { label: 'Cérémonie', icon: '👗', sub: 'Robe de Cérémonie' },
  { label: 'Demoiselle', icon: '💐', sub: "Demoiselle d'honneur" },
  { label: 'Témoins', icon: '🤵', sub: 'Témoins' },
  { label: 'Alliance', icon: '💍', sub: 'Bague de Mariage' },
  { label: 'Bague', icon: '💎', sub: 'Bague' },
  { label: 'Accessoires', icon: '👑', sub: 'Accessoires' },
  { label: 'Cartes', icon: '💌', sub: 'Carte et programmation' },
  { label: 'Décor', icon: '🎀', sub: 'Matériels Décor' },
];

export default function WeddingSubcategoryTabs({ selectedSubCategory, selectedCategory, onNavigate }) {
  return (
    <div className="bg-white mb-4 p-3 rounded-lg shadow-sm overflow-x-auto no-scrollbar">
      <div className="flex gap-3">
        {TABS.map((tab) => {
          const isActive = tab.sub === null ? !selectedSubCategory : selectedSubCategory === tab.sub;
          return (
            <button
              key={tab.label}
              onClick={() => onNavigate(selectedCategory, tab.sub)}
              className="flex-shrink-0 flex flex-col items-center gap-1"
            >
              <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl transition-all ${
                isActive ? 'bg-orange-500 text-white shadow-md' : 'bg-gray-100 hover:bg-gray-200'
              }`}>
                {tab.icon}
              </div>
              <span className={`text-[9px] font-medium text-center leading-tight w-14 ${
                isActive ? 'text-orange-500' : 'text-gray-600'
              }`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
