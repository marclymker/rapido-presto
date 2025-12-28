import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, MessageCircle, Store, ChevronRight, MessageSquare, Loader2 } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import ReactPixel from 'react-facebook-pixel';
import { base44 } from '@/api/base44Client';
import SEOArticle from '@/components/SEO/SEOArticle';

export default function ProductDetailModal({ product, shop, open, onClose, onAddToCart, user, onShopClick }) {
  const [quantity, setQuantity] = useState(1);
  const [currentImgIndex, setCurrentImgIndex] = useState(0);
  const [isChatLoading, setIsChatLoading] = useState(false);
  
  // Tracking Pixel Facebook
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
  
  // Gestion des images
  const allImages = product.additional_images?.length > 0
    ? [product.image_url, ...product.additional_images].filter(Boolean)
    : product.image_url ? [product.image_url] : [];
  
  // Calcul des prix
  const basePrice = product.promo_price && product.promo_price < product.price ? product.promo_price : product.price;
  const price = applyClientMargin(basePrice);
  const originalPrice = applyClientMargin(product.price);

  /**
   * LOGIQUE DE CHAT RÉVISÉE
   */
  const handleContactVendor = async () => {
    // 1. Vérification connexion
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }

    // 2. Identification du vendeur (plusieurs sources possibles dans la data)
    const targetVendorId = shop?.user_id || product?.user_id || product?.vendor_id || product?.created_by;
    
    if (!targetVendorId) {
      alert("Erreur : Impossible d'identifier le vendeur pour cet article.");
      return;
    }

    // 3. Empêcher l'auto-chat
    if (user.id === targetVendorId) {
      alert("Vous êtes le propriétaire de cet article.");
      return;
    }

    setIsChatLoading(true);

    try {
      // 4. Appel au service de chat via Base44 Functions
      const response = await base44.functions.invoke('chat-service', {
        body: {
          action: 'init_conversation',
          params: {
            vendor_id: targetVendorId,
            buyer_id: user.id,
            product_id: product.id,
            product_name: product.name,
            initial_message: `Bonjour, je suis intéressé par l'article : ${product.name}`
          }
        }
      });

      // 5. Extraction de l'ID de conversation (Gestion de tous les formats de retour)
      const data = response.data || response;
      const conversationId = data?.id || data?.conversation?.id || data?.conversation_id;

      if (conversationId) {
        window.location.href = `/chat?id=${conversationId}`;
      } else {
        // Fallback 1: Si l'API répond mais sans ID, on tente avec les params URL
        window.location.href = `/chat?vendorId=${targetVendorId}&productId=${product.id}`;
      }
    } catch (error) {
      console.error('Chat initialization failed:', error);
      // Fallback 2: En cas d'erreur réseau/fonction, on redirige quand même vers la page chat
      window.location.href = `/chat?vendorId=${targetVendorId}&productId=${product.id}`;
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <>
      {open && <SEOArticle product={product} shop={shop} />}
      
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden max-h-[95vh] overflow-y-auto bg-white">
          {/* Section Visuelle */}
          <div className="p-2 bg-white">
            <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-50 border border-slate-100">
              {allImages.length > 0 && (
                <img 
                  src={allImages[currentImgIndex]} 
                  alt={product.name} 
                  className="w-full h-full object-cover" 
                />
              )}
              {product.promo_price && (
                <div className="absolute top-3 left-3 bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold uppercase tracking-wider">
                  PROMO
                </div>
              )}
            </div>
          </div>
        
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-xl font-extrabold text-slate-900">{product.name}</DialogTitle>
            </DialogHeader>
            
            <p className="text-slate-500 mt-2 text-sm leading-relaxed line-clamp-3">
              {product.description || "Aucune description fournie."}
            </p>
            
            <div className="flex items-baseline gap-3 mt-4">
              <span className="text-2xl font-black text-orange-600">{price} HTG</span>
              {product.promo_price && (
                <span className="text-sm text-slate-400 line-through">{originalPrice} HTG</span>
              )}
            </div>

            {/* Carte Boutique */}
            {shop && (
              <div 
                onClick={() => onShopClick?.(shop)}
                className="flex items-center gap-3 w-full mt-6 p-4 bg-slate-50 hover:bg-slate-100 rounded-2xl cursor-pointer border border-slate-100 transition-colors group"
              >
                <div className="w-10 h-10 rounded-full bg-white overflow-hidden border border-slate-200">
                  {shop.company_logo_url ? (
                    <img src={shop.company_logo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-full h-full p-2 text-orange-500" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-sm text-slate-800 group-hover:text-orange-600 transition-colors">
                    {shop.company_name}
                  </p>
                  <p className="text-[10px] text-slate-400 uppercase font-semibold">Boutique certifiée</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-300" />
              </div>
            )}
            
            <div className="space-y-3 mt-6">
              {/* BOUTON CHAT RAPIDO PRESTO */}
              <Button
                onClick={handleContactVendor}
                disabled={isChatLoading}
                className="w-full py-7 bg-slate-900 hover:bg-black text-white rounded-2xl shadow-xl flex gap-3 text-base font-bold transition-all active:scale-95"
              >
                {isChatLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <MessageSquare className="w-5 h-5" />
                )}
                {isChatLoading ? "Ouverture..." : "Contacter le Vendeur"}
              </Button>

              {/* BOUTON WHATSAPP (Optionnel) */}
              {shop?.company_category === "Mariage" && (
                <Button
                  onClick={() => window.open('https://wa.me/c/50948690366', '_blank')}
                  variant="outline"
                  className="w-full py-7 border-2 border-[#25D366] text-[#25D366] hover:bg-[#25D366] hover:text-white rounded-2xl font-bold transition-all"
                >
                  <MessageCircle className="w-5 h-5 mr-2" />
                  WhatsApp Mariage
                </Button>
              )}
            </div>
            
            {/* Section Achat rapide */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
              <div className="flex items-center gap-2 bg-slate-100 rounded-xl p-1">
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-9 w-9"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="w-6 text-center font-bold text-slate-700">{quantity}</span>
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="h-9 w-9"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              
              <Button 
                className="bg-orange-500 hover:bg-orange-600 h-12 px-8 rounded-xl font-black text-white shadow-lg shadow-orange-200 transition-all active:scale-95"
                onClick={() => { onAddToCart(product, quantity); onClose(); }}
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