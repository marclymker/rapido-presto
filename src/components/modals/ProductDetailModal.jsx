import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, MessageCircle, Store, ChevronRight } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import ReactPixel from 'react-facebook-pixel';
import { base44 } from '@/api/base44Client';
import SEOArticle from '@/components/SEO/SEOArticle';

export default function ProductDetailModal({ product, shop, open, onClose, onAddToCart, user, onShopClick }) {
  const [quantity, setQuantity] = useState(1);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  
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
  
  const allImages = product.additional_images && product.additional_images.length > 0
    ? [product.image_url, ...product.additional_images].filter(Boolean)
    : product.image_url ? [product.image_url] : [];
  
  const basePrice = product.promo_price && product.promo_price < product.price 
    ? product.promo_price 
    : product.price;
  const price = applyClientMargin(basePrice);
  const originalPrice = applyClientMargin(product.price);

  const handleAdd = () => {
    onAddToCart(product, quantity);
    setQuantity(1);
    setCurrentImgIndex(0);
    onClose();
  };

  const handleWhatsAppClick = async (e) => {
    e.preventDefault();
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
    } else {
      window.open('https://wa.me/c/50948690366', '_blank');
    }
  };

  return (
    <>
      {/* SEO optimisé pour le produit */}
      {open && <SEOArticle product={product} shop={shop} />}
      
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[95vh] overflow-y-auto">
        <div className="p-2">
          {/* Image principale */}
          <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100">
            {allImages.length > 0 ? (
              <img 
                src={allImages[currentImgIndex]} 
                alt={product.name}
                className="w-full h-full object-cover transition-all duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-5xl">📦</span>
              </div>
            )}
            
            {product.promo_price && product.promo_price < product.price && (
              <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-3 py-1 rounded-full font-semibold">
                Promo
              </div>
            )}
          </div>

          {/* Miniatures */}
          {allImages.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2 scrollbar-hide">
              {allImages.map((img, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentImgIndex(index)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    currentImgIndex === index ? 'border-orange-500 scale-95' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </button>
              ))}
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

          {/* Shop Info */}
          {shop && (
            <button
              onClick={() => {
                if (onShopClick) {
                  onShopClick(shop);
                  onClose();
                }
              }}
              className="flex items-center gap-3 w-full mt-4 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group"
            >
              <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center overflow-hidden flex-shrink-0">
                {shop.company_logo_url ? (
                  <img src={shop.company_logo_url} alt={shop.company_name} className="w-full h-full object-cover" />
                ) : (
                  <Store className="w-6 h-6 text-orange-500" />
                )}
              </div>
              <div className="flex-1 text-left">
                <p className="font-semibold text-slate-800 group-hover:text-orange-600 transition-colors">
                  {shop.company_name}
                </p>
                <p className="text-xs text-slate-500">
                  Voir tous les produits
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-orange-500 transition-colors" />
            </button>
          )}
          
          {/* Bouton Chat Interne Rapido Presto */}
          <button
            onClick={async () => {
              if (!user) {
                base44.auth.redirectToLogin(window.location.pathname);
                return;
              }
              try {
                const response = await base44.functions.invoke('chatService', {
                  action: 'init',
                  vendor_id: shop.user_id,
                  shop_id: shop.id,
                  shop_name: shop.company_name,
                  shop_logo: shop.company_logo_url,
                  product_id: product.id,
                  product_name: product.name,
                  initial_message: `Bonjour, je suis intéressé par votre article : ${product.name}`
                });
                
                const conversationId = response.data?.conversation?.id;
                if (conversationId) {
                  window.location.href = `/chat?id=${conversationId}`;
                } else {
                  console.error('No conversation ID returned:', response.data);
                  alert('Erreur lors de l\'initialisation du chat');
                }
              } catch (error) {
                console.error('Chat init error:', error);
                alert('Erreur lors de l\'ouverture du chat');
              }
            }}
            className="flex items-center justify-center gap-3 w-full mt-4 px-4 py-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-semibold transition-all shadow-lg"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Contacter le Vendeur
          </button>

          {/* Bouton WhatsApp (si catégorie Mariage) */}
          {shop?.company_category === "Mariage" && (
            <button
              onClick={handleWhatsAppClick}
              className="flex items-center justify-center gap-2 w-full mt-3 px-4 py-4 bg-[#25D366] hover:bg-[#1ebd58] text-white rounded-xl font-semibold transition-colors shadow-lg"
            >
              <MessageCircle className="w-5 h-5" />
              Catalogue Mariage WhatsApp
            </button>
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
    </>
  );
}