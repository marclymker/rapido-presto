import React from 'react';

export default function OrderFilters({ currentFilter, setFilter, userRole }) {
  const filterConfigs = userRole === 'livreur'
    ? [
        { label: 'Toutes', value: 'all', color: 'gray' },
        { label: 'Disponibles', value: 'searching_driver', color: 'blue', dot: '🔵' },
        { label: 'En route', value: 'in_delivery', color: 'orange', dot: '🟠' },
        { label: 'Livrées', value: 'delivered', color: 'green', dot: '🟢' },
        { label: 'Mes Achats', value: 'self_orders', color: 'purple', dot: '🛒' }
      ]
    : [
        { label: 'Toutes', value: 'all', color: 'gray' },
        { label: 'Nouvelles', value: 'pending', color: 'blue', dot: '🔵' },
        { label: 'Préparation', value: 'preparing', color: 'orange', dot: '🟠' },
        { label: 'Terminées', value: 'delivered', color: 'green', dot: '🟢' }
      ];

  return (
    <div className="flex gap-2 overflow-x-auto py-4 px-4 no-scrollbar bg-white">
      {filterConfigs.map((filter) => {
        const isActive = currentFilter === filter.value;
        return (
          <button
            key={filter.value}
            onClick={() => setFilter(filter.value)}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-xs font-black transition-all border-2 flex items-center gap-2 ${
              isActive
                ? 'bg-blue-600 border-blue-600 text-white shadow-lg scale-105'
                : 'bg-gray-50 border-gray-100 text-gray-500 hover:bg-gray-100 hover:border-gray-200'
            }`}
          >
            {filter.dot && !isActive && <span className="text-sm">{filter.dot}</span>}
            {filter.label}
          </button>
        );
      })}
    </div>
  );
}