import React from 'react';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { Plus } from 'lucide-react';

const MiniCard = React.memo(function MiniCard({ product, onClick, onAdd }) {
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const price = hasPromo ? applyClientMargin(product.promo_price) : applyClientMargin(product.price);

  return (
    <div
      className="flex-shrink-0 w-28 bg-white rounded-xl overflow-hidden shadow-sm border border-slate-100 active:scale-95 transition-transform"
      style={{ scrollSnapAlign: 'start' }}
      onClick={() => onClick && onClick(product)}
    >
      <div className="relative w-28 h-28 bg-slate-50">
        {hasPromo && (
          <span className="absolute top-1 left-1 z-10 bg-red-500 text-white text-[7px] font-black px-1 rounded">
            -{Math.round((1 - product.promo_price / product.price) * 100)}%
          </span>
        )}
        {product.image_url ? (
          <img
            src={`${product.image_url}${product.image_url?.includes('?') ? '&' : '?'}w=200&q=60`}
            alt={product.name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-200 text-2xl">📦</div>
        )}
        {onAdd && product.is_available !== false && (
          <button
            className="absolute bottom-1 right-1 z-10 bg-orange-500 text-white w-5 h-5 rounded-full flex items-center justify-center active:scale-90"
            onClick={(e) => { e.stopPropagation(); onAdd(product); }}
          >
            <Plus size={11} strokeWidth={3} />
          </button>
        )}
      </div>
      <div className="p-1.5">
        <p className="text-[10px] font-black text-slate-900 leading-tight">{price.toLocaleString()} <span className="text-[8px] font-medium">HTG</span></p>
        <p className="text-[9px] text-slate-500 truncate mt-0.5">{product.name}</p>
      </div>
    </div>
  );
});

export default function CategorySection({ title, emoji, products, shops, onProductClick, onAddToCart }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="mb-4">
      <div className="flex items-center gap-1.5 px-4 mb-2">
        <span className="text-base">{emoji}</span>
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        <span className="text-[10px] text-slate-400 ml-1">{products.length}</span>
      </div>
      <div
        className="flex gap-2 px-4 overflow-x-auto no-scrollbar"
        style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {products.slice(0, 20).map(product => (
          <MiniCard
            key={product.id}
            product={product}
            onClick={onProductClick}
            onAdd={onAddToCart}
          />
        ))}
      </div>
    </div>
  );
}