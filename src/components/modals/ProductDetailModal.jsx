import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, MessageCircle } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import ReactPixel from 'react-facebook-pixel';

export default function ProductDetailModal({ product, open, onClose, onAddToCart }) {
  const [quantity, setQuantity] = useState(1);
  
  // Track product view when modal opens
  useEffect(() => {
    if (product && open) {
      ReactPixel.track('ViewContent', {
        content_ids: [product.id],
        content_type: 'product',
        value: product.price,
        currency: 'HTG',
        content_name: product.name
      });
    }
  }, [product, open]);
  
  if (!product) return null;
  
  const basePrice = product.promo_price && product.promo_price < product.price 
    ? product.promo_price 
    : product.price;
  const price = applyClientMargin(basePrice);
  const originalPrice = applyClientMargin(product.price);

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setQuantity(1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-orange-50 to-orange-100">
          {product.image_url ? (
            <img 
              src={product.image_url} 
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-5xl">📦</span>
            </div>
          )}
        </div>
        
        <div className="p-6">
          <DialogHeader>
            <DialogTitle className="text-xl">{product.name}</DialogTitle>
          </DialogHeader>
          
          <p className="text-slate-600 mt-2 text-sm leading-relaxed">
            {product.description || 'Aucune description disponible.'}
          </p>
          
          <div className="flex items-center gap-3 mt-4">
            <span className="text-2xl font-bold text-orange-500">{price} HTG</span>
            {product.promo_price && product.promo_price < product.price && (
              <span className="text-lg text-slate-400 line-through">{originalPrice} HTG</span>
            )}
          </div>
          
          {product.category && product.category.toLowerCase() === "mariage" && (
            <a
              href="https://wa.me/50948690366"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full mt-4 px-4 py-3 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-lg font-semibold transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Conseils & Réservation Mariage
            </a>
          )}
          
          <div className="flex items-center justify-between mt-6 pt-4 border-t">
            <div className="flex items-center gap-3 bg-slate-100 rounded-full p-1">
              <Button 
                size="icon" 
                variant="ghost"
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus className="w-4 h-4" />
              </Button>
              <span className="w-8 text-center font-semibold">{quantity}</span>
              <Button 
                size="icon" 
                variant="ghost"
                className="h-8 w-8 rounded-full"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            
            <Button 
              className="bg-orange-500 hover:bg-orange-600 px-6"
              onClick={handleAdd}
              disabled={product.is_available === false}
            >
              Ajouter • {price * quantity} HTG
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}