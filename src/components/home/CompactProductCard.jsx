import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';

const CompactProductCard = React.memo(({ product, shop, onClick }) => {
  const price = applyClientMargin(product.promo_price || product.price);
  const originalPrice = product.promo_price ? applyClientMargin(product.price) : null;
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const isNew = product.created_date && (Date.now() - new Date(product.created_date).getTime()) < 7 * 24 * 60 * 60 * 1000;

  // Vignettes 3 colonnes : ~120px réels sur mobile → width=120 suffit
  const imgSrc = product.image_url
    ? `${product.image_url}${product.image_url.includes('?') ? '&' : '?'}width=120&quality=55&resize=cover`
    : null;

  return (
    <div
      className="bg-white rounded-lg overflow-hidden shadow-sm active:scale-[0.97] cursor-pointer flex flex-col"
      onClick={onClick}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      {/* Image - ratio carré compact */}
      <div className="relative w-full bg-slate-100" style={{ paddingBottom: '100%' }}>
        <div className="absolute inset-0">
          {imgSrc ? (
            <img
              src={imgSrc}
              alt={product.name}
              className="w-full h-full object-cover"
              loading="lazy"
              decoding="async"
              width="120"
              height="120"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              <ShoppingBag className="w-6 h-6" />
            </div>
          )}
        </div>
        {/* Badge promo */}
        {hasPromo && (
          <div className="absolute top-1 left-1 bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight">
            -{Math.round((1 - product.promo_price / product.price) * 100)}%
          </div>
        )}
        {/* Badge New */}
        {isNew && !hasPromo && (
          <div className="absolute top-1 left-1 bg-green-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-tight">
            NEW
          </div>
        )}
        {/* Rupture */}
        {product.is_available === false && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="text-white text-[9px] font-bold bg-black/60 px-2 py-0.5 rounded-full">Épuisé</span>
          </div>
        )}
      </div>

      {/* Infos - ultra compact */}
      <div className="p-1.5 flex flex-col gap-0.5">
        {/* Prix en premier - mise en avant */}
        <div className="flex items-baseline gap-1">
          <span className="text-[12px] font-black leading-tight" style={{color: '#050505'}}>{price.toLocaleString()} G</span>
          {originalPrice && (
            <span className="text-[9px] line-through leading-tight" style={{color: '#8a8d91'}}>{originalPrice.toLocaleString()}</span>
          )}
        </div>
        {/* Nom produit */}
        <p className="text-[11px] truncate leading-tight font-medium" style={{color: '#3c4043'}}>{product.name}</p>
        {/* Boutique */}
        {shop?.company_name && (
          <p className="text-[9px] truncate leading-tight" style={{color: '#8a8d91'}}>{shop.company_name}</p>
        )}
      </div>
    </div>
  );
});

CompactProductCard.displayName = 'CompactProductCard';
export default CompactProductCard;