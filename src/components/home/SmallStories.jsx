import React from 'react';

export default function SmallStories({ onCategorySelect }) {
  const stories = [
    { id: 'Pharmacie', title: 'Pharmacie', icon: '💊', color: 'bg-green-50' },
    { id: 'Restaurants', title: 'Restaurants', icon: '🍽️', color: 'bg-red-50' },
    { id: 'Epicerie', title: 'Épicerie', icon: '🛒', color: 'bg-cyan-50' },
    { id: 'Café', title: 'Café', icon: '☕', color: 'bg-amber-50' },
    { id: 'Electronics', title: 'Électronique', icon: '📱', color: 'bg-indigo-50' },
    { id: 'Maison', title: 'Maison', icon: '🏠', color: 'bg-teal-50' },
    { id: 'Mariage', title: 'Mariage', icon: '💍', color: 'bg-pink-50', badge: 'NOUVEAU' },
    { id: 'Pour Femme', title: 'Mode', icon: '👗', color: 'bg-orange-50' },
    { id: 'Boutique Fleurs', title: 'Fleurs', icon: '💐', color: 'bg-pink-50', badge: '45 min' },
    { id: 'Pour homme', title: 'Homme', icon: '👔', color: 'bg-purple-50' },
    { id: 'Bébé', title: 'Bébé', icon: '👶', color: 'bg-yellow-50' },
    { id: 'Outils', title: 'Outils', icon: '🔧', color: 'bg-slate-50' },
  ];

  return (
    <div className="flex overflow-x-auto gap-3 p-4 no-scrollbar">
      {stories.map((item) => (
        <button 
          key={item.id}
          onClick={() => onCategorySelect(item.id)}
          className="flex flex-col items-center min-w-[65px] cursor-pointer group"
        >
          <div className={`${item.color} w-14 h-14 rounded-2xl flex items-center justify-center relative shadow-sm mb-1 transition-transform group-hover:scale-105 group-active:scale-95`}>
            {item.badge && (
              <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-md">
                {item.badge}
              </span>
            )}
            <span className="text-2xl">{item.icon}</span>
          </div>
          <span className="text-[10px] font-medium text-slate-700 text-center leading-tight">
            {item.title}
          </span>
        </button>
      ))}
    </div>
  );
}