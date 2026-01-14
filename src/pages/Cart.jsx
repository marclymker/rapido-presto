import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Zap, 
  Loader2, X, ShoppingCart
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/useAuth';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Cart() {
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState('cart'); 
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 1. Récupération du Panier
  const { data: cartItems = [], isLoading: loadingCart } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  // 2. Récupération des Articles Similaires
  const { data: similarProducts = [], isLoading: loadingSimilar } = useQuery({
    queryKey: ['similar-cart-v2', cartItems[0]?.product_id],
    queryFn: async () => {
      if (cartItems.length > 0 && cartItems[0].product_id) {
        const { data: products } = await base44.entities.Product.filter({ id: cartItems[0].product_id });
        const cat = products?.[0]?.category;
        
        const response = await base44.functions.invoke('getSimilarProducts', {
          product_id: cartItems[0].product_id,
          category: cat || 'Tout',
          limit: 10
        });
        return response?.data?.data || response?.data || [];
      } 
      return base44.entities.Product.filter({ is_available: true }, { limit: 10 });
    },
    enabled: true
  });

  // 3. Auto-ouverture de la fenêtre (Titre: Les Gens achètent aussi)
  useEffect(() => {
    if (similarProducts.length > 0 && step === 'cart') {
      const timer = setTimeout(() => setShowSimilarModal(true), 1200);
      return () => clearTimeout(timer);
    }
  }, [similarProducts.length, step]);

  // Mutations
  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }) => {
      if (quantity <= 0) return base44.entities.CartItem.delete(id);
      return base44.entities.CartItem.update(id, { quantity });
    },
    onSuccess: () => queryClient.invalidateQueries(['cart'])
  });

  const addToCartMutation = useMutation({
    mutationFn: async (product) => {
      const existing = cartItems.find(item => item.product_id === product.id);
      if (existing) {
        return base44.entities.CartItem.update(existing.id, { quantity: existing.quantity + 1 });
      }
      return base44.entities.CartItem.create({
        user_id: user.id,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        quantity: 1,
        unit_price: applyClientMargin(product.promo_price || product.price),
        shop_id: product.shop_id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success("Ajouté");
    }
  });

  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-black">
      <header className="bg-white border-b h-14 flex items-center px-4 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center font-bold uppercase tracking-widest text-sm">Mon Panier</h1>
        <div className="w-10" />
      </header>

      <main className="max-w-xl mx-auto p-4 pb-40">
        <div className="space-y-4">
          {cartItems.length === 0 && !loadingCart && (
            <div className="text-center py-20">
              <ShoppingBag className="w-12 h-12 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500">Votre panier est vide</p>
            </div>
          )}
          
          {cartItems.map(item => (
            <div key={item.id} className="bg-white p-3 rounded-2xl shadow-sm flex gap-4 border border-slate-100">
              <img src={item.product_image} className="w-20 h-24 object-cover rounded-xl bg-slate-50" />
              <div className="flex-1 flex flex-col justify-between py-1">
                <h3 className="text-sm font-bold leading-tight">{item.product_name}</h3>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-black text-orange-600">{item.unit_price.toLocaleString()} HTG</span>
                  <div className="flex items-center bg-slate-100 rounded-full p-1 border">
                    <button onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 })} className="p-1.5"><Minus size={14}/></button>
                    <span className="px-2 text-xs font-black">{item.quantity}</span>
                    <button onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })} className="p-1.5"><Plus size={14}/></button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Barre de paiement fixe */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
        <div className="max-w-xl mx-auto flex flex-col gap-3">
          <div className="flex justify-between items-end">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total à payer</span>
            <span className="text-2xl font-black">{subtotal.toLocaleString()} HTG</span>
          </div>
          <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-14 font-black uppercase shadow-lg shadow-orange-100" onClick={() => setStep('checkout')}>
            Commander maintenant
          </Button>
        </div>
      </div>

      {/* --- FENÊTRE FLOTTANTE : Les Gens achètent aussi --- */}
      <Dialog open={showSimilarModal} onOpenChange={setShowSimilarModal}>
        <DialogContent className="max-w-[95%] sm:max-w-md rounded-[32px] p-0 overflow-hidden border-none bg-white shadow-2xl translate-y-[-5%]">
          <DialogHeader className="p-5 bg-slate-900 text-white">
            <div className="flex justify-between items-center">
              <DialogTitle className="flex items-center gap-2 text-white text-lg font-black uppercase tracking-tighter">
                <ShoppingCart size={20} className="text-orange-400" />
                Les Gens achètent aussi
              </DialogTitle>
              <button onClick={() => setShowSimilarModal(false)} className="bg-white/10 p-1 rounded-full"><X size={20}/></button>
            </div>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
            {similarProducts.map((prod) => {
              const inCart = cartItems.find(item => item.product_id === prod.id);
              const isMakarios = prod.shop_name === "MAKARIOS BRIDAL";

              return (
                <div key={prod.id} className="bg-white p-3 rounded-2xl flex items-center gap-4 shadow-sm">
                  <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={prod.image_url} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate mb-0.5">{prod.name}</h4>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-orange-600 mb-1">
                      <Zap size={10} fill="currentColor" />
                      {isMakarios ? 'RÉPONSE RAPIDE' : 'LIVRAISON RAPIDE'}
                    </div>
                    <p className="text-sm font-black text-slate-900">
                      {applyClientMargin(prod.promo_price || prod.price).toLocaleString()} HTG
                    </p>
                  </div>

                  <div className="flex-shrink-0">
                    {inCart ? (
                      <div className="flex items-center bg-orange-500 text-white rounded-full p-0.5 shadow-sm">
                        <button onClick={() => updateQuantityMutation.mutate({ id: inCart.id, quantity: inCart.quantity - 1 })} className="p-1"><Minus size={12}/></button>
                        <span className="text-xs font-black w-4 text-center">{inCart.quantity}</span>
                        <button onClick={() => updateQuantityMutation.mutate({ id: inCart.id, quantity: inCart.quantity + 1 })} className="p-1"><Plus size={12}/></button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCartMutation.mutate(prod)}
                        className="bg-slate-900 text-white h-10 w-10 flex items-center justify-center rounded-full shadow-lg active:scale-95 transition-transform"
                      >
                        <Plus size={20} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            
            {loadingSimilar && (
              <div className="flex justify-center py-10">
                <Loader2 className="animate-spin text-orange-500" />
              </div>
            )}
          </div>

          <div className="p-4 bg-white">
            <Button 
              className="w-full rounded-2xl bg-orange-500 h-12 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-100"
              onClick={() => setShowSimilarModal(false)}
            >
              Continuer vers le paiement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}