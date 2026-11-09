import React, { useMemo } from 'react';
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
  'Hotels/Piscine': '🏨',
};

// Accepte shopsMap (pre-calculated) ou shops array (fallback)
export default function CategoryRow({ title, emoji, products, shops, shopsMap: shopsMapProp, onProductClick, onSeeAll }) {
  // O(1) lookup au lieu de O(n) find dans chaque render
  const shopsMap = useMemo(() => {
    if (shopsMapProp) return shopsMapProp;
    const m = {};
    (shops || []).forEach(s => { m[s.id] = s; });
    return m;
  }, [shopsMapProp, shops]);

  if (!products || products.length === 0) return null;

  const displayEmoji = emoji || CATEGORY_EMOJIS[title] || '📦';

  return (
    <section className={`rp-category-row mb-6 ${title === 'Hotels/Piscine' ? 'rp-category-hotels' : ''}`}>
      {/* Header section */}
      <div className="flex items-center justify-between px-4 mb-2">
        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-1.5">
          <span>{title}</span>
        </h3>
        {onSeeAll && (
          <button
            onClick={onSeeAll}
            className="flex items-center gap-0.5 text-sm text-indigo-400 font-semibold"
          >
            Voir tout <ChevronRight className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="rp-category-grid px-4">
        {products.slice(0, 12).map(product => {
          const shop = shopsMap[product.shop_id];
          return (
            <div
              key={product.id}
              className="min-w-0"
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
    </section>
  );
}
