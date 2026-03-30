import React, { useRef } from 'react';
import { ChevronRight } from 'lucide-react';
import CompactProductCard from './CompactProductCard';

const CATEGORY_EMOJIS = {
  'Pour Femme': '👗',
  'Pour homme': '👔',
  'Electronics': '📱',
  'Mariage': '💍',
  'Boutique Fleurs': '🌸',
  'Fastfood': '🍔',
  'Mode': '👗',
  'Pharmacie': '💊',
  'Epicerie': '🛒',
  'Café': '☕',
  'Maison': '🏠',
  'Bébé': '🍼',
  'Outils': '🔧',
  'Bijoux': '💎',
  'Matériels Décor': '🎨',
};

export default function CategoryRow({ title, emoji, products, shops, onProductClick, onSeeAll }) {
  const scrollRef = useRef(null);

  if (!products || products.length === 0) return null;

  const displayEmoji = emoji || CATEGORY_EMOJIS[title] || '📦';

  return (
    <div className="mb-4">
      {/* Header section */}
      <div className="flex items-center justify-between px-4 mb-2">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          <span>{displayEmoji}</span>
          <span>{title}</span>
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-0.5 text-[11px] text-orange-500 font-semibold"
          >
            Voir tout <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Horizontal scroll */}
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 pb-1 no-scrollbar"
        style={{
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {products.slice(0, 12).map(product => {
          const shop = shops?.find(s => s.id === product.shop_id);
          return (
            <div
              key={product.id}
              style={{ scrollSnapAlign: 'start', minWidth: '120px', maxWidth: '120px' }}
            >
              <CompactProductCard
                product={product}
                shop={shop}
                onClick={() => onProductClick(product)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}