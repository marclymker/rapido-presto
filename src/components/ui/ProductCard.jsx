import React from 'react';
import { Heart, Plus, Truck, Zap } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';

const ProductCard = React.memo(function ProductCard({ product, onAdd, onClick, shop }) {
  const shopName = shop?.company_name || product.shop_name;
  const hasPromo = Number(product.promo_price) > 0 && Number(product.promo_price) < Number(product.price);
  const displayPrice = applyClientMargin(hasPromo ? product.promo_price : product.price, shopName);
  const originalDisplayPrice = applyClientMargin(product.price, shopName);
  const image = product.image_url;
  const seller = shopName || 'Vendeur Rapido Presto';
  const isHotel = product.category === 'Hotels/Piscine';

  return (
    <article id={`product-card-${product.id}`} className={`rp-product-card ${isHotel ? 'rp-hotel-card' : ''} group`}>
      <div className="rp-product-media" onClick={() => product.is_available !== false && onClick?.(product)} role="button" tabIndex={0} onKeyDown={(event) => event.key === 'Enter' && onClick?.(product)}>
        {image ? <img src={`${image}${image.includes('?') ? '&' : '?'}w=600&q=82`} className="rp-product-image" alt={product.image_alt || product.name} loading="lazy" decoding="async" /> : <div className="rp-product-empty">Pas de photo</div>}
        <div className="rp-product-gradient" aria-hidden="true" />
        {hasPromo && <span className="rp-promo-badge">-{Math.round((1 - product.promo_price / product.price) * 100)}%</span>}
        <button type="button" className="rp-icon-button rp-like-button" aria-label={`Ajouter ${product.name} aux favoris`} onClick={(event) => event.stopPropagation()}><Heart size={17} strokeWidth={2.2} /></button>
        {product.is_available !== false && <button type="button" className="rp-add-button" aria-label={`Ajouter ${product.name} au panier`} onClick={(event) => { event.stopPropagation(); onAdd?.(product); }}><Plus size={19} strokeWidth={2.8} /></button>}
        {product.is_available === false && <span className="rp-sold-out">Épuisé</span>}
      </div>
      <div className="rp-product-copy">
        <div className="rp-product-seller"><span className="rp-seller-dot" />{seller}</div>
        <h3 className="rp-product-title" title={product.name}>{product.name}</h3>
        <div className="rp-product-price-row"><span className="rp-product-price">{Number(displayPrice || 0).toLocaleString()} <small>HTG</small></span>{hasPromo && <span className="rp-product-old-price">{Number(originalDisplayPrice || 0).toLocaleString()}</span>}</div>
        <div className="rp-product-meta"><span><Zap size={12} fill="currentColor" /> Réponse rapide</span>{displayPrice >= 3000 && <span><Truck size={12} /> Livraison offerte</span>}</div>
      </div>
    </article>
  );
});

export default ProductCard;
