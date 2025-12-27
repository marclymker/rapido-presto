import React from 'react';
import { Plus, MessageCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { base44 } from '@/api/base44Client';

export default function ProductCard({ product, onAdd, onClick, shop }) {
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const displayPrice = hasPromo 
    ? applyClientMargin(product.promo_price) 
    : applyClientMargin(product.price);
  const originalDisplayPrice = applyClientMargin(product.price);

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
    <div className="relative flex flex-col group">
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

      {/* Bouton WhatsApp pour Mariage */}
      {product.category?.toLowerCase().trim() === 'mariage' && (
        <button 
          className="absolute top-2 left-2 z-10 bg-orange-500 text-white w-9 h-9 rounded-full shadow-lg flex items-center justify-center hover:scale-110 transition-transform hover:bg-orange-600"
          onClick={handleWhatsAppClick}
          title="Voir le catalogue Mariage"
        >
          <MessageCircle className="w-4 h-4" />
        </button>
      )}

      {/* Badge Promo */}
      {hasPromo && (
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
      </div>
    </div>
  );
}