import React from 'react';
import { Plus, Zap, Truck } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';

export default function ProductCard({ product, onAdd, onClick, shop }) {
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const displayPrice = hasPromo
    ? applyClientMargin(product.promo_price)
    : applyClientMargin(product.price);
  const originalDisplayPrice = applyClientMargin(product.price);

  // Texte dynamique pour le badge
  const fastText = shop?.name === "MAKARIOS BRIDAL" ? "Réponse Rapide" : "Livraison Rapide";

  return (
    <div
      id={`product-card-${product.id}`}
      className="group relative bg-white rounded-xl transition-all duration-300 flex flex-col h-full border border-slate-100 overflow-hidden shadow-sm hover:shadow-md"
    >
      {/* 1. ZONE IMAGE (Ratio Carré) */}
      <div className="relative aspect-square overflow-hidden bg-slate-50">
        {/* Badge Promo */}
        {hasPromo && (
          <div className="absolute top-1 left-1 bg-red-600 text-white text-[8px] px-1.5 py-0.5 rounded font-black z-20 shadow-sm">
            -{Math.round((1 - product.promo_price / product.price) * 100)}%
          </div>
        )}

        {/* Bouton Ajout Panier Rapide */}
        {product.is_available !== false && (
          <button
            className="absolute top-1 right-1 z-20 bg-white/95 text-[#25D366] w-7 h-7 rounded-full shadow-md flex items-center justify-center active:scale-90 transition-transform"
            onClick={(e) => { e.stopPropagation(); onAdd(product); }}
          >
            <Plus size={18} strokeWidth={3} />
          </button>
        )}

        {/* Image du produit */}
        <div
          className="w-full h-full p-1 cursor-pointer"
          onClick={() => product.is_available !== false && onClick && onClick(product)}
        >
          {product.image_url ? (
            <img
              src={`${product.image_url}${product.image_url?.includes('?') ? '&' : '?'}w=300&q=75`}
              className="w-full h-full object-contain transition-transform duration-500 group-hover:scale-105"
              alt={product.name}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 text-[9px] italic">
              Pas de photo
            </div>
          )}
        </div>

        {/* Overlay si épuisé */}
        {!product.is_available && (
          <div className="absolute inset-0 bg-white/70 backdrop-blur-[1px] flex items-center justify-center z-10">
            <span className="bg-slate-800 text-white px-2 py-0.5 rounded text-[8px] font-bold uppercase">Épuisé</span>
          </div>
        )}
      </div>

      {/* 2. ZONE CONTENU (Optimisée pour l'espace) */}
      <div className="p-2 flex flex-col gap-0">
        
        {/* Badge de réassurance (Zap) */}
        <div className="flex items-center gap-0.5 text-amber-600 mb-0.5">
          <Zap size={8} fill="currentColor" />
          <span className="text-[8px] font-bold uppercase tracking-tight">{fastText}</span>
        </div>

        {/* PRIX (Priorité #1 après l'image) */}
        <div className="flex items-baseline gap-1 leading-tight">
          <span className="text-sm font-black text-slate-900">
            {displayPrice.toLocaleString()} <span className="text-[8px] font-bold">HTG</span>
          </span>
          {hasPromo && (
            <span className="text-[8px] text-slate-400 line-through">
              {originalDisplayPrice}
            </span>
          )}
        </div>

        {/* NOM DU PRODUIT (Strictement 1 ligne) */}
        <h3 className="text-[10px] text-slate-500 font-medium truncate mt-0.5" title={product.name}>
          {product.name}
        </h3>

        {/* Livraison Gratuite (Ultra-compact) */}
        {displayPrice >= 3000 && (
          <div className="flex items-center gap-1 text-green-600 text-[8px] font-bold mt-1">
            <Truck size={10} /> Livraison Offerte
          </div>
        )}
      </div>

      {/* 3. SECTION BOUTON CONTACT : MASQUÉE TEMPORAIREMENT */}
      {/* Le bouton "Contacter Vendeur" / "WhatsApp" est retiré 
          pour résoudre les problèmes de notifications et gagner de l'espace.
      */}
    </div>
  );
}