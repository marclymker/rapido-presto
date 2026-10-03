import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';

// Tuile produit façon Instagram Shop : image 4:5, prix + nom + boutique dessous
const CompactProductCard = React.memo(({ product, shop, onClick }) => {
  const shopName = shop?.company_name || product.shop_name;
  const price = applyClientMargin(product.promo_price || product.price, shopName);
  const old = product.promo_price && product.promo_price < product.price ? applyClientMargin(product.price, shopName) : null;
  const img = product.image_url ? `${product.image_url}${product.image_url.includes('?') ? '&' : '?'}width=400&quality=70&resize=cover` : null;
  return (
    <div className="cursor-pointer" onClick={onClick}>
      <div className="relative w-full bg-neutral-100" style={{ aspectRatio: '4 / 5' }}>
        {img ? <img src={img} alt={product.image_alt || product.name} loading="lazy" className="w-full h-full object-cover" />
             : <div className="w-full h-full flex items-center justify-center text-neutral-300"><ShoppingBag className="w-8 h-8" /></div>}
        {product.is_available === false && <div className="absolute inset-0 bg-white/60 flex items-center justify-center text-xs font-semibold">Épuisé</div>}
      </div>
      <div className="pt-1.5 pb-3 px-0.5">
        <p className="text-[13px] font-semibold text-neutral-900 leading-tight">{price.toLocaleString()} G {old && <span className="font-normal text-neutral-400 line-through text-[11px] ml-1">{old.toLocaleString()}</span>}</p>
        <p className="text-[13px] text-neutral-800 truncate leading-tight">{product.name}</p>
        {shopName && <p className="text-[12px] text-neutral-500 truncate leading-tight">{shopName}</p>}
      </div>
    </div>
  );
});
CompactProductCard.displayName = 'CompactProductCard';
export default CompactProductCard;
