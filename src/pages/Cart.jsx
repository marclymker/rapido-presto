import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import {
  ArrowLeft, Plus, Minus, Trash2, CreditCard,
  ShoppingBag, Zap, Loader2, Truck, Edit3, Check
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
import { useGuestCart } from '@/components/cart/useGuestCart';
import { useBackButton } from '@/components/navigation/useBackButton';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { trackMetaEvent } from '@/components/utils/metaTracking';

// --- UTILITAIRES ---

function generateConfirmationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function calculateMoncashFee(amount) {
  // Frais simplifiés ou ta logique complexe
  if (amount <= 100) return 5;
  if (amount <= 500) return 15;
  if (amount <= 1000) return 25;
  return Math.ceil(amount * 0.015); // Ex: 1.5%
}

export default function Cart() {
  const { user } = useAuth();
  const { guestCart, updateGuestCartItem, removeFromGuestCart } = useGuestCart();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [step, setStep] = useState('cart');
  const [paymentMethod, setPaymentMethod] = useState('moncash');
  const [paymentPlan, setPaymentPlan] = useState('full');
  const [deliveryOption, setDeliveryOption] = useState('address');
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [squareToken, setSquareToken] = useState(null);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  const [tempAddress, setTempAddress] = useState('');

  useBackButton(() => {
    if (step === 'checkout') setStep('cart');
    else if (step === 'confirmed') navigate(createPageUrl('Home'));
    else navigate(-1);
  }, step !== 'cart');

  useEffect(() => {
    if (user?.address) setTempAddress(user.address);
  }, [user]);

  const { data: dbCartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  const cartItems = user ? dbCartItems : guestCart;
  
  // Calculs Totaux
  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price + (item.total_customization_price || 0)) * item.quantity, 0);
  const FREE_SHIPPING_THRESHOLD = 3000;
  const isFreeShipping = subtotal >= FREE_SHIPPING_THRESHOLD;
  
  const getDeliveryPrice = () => {
    if (isFreeShipping) return 0;
    if (deliveryOption === 'makarios_pap') return 250;
    if (deliveryOption === 'makarios_cap') return 1000;
    return 300;
  };

  const deliveryFee = getDeliveryPrice();
  const baseTotal = subtotal + deliveryFee;
  const amountToPayNow = paymentPlan === 'split' ? baseTotal / 2 : baseTotal;
  const balanceDueAtDelivery = paymentPlan === 'split' ? baseTotal / 2 : 0;
  const transferFee = paymentMethod === 'moncash' ? calculateMoncashFee(amountToPayNow) : 0;
  const finalAmountToPay = Math.floor(amountToPayNow + transferFee); // Important: Entier

  // Mutations
  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, product_id, quantity }) => {
      if (!user) return quantity <= 0 ? removeFromGuestCart(product_id) : updateGuestCartItem(product_id, quantity);
      if (quantity <= 0) return base44.entities.CartItem.delete(id);
      return base44.entities.CartItem.update(id, { quantity });
    },
    onSuccess: () => user && queryClient.invalidateQueries(['cart'])
  });

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        base44.auth.redirectToLogin(window.location.pathname);
        throw new Error('Connexion requise');
      }

      if (paymentMethod === 'card' && !squareToken) throw new Error('Veuillez valider votre carte');

      // ID unique pour le groupe de commande
      const rootOrderId = 'RP' + Date.now().toString().slice(-6);
      let redirectLink = null;

      // 1. GESTION PAIEMENT API
      if (paymentMethod === 'moncash') {
        // Nettoyage téléphone (Vital pour API Moncash)
        let cleanPhone = user.phone.replace(/\D/g, '');
        if (!cleanPhone.startsWith('509')) cleanPhone = '509' + cleanPhone;

        const response = await base44.functions.invoke('moncashPayment', {
           amount: finalAmountToPay,
           orderId: rootOrderId,
           phone: cleanPhone 
        });

        if (!response.data.success || !response.data.redirect_url) {
           throw new Error(response.data.error || 'Erreur initialisation Moncash');
        }
        
        redirectLink = response.data.redirect_url;
      }

      if (paymentMethod === 'card') {
        const payRes = await base44.functions.invoke('squarePayment', {
          sourceId: squareToken,
          amount: finalAmountToPay,
          orderId: rootOrderId
        });
        if (!payRes.data.success) throw new Error('Paiement carte refusé');
      }

      // 2. CRÉATION DES COMMANDES DANS LA DB
      // On crée la commande AVANT la redirection pour qu'elle existe au retour du client
      const shopIds = [...new Set(cartItems.map(item => item.shop_id))];
      const code = generateConfirmationCode();

      for (const shopId of shopIds) {
        const shopItems = cartItems.filter(item => item.shop_id === shopId);

        await base44.entities.Order.create({
          order_number: `${rootOrderId}-${shopId.slice(-4)}`, // Ex: RP123456-8821
          client_id: user.id,
          client_name: user.full_name,
          client_phone: user.phone,
          client_address: tempAddress,
          client_region: user.region,
          shop_id: shopId,
          items: shopItems.map(item => ({
            product_id: item.product_id,
            name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price
          })),
          total: baseTotal,
          amount_paid: finalAmountToPay,
          balance_due: balanceDueAtDelivery,
          payment_method: paymentMethod,
          payment_plan: paymentPlan,
          status: 'pending_validation', // Sera passé à 'pending' (payé) par le callback
          confirmation_code: code,
          external_transaction_code: paymentMethod === 'moncash' ? 'PENDING_MONCASH' : 'CARD_PAID',
          special_instructions: specialInstructions
        });
      }

      // 3. NETTOYAGE PANIER
      await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));

      // 4. REDIRECTION OU SUCCÈS
      if (paymentMethod === 'moncash' && redirectLink) {
          window.location.href = redirectLink; // Au revoir, on part chez Moncash
          return null; 
      }

      return { orderNum: rootOrderId, code };
    },
    onSuccess: (data) => {
      if (data) {
        setOrderNumber(data.orderNum);
        setConfirmCode(data.code);
        setStep('confirmed');
        trackMetaEvent('Purchase', { value: finalAmountToPay, currency: 'HTG' });
      }
    },
    onError: (err) => toast.error(err.message)
  });

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <header className="bg-white border-b h-14 flex items-center px-4 sticky top-0 z-50">
        <Button variant="ghost" size="icon" onClick={() => step === 'checkout' ? setStep('cart') : navigate(-1)}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="flex-1 text-center font-bold uppercase tracking-widest text-sm">
          {step === 'cart' ? 'Mon Panier' : 'Paiement'}
        </h1>
        <div className="w-10" />
      </header>

      <main className="max-w-xl mx-auto p-4 pb-32">
        <AnimatePresence mode="wait">
          {step === 'cart' && (
            <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {cartItems.length === 0 ? (
                  <p className="text-center py-20 text-gray-500">Votre panier est vide</p>
              ) : (
                <div className="space-y-6 mb-8">
                    {cartItems.map(item => (
                    <div key={item.id} className="flex gap-4 border-b pb-4">
                        <div className="w-20 h-24 bg-gray-50 rounded-lg overflow-hidden">
                             <img src={item.product_image} className="w-full h-full object-cover"/>
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between">
                                <p className="font-medium text-sm">{item.product_name}</p>
                                <button onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: 0 })}><Trash2 className="w-4 h-4 text-gray-300" /></button>
                            </div>
                            <div className="flex justify-between items-end mt-4">
                                <p className="font-bold text-sm">{item.unit_price} HTG</p>
                                <div className="flex items-center border rounded">
                                    <button className="px-2" onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 })}>-</button>
                                    <span className="px-2 text-xs">{item.quantity}</span>
                                    <button className="px-2" onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}>+</button>
                                </div>
                            </div>
                        </div>
                    </div>
                    ))}
                </div>
              )}
              
              <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 z-40">
                <div className="max-w-xl mx-auto flex justify-between items-center mb-3">
                    <span className="text-xs uppercase font-bold">Total</span>
                    <span className="text-xl font-bold">{baseTotal} HTG</span>
                </div>
                <Button className="w-full bg-black text-white h-12 uppercase font-bold" onClick={() => setStep('checkout')} disabled={cartItems.length === 0}>
                   Passer au paiement
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'checkout' && (
            <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
              
              {/* Adresse */}
              <div className="p-4 border rounded-xl bg-zinc-50">
                  <div className="flex justify-between items-center mb-2">
                      <h3 className="text-xs font-bold uppercase">Adresse de livraison</h3>
                      <button onClick={() => setIsEditingAddress(!isEditingAddress)}><Edit3 className="w-4 h-4 text-gray-400"/></button>
                  </div>
                  {isEditingAddress ? 
                      <Input value={tempAddress} onChange={(e) => setTempAddress(e.target.value)} className="bg-white" /> : 
                      <p className="text-sm">{tempAddress || "Aucune adresse définie"}</p>
                  }
              </div>

              {/* Mode de Paiement */}
              <section className="space-y-3">
                <h3 className="font-bold text-xs uppercase tracking-widest pl-2 border-l-4 border-black">Paiement</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                  {/* Moncash */}
                  <div className={`flex items-center space-x-3 p-4 border rounded-xl ${paymentMethod === 'moncash' ? 'border-red-500 bg-red-50' : ''}`}>
                    <RadioGroupItem value="moncash" id="moncash" />
                    <Label htmlFor="moncash" className="flex-1 flex justify-between cursor-pointer">
                      <span className="font-bold text-xs uppercase">Moncash</span>
                      <span className="text-[10px] bg-red-600 text-white px-2 rounded">API</span>
                    </Label>
                  </div>
                  
                  {/* Carte */}
                  <div className={`flex items-center space-x-3 p-4 border rounded-xl ${paymentMethod === 'card' ? 'border-blue-500 bg-blue-50' : ''}`}>
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex-1 flex justify-between cursor-pointer">
                      <span className="font-bold text-xs uppercase">Carte Bancaire</span>
                      <CreditCard className="w-4 h-4" />
                    </Label>
                  </div>
                </RadioGroup>
              </section>

              {paymentMethod === 'card' && <SquarePaymentForm amount={finalAmountToPay} onSuccess={setSquareToken} onError={toast.error} />}

              {paymentMethod === 'moncash' && (
                <div className="bg-red-600 text-white p-4 rounded-xl text-center">
                    <p className="text-2xl font-black mb-1">{finalAmountToPay} HTG</p>
                    <p className="text-xs opacity-90">Vous serez redirigé vers Moncash pour valider.</p>
                </div>
              )}

              <Button 
                className={`w-full h-14 rounded-xl uppercase font-black tracking-widest ${paymentMethod === 'moncash' ? 'bg-red-600 hover:bg-red-700' : 'bg-black'}`}
                onClick={() => createOrderMutation.mutate()}
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? <Loader2 className="animate-spin"/> : (paymentMethod === 'moncash' ? "Payer avec Moncash" : "Confirmer")}
              </Button>
            </motion.div>
          )}

          {step === 'confirmed' && (
             <div className="text-center py-20">
                <div className="w-20 h-20 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-6">
                    <Check className="w-10 h-10" />
                </div>
                <h2 className="text-2xl font-black uppercase mb-4">Commande Confirmée</h2>
                <div className="bg-gray-100 p-6 rounded-xl inline-block mb-8">
                    <p className="text-xs text-gray-500 uppercase">Code de retrait</p>
                    <p className="text-4xl font-black tracking-widest">{confirmCode}</p>
                </div>
                <Button className="w-full bg-black h-12" onClick={() => navigate(createPageUrl('Home'))}>Retour à l'accueil</Button>
             </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}