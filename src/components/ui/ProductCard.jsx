import React from 'react';
import { Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { applyClientMargin } from '@/components/utils/priceCalculation';

export default function ProductCard({ product, onAdd, onClick }) {
  const hasPromo = product.promo_price && product.promo_price < product.price;
  const displayPrice = hasPromo 
    ? applyClientMargin(product.promo_price) 
    : applyClientMargin(product.price);
  const originalDisplayPrice = applyClientMargin(product.price);
  
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition-all"
    >
      <div 
        className="h-28 bg-gradient-to-br from-slate-50 to-slate-100 relative overflow-hidden cursor-pointer"
        onClick={() => product.is_available !== false && onAdd(product)}
      >
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-orange-100 to-orange-50">
            <div className="text-center">
              <div className="text-4xl mb-1">🍽️</div>
              <p className="text-[10px] text-orange-600 font-medium px-2">Photo à venir</p>
            </div>
          </div>
        )}
        {hasPromo && (
          <div className="absolute top-2 left-2 bg-red-500 text-white text-xs px-2 py-0.5 rounded-full font-medium">
            Promo
          </div>
        )}
        {!product.is_available && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-sm font-medium">Indisponible</span>
          </div>
        )}
        
        {/* Payment badges overlay - MonCash */}
        <div className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm px-2 py-1.5 rounded-md shadow-sm flex items-center gap-1 pointer-events-none">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694b478cc984102a3c47c781/c7840ac69_image.png" 
            alt="MonCash accepté" 
            className="h-6 w-auto object-contain"
          />
        </div>
        
        {/* Payment badges overlay - Visa */}
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1.5 rounded-md shadow-sm flex items-center gap-1 pointer-events-none">
          <img 
            src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694b478cc984102a3c47c781/7cdd08f39_image.png" 
            alt="Visa accepté" 
            className="h-6 w-auto object-contain"
          />
        </div>
      </div>
      <div className="p-3">
        <h4 className="font-medium text-slate-800 text-sm truncate">{product.name}</h4>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <span className={`font-bold ${hasPromo ? 'text-red-500' : 'text-slate-800'}`}>
              {displayPrice} HTG
            </span>
            {hasPromo && (
              <span className="text-xs text-slate-400 line-through">{originalDisplayPrice} HTG</span>
            )}
          </div>
          {product.is_available !== false && (
            <Button 
              size="icon" 
              className="h-8 w-8 rounded-full bg-orange-500 hover:bg-orange-600 animate-pulse hover:animate-none hover:scale-110 transition-transform"
              onClick={(e) => {
                e.stopPropagation();
                onAdd(product);
              }}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}