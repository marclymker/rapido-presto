import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, Plus, Minus, Trash2, ShoppingBag, Zap, 
  Loader2, X, Sparkles, ChevronRight, MapPin, Check 
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/components/auth/useAuth';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

function generateConfirmationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function Cart() {
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState('cart'); 
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  const [address, setAddress] = useState(user?.address || '');
  const [orderNumber, setOrderNumber] = useState('');
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // 1. Récupération du Panier
  const { data: cartItems = [], isLoading: loadingCart } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  // 2. Récupération des Articles Similaires (avec repli si panier vide)
  const { data: similarProducts = [], isLoading: loadingSimilar } = useQuery({
    queryKey: ['similar-cart-v2', cartItems[0]?.product_id],
    queryFn: async () => {
      // Si on a un produit dans le panier, on cherche du similaire
      if (cartItems.length > 0 && cartItems[0].product_id) {
        const products = await base44.entities.Product.filter({ id: cartItems[0].product_id });
        const cat = products?.[0]?.category;
        
        const response = await base44.functions.invoke('getSimilarProducts', {
          product_id: cartItems[0].product_id,
          category: cat || 'Tout',
          limit: 10
        });
        return response?.data?.data || response?.data || [];
      } 
      
      // Sinon, on affiche juste les derniers produits disponibles
      return base44.entities.Product.list('-created_date', 10);
    },
    enabled: true // Toujours activé pour éviter que rien ne s'affiche
  });

  // 3. Auto-ouverture de la fenêtre après chargement
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
      toast.success("Ajouté au panier");
    }
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!address.trim()) {
        throw new Error('Veuillez entrer votre adresse de livraison');
      }

      const shopIds = [...new Set(cartItems.map(item => item.shop_id))];
      const firstOrderNum = 'RP' + Date.now().toString().slice(-6);

      for (const shopId of shopIds) {
        const shopItems = cartItems.filter(item => item.shop_id === shopId);
        const code = generateConfirmationCode();

        const orderResponse = await base44.entities.Order.create({
          order_number: `${firstOrderNum}-${shopId.slice(-4)}`,
          client_id: user.id,
          client_name: user.full_name,
          client_phone: user.phone,
          client_address: address,
          client_region: user.region,
          shop_id: shopId,
          shop_name: shopItems[0].shop_name,
          items: shopItems.map(item => ({
            product_id: item.product_id,
            name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total: item.unit_price * item.quantity
          })),
          subtotal: shopItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0),
          delivery_fee: 300,
          total: shopItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0) + 300,
          payment_method: 'CASH',
          payment_status: 'pending',
          status: 'pending',
          confirmation_code: code
        });

        // Send email to vendor
        try {
          const shops = await base44.entities.Shop.filter({ id: shopId });
          const shop = shops?.[0];
          if (shop?.email) {
            await base44.functions.invoke('sendOrderEmail', {
              type: 'new_order',
              orderData: {
                order_number: orderResponse.order_number,
                total: orderResponse.total,
                items: orderResponse.items
              },
              shopData: {
                company_name: shop.company_name,
                email: shop.email
              },
              clientData: {
                name: user.full_name,
                phone: user.phone,
                address: address,
                email: user.email
              }
            });
          }
        } catch (emailError) {
          console.log('Email notification failed:', emailError);
        }
      }

      await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));
      return { orderNum: firstOrderNum };
    },
    onSuccess: (data) => {
      setOrderNumber(data.orderNum);
      setStep('confirmed');
      queryClient.invalidateQueries(['cart']);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const deliveryFee = 300;
  const total = subtotal + deliveryFee;

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
        {/* Liste des articles du panier */}
        <div className="space-y-4 mb-10">
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

        {/* Bouton pour ré-ouvrir manuellement les suggestions */}
        <Button 
          variant="outline" 
          className="w-full border-dashed border-orange-300 text-orange-600 gap-2 rounded-2xl h-12"
          onClick={() => setShowSimilarModal(true)}
        >
          <Sparkles size={16} /> Voir les suggestions
        </Button>
      </main>

      {/* Barre de paiement fixe */}
      {cartItems.length > 0 && step === 'cart' && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
          <div className="max-w-xl mx-auto flex flex-col gap-3">
            <div className="flex justify-between items-end">
              <span className="text-[10px] uppercase font-bold text-slate-400">Total à payer</span>
              <span className="text-2xl font-black">{total.toLocaleString()} HTG</span>
            </div>
            <Button className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-14 font-black uppercase shadow-lg shadow-orange-100" onClick={() => setStep('checkout')}>
              Commander maintenant
            </Button>
          </div>
        </div>
      )}

      {/* Étape Checkout */}
      <AnimatePresence>
        {step === 'checkout' && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-0 bg-white z-50 overflow-y-auto"
          >
            <header className="bg-white border-b h-14 flex items-center px-4 sticky top-0">
              <Button variant="ghost" size="icon" onClick={() => setStep('cart')}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="flex-1 text-center font-bold uppercase tracking-widest text-sm">Finaliser</h1>
              <div className="w-10" />
            </header>

            <div className="max-w-xl mx-auto p-4 space-y-6 pb-32">
              {/* Adresse de livraison */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="w-5 h-5 text-orange-500" />
                  <h3 className="font-bold">Adresse de livraison</h3>
                </div>
                <Input
                  placeholder="Entrez votre adresse complète..."
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="rounded-xl"
                />
              </div>

              {/* Résumé de la commande */}
              <div className="bg-white rounded-2xl p-4 border border-slate-200 space-y-3">
                <h3 className="font-bold mb-3">Résumé</h3>
                <div className="flex justify-between text-sm">
                  <span>Sous-total ({cartItems.length} article{cartItems.length > 1 ? 's' : ''})</span>
                  <span className="font-bold">{subtotal.toLocaleString()} HTG</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span>Livraison</span>
                  <span className="font-bold">{deliveryFee.toLocaleString()} HTG</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-black">Total</span>
                  <span className="font-black text-lg text-orange-600">{total.toLocaleString()} HTG</span>
                </div>
              </div>

              <p className="text-xs text-slate-500 text-center">Paiement à la livraison (cash uniquement)</p>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40">
              <div className="max-w-xl mx-auto">
                <Button
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-14 font-black uppercase shadow-lg"
                  onClick={() => createOrderMutation.mutate()}
                  disabled={createOrderMutation.isPending}
                >
                  {createOrderMutation.isPending ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    `Confirmer - ${total.toLocaleString()} HTG`
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Étape Confirmée */}
        {step === 'confirmed' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="fixed inset-0 bg-white z-50 flex items-center justify-center p-4"
          >
            <div className="text-center max-w-md">
              <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-10 h-10 text-white" strokeWidth={3} />
              </div>
              <h2 className="text-2xl font-black mb-2">Commande confirmée !</h2>
              <p className="text-slate-600 mb-6">Numéro de commande : <span className="font-bold">#{orderNumber}</span></p>
              <p className="text-sm text-slate-500 mb-8">
                Votre commande a été envoyée au vendeur. Vous recevrez bientôt une confirmation.
              </p>
              <Button
                className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-2xl h-14 font-bold"
                onClick={() => navigate(createPageUrl('Orders'))}
              >
                Voir mes commandes
              </Button>
              <Button
                variant="ghost"
                className="w-full mt-3"
                onClick={() => navigate(createPageUrl('Home'))}
              >
                Continuer mes achats
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* --- FENÊTRE FLOTTANTE DES ARTICLES SIMILAIRES --- */}
      <Dialog open={showSimilarModal} onOpenChange={setShowSimilarModal}>
        <DialogContent className="max-w-[95%] sm:max-w-md rounded-[32px] p-0 overflow-hidden border-none bg-white shadow-2xl translate-y-[-5%]">
          <DialogHeader className="p-5 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
            <div className="flex justify-between items-center">
              <DialogTitle className="flex items-center gap-2 text-white text-lg font-black uppercase italic tracking-tighter">
                <Sparkles size={20} fill="white" />
                Articles Similaires
              </DialogTitle>
              <button onClick={() => setShowSimilarModal(false)} className="bg-white/20 p-1 rounded-full"><X size={20}/></button>
            </div>
          </DialogHeader>

          <div className="max-h-[55vh] overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/50">
            {similarProducts.map((prod) => {
              const inCart = cartItems.find(item => item.product_id === prod.id);
              const isMakarios = prod.shop_name === "MAKARIOS BRIDAL";

              return (
                <div key={prod.id} className="bg-white p-3 rounded-2xl flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow">
                  <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden relative">
                    <img src={prod.image_url} className="w-full h-full object-cover" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-bold text-slate-800 truncate mb-1">{prod.name}</h4>
                    <div className="flex items-center gap-1 text-[9px] font-bold text-orange-600 mb-1">
                      <Zap size={10} fill="currentColor" />
                      {isMakarios ? 'RÉPONSE RAPIDE' : 'LIVRAISON RAPIDE'}
                    </div>
                    <p className="text-sm font-black text-slate-900">
                      {applyClientMargin(prod.promo_price || prod.price).toLocaleString()} <span className="text-[10px]">HTG</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    {inCart ? (
                      <div className="flex items-center bg-orange-500 text-white rounded-full p-0.5 shadow-sm">
                        <button 
                          onClick={() => updateQuantityMutation.mutate({ id: inCart.id, quantity: inCart.quantity - 1 })}
                          className="p-1.5"
                        ><Minus size={14}/></button>
                        <span className="text-xs font-black w-4 text-center">{inCart.quantity}</span>
                        <button 
                          onClick={() => updateQuantityMutation.mutate({ id: inCart.id, quantity: inCart.quantity + 1 })}
                          className="p-1.5"
                        ><Plus size={14}/></button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCartMutation.mutate(prod)}
                        className="bg-slate-900 text-white h-10 w-10 flex items-center justify-center rounded-full shadow-lg active:scale-90 transition-transform"
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
              className="w-full rounded-2xl bg-slate-900 h-12 text-white font-black uppercase text-xs tracking-widest"
              onClick={() => setShowSimilarModal(false)}
            >
              Continuer ma commande
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}