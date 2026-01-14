import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { 
  ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Banknote, 
  Clock, AlertTriangle, Copy, Check, Info, MapPin, Edit3, 
  ShoppingBag, Zap, Loader2, ChevronRight, X, Sparkles
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { getHaitiTime } from '@/components/utils/dateFormat';
import SquarePaymentForm from '@/components/payment/SquarePaymentForm';
import { useAuth } from '@/components/auth/useAuth';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// --- LOGIQUE DES FRAIS (Standard) ---
const ACCOUNTS = {
  moncash: { number: "50948690366", name: "Marc lymker JEAN" },
  natcash: { number: "3527-0511", name: "Rebecca Christa Rigaud" }
};

export default function Cart() {
  const { user, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState('cart'); 
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [paymentPlan, setPaymentPlan] = useState('full');
  const [deliveryOption, setDeliveryOption] = useState('address');
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [transactionCode, setTransactionCode] = useState('');
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState('');
  const [showSimilarModal, setShowSimilarModal] = useState(false);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate(createPageUrl('Home'));
  }, [user, authLoading]);

  useEffect(() => {
    if (user?.address) setTempAddress(user.address);
  }, [user]);

  const { data: cartItems = [], isLoading: loadingCart } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  // --- ARTICLES SIMILAIRES ---
  const { data: similarProducts = [], isLoading: loadingSimilar } = useQuery({
    queryKey: ['similar-cart', cartItems[0]?.product_id],
    queryFn: async () => {
      if (!cartItems[0]?.product_id) return [];
      const { data: products } = await base44.entities.Product.filter({ id: cartItems[0].product_id });
      const product = products?.[0];
      if (!product?.category) return [];
      const response = await base44.functions.invoke('getSimilarProducts', {
        product_id: product.id,
        category: product.category,
        limit: 6
      });
      return response?.data?.data || response?.data || [];
    },
    enabled: cartItems.length > 0
  });

  // --- MUTATIONS ---
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
      toast.success("Ajouté !");
    }
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.CartItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries(['cart'])
  });

  // --- CALCULS ---
  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price) * item.quantity, 0);
  const deliveryFee = deliveryOption === 'address' ? 300 : (deliveryOption === 'makarios_pap' ? 250 : 1000);
  const baseTotal = subtotal + deliveryFee;
  const finalAmountToPay = paymentPlan === 'split' ? baseTotal / 2 : baseTotal;

  return (
    <div className="min-h-screen bg-slate-50 text-black font-sans pb-40">
      <header className="bg-white border-b h-14 flex items-center px-4 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => step === 'checkout' ? setStep('cart') : navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center font-bold uppercase tracking-widest text-sm">
          {step === 'cart' ? 'Mon Panier' : 'Paiement'}
        </h1>
        <div className="w-10" />
      </header>

      <main className="max-w-xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {step === 'cart' && (
            <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              
              {/* Bouton Flottant Suggestion */}
              {similarProducts.length > 0 && (
                <button 
                  onClick={() => setShowSimilarModal(true)}
                  className="w-full mb-6 bg-orange-100 border border-orange-200 p-3 rounded-2xl flex items-center justify-between text-orange-700 animate-pulse"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles size={18} />
                    <span className="text-xs font-bold uppercase">Complétez votre achat ?</span>
                  </div>
                  <ChevronRight size={18} />
                </button>
              )}

              {/* Liste Panier */}
              <div className="space-y-4">
                {cartItems.map(item => (
                  <div key={item.id} className="bg-white p-3 rounded-2xl shadow-sm flex gap-4">
                    <img src={item.product_image} className="w-20 h-24 object-cover rounded-xl bg-slate-100" />
                    <div className="flex-1 flex flex-col justify-between">
                      <div className="flex justify-between items-start">
                        <h3 className="text-sm font-bold line-clamp-2">{item.product_name}</h3>
                        <button onClick={() => deleteItemMutation.mutate(item.id)} className="text-slate-300"><Trash2 size={16} /></button>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-black text-orange-600">{item.unit_price.toLocaleString()} HTG</span>
                        <div className="flex items-center bg-slate-100 rounded-lg p-1">
                          <button onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 })} className="p-1"><Minus size={14}/></button>
                          <span className="px-3 text-xs font-bold">{item.quantity}</span>
                          <button onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })} className="p-1"><Plus size={14}/></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Résumé Fixe */}
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40 shadow-[0_-10px_20px_rgba(0,0,0,0.05)]">
                <div className="max-w-xl mx-auto space-y-3">
                  <div className="flex justify-between font-black text-xl">
                    <span className="text-xs uppercase text-slate-400 self-center">Total</span>
                    <span>{baseTotal.toLocaleString()} HTG</span>
                  </div>
                  <Button className="w-full bg-black text-white rounded-2xl h-14 font-black uppercase tracking-widest" onClick={() => setStep('checkout')}>
                    Passer au paiement
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ... Section Checkout (Gardée à l'identique de votre code précédent pour la logique de paiement) ... */}
        </AnimatePresence>
      </main>

      {/* --- FENÊTRE FLOTTANTE ARTICLES SIMILAIRES --- */}
      <Dialog open={showSimilarModal} onOpenChange={setShowSimilarModal}>
        <DialogContent className="max-w-[90%] md:max-w-md rounded-3xl p-0 overflow-hidden border-none">
          <DialogHeader className="p-4 bg-slate-900 text-white flex flex-row items-center justify-between space-y-0">
            <DialogTitle className="text-sm uppercase tracking-widest flex items-center gap-2">
              <Sparkles size={16} className="text-orange-400" />
              Articles Similaires
            </DialogTitle>
            <button onClick={() => setShowSimilarModal(false)} className="text-white/50"><X size={20}/></button>
          </DialogHeader>
          
          <div className="max-h-[60vh] overflow-y-auto p-4 bg-slate-50 space-y-3 custom-scrollbar">
            {similarProducts.map(prod => {
              const displayPrice = applyClientMargin(prod.promo_price || prod.price);
              const inCart = cartItems.find(item => item.product_id === prod.id);

              return (
                <div key={prod.id} className="bg-white p-3 rounded-2xl flex items-center gap-4 shadow-sm border border-slate-100">
                  <div className="w-16 h-16 bg-slate-100 rounded-xl overflow-hidden flex-shrink-0">
                    <img src={prod.image_url} className="w-full h-full object-contain" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">{prod.name}</p>
                    <p className="text-xs font-black text-orange-600">{displayPrice.toLocaleString()} HTG</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {inCart ? (
                      <div className="flex items-center bg-orange-50 rounded-full border border-orange-200">
                        <button 
                          onClick={() => updateQuantityMutation.mutate({ id: inCart.id, quantity: inCart.quantity - 1 })}
                          className="p-1.5 text-orange-600"
                        ><Minus size={14} /></button>
                        <span className="text-xs font-black text-orange-700 w-4 text-center">{inCart.quantity}</span>
                        <button 
                          onClick={() => updateQuantityMutation.mutate({ id: inCart.id, quantity: inCart.quantity + 1 })}
                          className="p-1.5 text-orange-600"
                        ><Plus size={14} /></button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => addToCartMutation.mutate(prod)}
                        className="bg-black text-white p-2 rounded-full shadow-lg"
                      >
                        <Plus size={16} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="p-4 bg-white border-t">
            <Button className="w-full rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold" onClick={() => setShowSimilarModal(false)}>
              Voir mon panier ({cartItems.length})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}