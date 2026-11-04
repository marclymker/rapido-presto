import React from 'react';
import { Heart, Plus, ShoppingBag } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';

const CompactProductCard = React.memo(({ product, shop, onClick, onAdd }) => {
  const shopName = shop?.company_name || product.shop_name || 'Kairos';
  const price = applyClientMargin(product.promo_price || product.price, shopName);
  const originalPrice = product.promo_price ? applyClientMargin(product.price, shopName) : null;
  const hasPromo = Number(product.promo_price) > 0 && Number(product.promo_price) < Number(product.price);
  const imgSrc = product.image_url ? `${product.image_url}${product.image_url.includes('?') ? '&' : '?'}w=500&q=78` : null;

  const isHotel = product.category === 'Hotels/Piscine';

  return (
    <article className={`rp-product-card ${isHotel ? 'rp-hotel-card' : ''} group`} onClick={onClick} style={{ WebkitTapHighlightColor: 'transparent' }}>
      <div className="rp-product-media">
        {imgSrc ? <img src={imgSrc} alt={product.image_alt || product.name} className="rp-product-image" loading="lazy" decoding="async" /> : <div className="rp-product-empty"><ShoppingBag size={25} /></div>}
        <div className="rp-product-gradient" aria-hidden="true" />
        {hasPromo && <span className="rp-promo-badge">-{Math.round((1 - product.promo_price / product.price) * 100)}%</span>}
        <button type="button" className="rp-icon-button rp-like-button" aria-label="Ajouter aux favoris" onClick={(event) => event.stopPropagation()}><Heart size={16} /></button>
        {product.is_available !== false && onAdd && <button type="button" className="rp-add-button" aria-label="Ajouter au panier" onClick={(event) => { event.stopPropagation(); onAdd(product); }}><Plus size={18} /></button>}
        {product.is_available === false && <span className="rp-sold-out">Épuisé</span>}
      </div>
      <div className="rp-product-copy">
        <div className="rp-product-seller"><span className="rp-seller-dot" />{shopName}</div>
        <h3 className="rp-product-title">{product.name}</h3>
        <div className="rp-product-price-row"><span className="rp-product-price">{Number(price || 0).toLocaleString()} <small>HTG</small></span>{originalPrice && <span className="rp-product-old-price">{Number(originalPrice).toLocaleString()}</span>}</div>
      </div>
    </article>
  );
});

CompactProductCard.displayName = 'CompactProductCard';
export default CompactProductCard;
