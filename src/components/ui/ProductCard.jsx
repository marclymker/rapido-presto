import React, { useState, useEffect } from 'react';
import { Plus, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { base44 } from '@/api/base44Client';
import ChatButton from '@/components/chat/ChatButton';

export default function ProductCard({ product, onAdd, onClick, shop }) {
  const [showChatButton, setShowChatButton] = useState(false);
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const displayPrice = hasPromo 
    ? applyClientMargin(product.promo_price) 
    : applyClientMargin(product.price);
  const originalDisplayPrice = applyClientMargin(product.price);

  useEffect(() => {
    // Show chat button on hover after 300ms
    let timeout;
    const handleMouseEnter = () => {
      timeout = setTimeout(() => setShowChatButton(true), 300);
    };
    const handleMouseLeave = () => {
      clearTimeout(timeout);
      setShowChatButton(false);
    };

    const card = document.getElementById(`product-card-${product.id}`);
    if (card) {
      card.addEventListener('mouseenter', handleMouseEnter);
      card.addEventListener('mouseleave', handleMouseLeave);
      return () => {
        card.removeEventListener('mouseenter', handleMouseEnter);
        card.removeEventListener('mouseleave', handleMouseLeave);
        clearTimeout(timeout);
      };
    }
  }, [product.id]);

  const handleWhatsAppClick = async (e) => {
    e.stopPropagation();
    const isAuth = await base44.auth.isAuthenticated();
    if (!isAuth) {
      base44.auth.redirectToLogin(window.location.pathname);
    } else {
      window.open('https://wa.me/c/50948690366', '_blank');
    }
  };
  
  return (
    <div id={`product-card-${product.id}`} className="relative flex flex-col group">
      {/* Bouton d'ajout flottant - Le petit + vert */}
      {product.is_available !== false && (
        <button 
          className="absolute top-2 right-2 z-10 bg-[#25D366] text-white w-7 h-7 rounded-full shadow-lg flex items-center justify-center font-bold text-lg hover:scale-110 transition-transform hover:bg-green-600"
          onClick={(e) => { 
            e.stopPropagation(); 
            onAdd(product);
          }}
        >
          +
        </button>
      )}

      {/* Badge Mariage - WhatsApp */}
      {shop?.company_category === "Mariage" && (
        <button 
          className="absolute top-2 left-2 z-10 bg-[#25D366] text-white px-3 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 hover:scale-105 transition-transform text-xs font-semibold"
          onClick={handleWhatsAppClick}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
          </svg>
          WhatsApp
        </button>
      )}

      {/* Badge Promo */}
      {hasPromo && shop?.company_category !== "Mariage" && (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-bold z-10 shadow-md">
          -{Math.round((1 - product.promo_price / product.price) * 100)}%
        </div>
      )}

      {/* Image cliquable pour voir les détails */}
      <div 
        className="aspect-square w-full rounded-2xl bg-slate-50 p-4 mb-3 cursor-pointer overflow-hidden"
        onClick={() => product.is_available !== false && onClick && onClick(product)}
      >
        {product.image_url ? (
          <img 
            src={product.image_url} 
            className="w-full h-full object-contain group-hover:scale-105 transition-transform"
            alt={product.name}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-5xl mb-2">🍽️</div>
              <p className="text-[10px] text-slate-400 font-medium">Photo à venir</p>
            </div>
          </div>
        )}
        
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-2xl">
            <span className="text-white text-sm font-medium">Indisponible</span>
          </div>
        )}
      </div>

      {/* Infos prix et nom */}
      <div className="px-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-lg font-black text-slate-900">{displayPrice} HTG</p>
          {hasPromo && (
            <p className="text-sm text-slate-400 line-through">{originalDisplayPrice} HTG</p>
          )}
        </div>
        <p className="text-sm text-slate-700 leading-tight h-10 overflow-hidden">{product.name}</p>
        <div className="flex items-center justify-between mt-1">
          {product.delivery_time && (
            <p className="text-[10px] text-slate-400">📦 {product.delivery_time}</p>
          )}
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694b478cc984102a3c47c781/47cfe0ecf_image.png" 
            alt="MonCash" 
            className="h-5 object-contain"
          />
        </div>

        {/* Chat Button - appears on hover */}
        {shop && showChatButton && (
          <div className="mt-2 animate-in slide-in-from-bottom-2">
            <ChatButton product={product} shop={shop} />
          </div>
        )}
      </div>
    </div>
  );
}