import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Clock, AlertTriangle, Truck, MapPin } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import SquarePaymentForm from '@/components/payment/SquarePaymentForm';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';

// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH : GÉOGRAPHIE & LOGISTIQUE
// ---------------------------------------------------------------------------
const normalizeForRegion = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const REGION_DATA = {
  // Section 1 : Port-au-Prince
  'port-au-prince': { index: 0, section: 1 },
  'kenscoff': { index: 0, section: 1 },
  'petion-ville': { index: 1, section: 1 },
  'delmas': { index: 2, section: 1 },
  'tabarre': { index: 3, section: 1 },
  'clercine': { index: 4, section: 1 },
  'cite soleil': { index: 5, section: 1 },
  'croix des bouquets': { index: 6, section: 1 },
  'lilavois': { index: 7, section: 1 },
  'fontamara': { index: 8, section: 1 }, 
  
  // Section 2 : Carrefour & Sud
  'carrefour': { index: 9, section: 2 },
  'gressier': { index: 10, section: 2 },
  'leogane': { index: 11, section: 2 },
  
  // Section 3 : Artibonite et Nord
  'ennery': { index: 12, section: 3 },
  "l'estere": { index: 13, section: 3 },
  'gonaives': { index: 14, section: 3 },
  'les gonaives': { index: 14, section: 3 },
  'plaine du nord': { index: 15, section: 3 },
  'vaudreuil': { index: 16, section: 3 },
  'cap-haitien': { index: 17, section: 3 }, 
  'madeline': { index: 18, section: 3 },
  'limonade': { index: 19, section: 3 },
  'pignon': { index: 20, section: 3 },
  'hinche': { index: 21, section: 3 }
};

const CATEGORY_GROUP_HEAVY = ['Boutique Fleurs', 'Materiels Decor', 'Maison'];

function calculateSpecificShopFee(clientRegionName, shopRegionName, shopItems) {
  if (!clientRegionName || !shopRegionName) return 495; // Fallback de sécurité

  const target = REGION_DATA[normalizeForRegion(clientRegionName)];
  const shop = REGION_DATA[normalizeForRegion(shopRegionName)];

  if (!target || !shop) return 495; // Fallback si région inconnue

  const isSameRegion = target.index === shop.index;

  // Calcul du score d'écart
  let diff = Math.abs(target.index - shop.index);
  let penalty = target.section !== shop.section ? 50 : 0;
  let score = diff + penalty;

  // Vérification Dimensionnelle
  const isHeavyLoad = shopItems.some(item => CATEGORY_GROUP_HEAVY.includes(item.category));

  let rawFee = 0;

  // NOUVELLE FORMULE EXACTE DU CEO
  if (isHeavyLoad) {
    rawFee = isSameRegion ? 495 : (495 + score) * 1.5;
  } else {
    rawFee = isSameRegion ? 245 : (245 + score) * 1.5;
  }

  return Math.ceil(rawFee); 
}

function generateConfirmationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

// ---------------------------------------------------------------------------
// COMPOSANT PRINCIPAL
// ---------------------------------------------------------------------------
export default function Cart() {
  const { trackInitiateCheckout, trackPurchase } = useActivityTracker();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('cart');
  const [paymentMethod, setPaymentMethod] = useState('moncash');
  const [paymentSplit, setPaymentSplit] = useState('full');
  const [deliveryOption, setDeliveryOption] = useState('standard');
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [redirectingToMoncash, setRedirectingToMoncash] = useState(false);
  const [squareToken, setSquareToken] = useState(null);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
    }).catch(() => {
      navigate(createPageUrl('Home'));
    });
  }, [navigate]);

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('step') === 'checkout' && cartItems.length > 0) {
      setStep('checkout');
    }
  }, [cartItems]);

  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }) => {
      if (quantity <= 0) return base44.entities.CartItem.delete(id);
      return base44.entities.CartItem.update(id, { quantity });
    },
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries(['cart', user?.id]);
      const previous = queryClient.getQueryData(['cart', user?.id]);
      queryClient.setQueryData(['cart', user?.id], (old = []) =>
        quantity <= 0 ? old.filter(i => i.id !== id) : old.map(i => i.id === id ? { ...i, quantity } : i)
      );
      return { previous };
    },
    onError: (_, __, ctx) => { if (ctx?.previous) queryClient.setQueryData(['cart', user?.id], ctx.previous); },
    onSettled: () => queryClient.invalidateQueries(['cart'])
  });

  const deleteItemMutation = useMutation({
    mutationFn: (id) => base44.entities.CartItem.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries(['cart', user?.id]);
      const previous = queryClient.getQueryData(['cart', user?.id]);
      queryClient.setQueryData(['cart', user?.id], (old = []) => old.filter(i => i.id !== id));
      return { previous };
    },
    onError: (_, __, ctx) => { if (ctx?.previous) queryClient.setQueryData(['cart', user?.id], ctx.previous); },
    onSettled: () => queryClient.invalidateQueries(['cart'])
  });

  // ---------------------------------------------------------------------------
  // MOTEUR DE CALCUL DES PRIX
  // ---------------------------------------------------------------------------
  const itemsByShop = cartItems.reduce((acc, item) => {
    if (!acc[item.shop_id]) acc[item.shop_id] = [];
    acc[item.shop_id].push(item);
    return acc;
  }, {});

  const subtotal = cartItems.reduce((sum, item) => {
    const itemTotal = (item.unit_price + (item.total_customization_price || 0)) * item.quantity;
    return sum + itemTotal;
  }, 0);

  const shopCount = Object.keys(itemsByShop).length;
  
  // DÉTECTION : Y a-t-il un produit dont la boutique est à Delmas ?
  const hasDelmasShop = Object.keys(itemsByShop).some(shopId => {
    const shopRegion = itemsByShop[shopId][0].shop_region;
    return normalizeForRegion(shopRegion) === 'delmas';
  });

  let expressFee = 0;
  let standardFee = 0;
  const shopFees = {}; 

  Object.keys(itemsByShop).forEach(shopId => {
    const shopRegion = itemsByShop[shopId][0].shop_region;
    const fee = calculateSpecificShopFee(user?.region, shopRegion, itemsByShop[shopId]);
    shopFees[shopId] = fee;
    expressFee += fee;
    if (fee > standardFee) standardFee = fee;
  });

  // Application de l'option de livraison sélectionnée
  let deliveryFee = 0;
  if (deliveryOption === 'pickup_delimart') {
    deliveryFee = 0;
  } else if (shopCount > 1 && deliveryOption === 'express') {
    deliveryFee = expressFee;
  } else {
    deliveryFee = standardFee;
  }

  const pendingBalance = user?.pending_balance || 0;
  const baseTotal = subtotal + deliveryFee + pendingBalance;
  const total = paymentSplit === 'split' ? baseTotal / 2 : baseTotal;

  // Si on vide le panier ou que la condition Delmas disparaît, reset l'option
  useEffect(() => {
    if (!hasDelmasShop && deliveryOption === 'pickup_delimart') {
      setDeliveryOption('standard');
    }
  }, [hasDelmasShop, deliveryOption]);

  // ---------------------------------------------------------------------------
  // PROCESSUS DE COMMANDE
  // ---------------------------------------------------------------------------
  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const cartItemIds = cartItems.map(item => item.id);
      const priceValidation = await base44.functions.invoke('validateOrderPrice', {
        cartItemIds,
        paymentSplit
      });

      if (!priceValidation.data?.success) {
        throw new Error(priceValidation.data?.error || 'Validation des prix échouée');
      }

      const { validation } = priceValidation.data;
      const { itemsByShop: validatedItemsByShop, finalTotal: totalAmount } = validation;
      const shopIds = Object.keys(validatedItemsByShop);

      const processOrders = async (paymentMethodType, transactionId = null) => {
        const createdOrders = [];
        const orderNumBase = 'RP' + Date.now().toString().slice(-6);

        for (const shopId of shopIds) {
          const validatedItems = validatedItemsByShop[shopId].items;
          const shopSubtotal = validatedItems.reduce((sum, item) => sum + item.verified_total, 0);
          const orderNum = `${orderNumBase}-${shopId.slice(-4)}`;
          const code = generateConfirmationCode();

          let specificShopFee = 0;
          if (deliveryOption !== 'pickup_delimart') {
            specificShopFee = (shopCount > 1 && deliveryOption === 'standard') 
              ? (standardFee / shopCount) 
              : shopFees[shopId];
          }

          const order = await base44.entities.Order.create({
            order_number: orderNum,
            client_id: user.id,
            client_name: user.full_name,
            client_phone: user.phone,
            client_address: user.address || '',
            client_region: user.region,
            shop_id: shopId,
            shop_name: validatedItems[0].shop_name,
            shop_region: validatedItems[0].shop_region,
            items: validatedItems.map(item => ({
              product_id: item.product_id,
              name: item.product_name,
              category: item.category || 'Non classé',
              quantity: item.quantity,
              unit_price: item.verified_price + item.verified_customization_price,
              total: item.verified_total,
              customization: item.customization
            })),
            subtotal: shopSubtotal,
            delivery_fee: specificShopFee || 0,
            total: shopSubtotal + (specificShopFee || 0),
            payment_method: paymentMethodType,
            payment_split: paymentSplit,
            status: 'pending',
            payment_status: paymentMethodType === 'card' ? 'paid' : 'pending',
            confirmation_code: code,
            special_instructions: deliveryOption === 'pickup_delimart' ? `(RETRAIT DELIMART DELMAS 32) ${specialInstructions}` : specialInstructions,
            moncash_transaction_id: transactionId
          });

          createdOrders.push({ orderId: order.id, orderNum, code });
        }
        return { createdOrders, orderNumBase };
      };

      if (paymentMethod === 'card') {
        if (!squareToken) throw new Error('Token de paiement manquant');
        try {
          const { createdOrders, orderNumBase } = await processOrders('card');
          
          const paymentResponse = await base44.functions.invoke('squarePayment', {
            sourceId: squareToken,
            amount: totalAmount,
            orderId: createdOrders[0].orderNum
          });

          if (!paymentResponse.data.success) throw new Error('Paiement refusé');

          for (const order of createdOrders) {
            await base44.functions.invoke('sendOrderNotification', { orderId: order.orderId, status: 'pending' }).catch(() => {});
            await base44.functions.invoke('sendWhatsAppOrderNotification', { orderId: order.orderId }).catch(() => {});
          }

          await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));
          return { orderNum: createdOrders[0].orderNum, code: createdOrders[0].code };
        } catch (error) {
          throw new Error(error.message || 'Erreur lors du paiement par carte');
        }
      }

      if (paymentMethod === 'moncash') {
        const { createdOrders, orderNumBase } = await processOrders('moncash');
        await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));

        const response = await base44.functions.invoke('moncashCreatePayment', {
          orderId: orderNumBase,
          amount: totalAmount,
          description: `Commande ${orderNumBase}`
        });

        const paymentData = response.data;
        if (!paymentData?.success || !paymentData?.paymentUrl) {
          throw new Error(paymentData?.error || 'Erreur MonCash: URL de redirection manquante');
        }

        for (const order of createdOrders) {
          await base44.entities.Order.update(order.orderId, {
            moncash_transaction_id: paymentData.transactionId
          });
        }

        return { redirectToMoncash: true, paymentUrl: paymentData.paymentUrl, orderNum: createdOrders[0].orderNum };
      }
    },
    onSuccess: (data) => {
      if (!data) return;
      if (data.redirectToMoncash && data.paymentUrl) {
        window.location.href = data.paymentUrl;
        return;
      }
      
      queryClient.invalidateQueries(['cart']);
      setOrderNumber(data.orderNum);
      setConfirmCode(data.code);
      setStep('confirmed');
      toast.success('Commande confirmée!');
      
      trackPurchase({
        order_number: data.orderNum,
        total: baseTotal,
        items: cartItems.map(item => ({
          product_id: item.product_id,
          name: item.product_name,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      });
      
      if (window.fbq) {
        window.fbq('track', 'Purchase', {
          content_ids: cartItems.map(i => i.product_id),
          content_type: 'product',
          contents: cartItems.map(i => ({ id: i.product_id, quantity: i.quantity, item_price: i.unit_price })),
          num_items: cartItems.reduce((s, i) => s + i.quantity, 0),
          value: parseFloat(baseTotal),
          currency: 'HTG',
          order_id: data.orderNum
        });
      }
    },
    onError: (error) => toast.error(error.message || 'Erreur lors de la création de la commande')
  });

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white sticky top-0 z-40 border-b" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Link to={createPageUrl('Home')}>
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </Link>
            <h1 className="text-lg font-semibold">
              {step === 'cart' && 'Mon Panier'}
              {step === 'checkout' && 'Paiement'}
              {step === 'confirmed' && 'Commande Confirmée'}
            </h1>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {cartItems.length === 0 && step === 'cart' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
              <p className="text-slate-500 mb-4">Votre panier est vide</p>
              <Link to={createPageUrl('Home')}>
                <Button className="bg-orange-500 hover:bg-orange-600">
                  Continuer vos achats
                </Button>
              </Link>
            </motion.div>
          )}

          {step === 'cart' && cartItems.length > 0 && (
            <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              
              {shopCount > 1 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm text-blue-800">
                  <p className="font-bold flex items-center gap-2">
                    <Truck className="w-4 h-4" /> Commande multi-boutiques
                  </p>
                  <p className="text-xs mt-1">
                    Votre panier contient des articles de {shopCount} boutiques différentes.
                    Choisissez votre option de livraison ci-dessous.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.id} className="bg-white rounded-xl p-4 flex gap-4 shadow-sm border border-slate-100">
                    <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                      {item.product_image ? (
                        <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">{item.product_name}</h3>
                      <p className="text-xs text-slate-500 font-medium">
                        {item.shop_name} <span className="text-slate-400 font-normal">({item.shop_region})</span>
                      </p>
                      
                      <div className="flex items-center justify-between mt-3">
                        <div>
                          <span className="font-bold text-slate-800">
                            {(item.unit_price + (item.total_customization_price || 0)) * item.quantity} HTG
                          </span>
                        </div>
                        <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1 border">
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded bg-white shadow-sm active:scale-95 text-slate-600"
                            onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 })}
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="w-6 text-center text-sm font-semibold">{item.quantity}</span>
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded bg-white shadow-sm active:scale-95 text-slate-600"
                            onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <div className="w-[1px] h-4 bg-slate-200 mx-1"></div>
                          <button
                            className="w-7 h-7 flex items-center justify-center rounded active:scale-95 text-red-500 hover:bg-red-50"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* SÉLECTION DU MODE DE LIVRAISON (Visible si plusieurs boutiques OU s'il y a une option Retrait Delmas) */}
              {(shopCount > 1 || hasDelmasShop) && (
                <div className="bg-white rounded-xl p-4 mt-6 border shadow-sm">
                  <h3 className="font-bold mb-3 flex items-center gap-2 text-slate-800">
                    <Truck className="w-5 h-5 text-orange-500" />
                    Options de Livraison
                  </h3>
                  <RadioGroup value={deliveryOption} onValueChange={setDeliveryOption} className="space-y-3">
                    <label className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${deliveryOption === 'standard' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                      <RadioGroupItem value="standard" id="standard" className="mt-1" />
                      <div className="flex-1">
                        <div className="flex justify-between">
                          <span className="font-bold text-slate-800">Standard (24h - 48h)</span>
                          <span className="font-bold text-orange-600">+{standardFee} HTG</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">
                          {shopCount > 1 ? "Vos articles sont regroupés pour réduire les frais." : "Livraison classique à votre adresse."}
                        </p>
                      </div>
                    </label>

                    {shopCount > 1 && (
                      <label className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${deliveryOption === 'express' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <RadioGroupItem value="express" id="express" className="mt-1" />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-800">Express (12h - 24h)</span>
                            <span className="font-bold text-orange-600">+{expressFee} HTG</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Vos articles sont expédiés immédiatement de chaque boutique séparément.</p>
                        </div>
                      </label>
                    )}

                    {hasDelmasShop && (
                      <label className={`flex items-start space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${deliveryOption === 'pickup_delimart' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                        <RadioGroupItem value="pickup_delimart" id="pickup_delimart" className="mt-1" />
                        <div className="flex-1">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-800 flex items-center gap-1"><MapPin className="w-3 h-3"/> Retrait à Delimart (Delmas 32)</span>
                            <span className="font-bold text-green-600">GRATUIT</span>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Passez récupérer votre commande directement au point de retrait sans frais.</p>
                        </div>
                      </label>
                    )}
                  </RadioGroup>
                </div>
              )}

              <div className="bg-white rounded-xl p-4 mt-6 space-y-2 shadow-sm border border-slate-100">
                <div className="flex justify-between text-slate-600 text-sm">
                  <span>Sous-total</span>
                  <span className="font-medium">{subtotal} HTG</span>
                </div>
                <div className="flex justify-between items-center text-slate-600 text-sm">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>
                      Livraison {deliveryOption === 'pickup_delimart' ? '(Retrait)' : (shopCount > 1 ? (deliveryOption === 'express' ? '(Express)' : '(Groupée)') : '')}
                    </span>
                  </div>
                  <div className="text-right">
                    {deliveryFee === 0 ? (
                      <div className="font-bold text-green-600">GRATUIT</div>
                    ) : (
                      <div className="font-medium">+{deliveryFee} HTG</div>
                    )}
                  </div>
                </div>
                {pendingBalance > 0 && (
                  <div className="flex justify-between items-center text-red-600 text-sm font-medium pt-1">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Balance due (Annulation)</span>
                    </div>
                    <span>+{pendingBalance} HTG</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-xl pt-3 border-t mt-3 text-slate-800">
                  <span>Total</span>
                  <span className="text-orange-500">{baseTotal} HTG</span>
                </div>
              </div>

              <Button
                className="w-full mt-6 bg-orange-500 hover:bg-orange-600 h-14 text-lg font-bold shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
                onClick={() => {
                  trackInitiateCheckout(cartItems, baseTotal);
                  setStep('checkout');
                }}
              >
                Passer à la caisse
              </Button>
            </motion.div>
          )}

          {step === 'checkout' && (
            <motion.div
              key="checkout"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold mb-4 text-slate-800">Mode de paiement</h3>
                <RadioGroup value={paymentSplit} onValueChange={setPaymentSplit} className="space-y-3">
                  <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentSplit === 'full' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <RadioGroupItem value="full" id="full" />
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">Paiement complet (100%)</div>
                      <div className="text-xs text-slate-500">Payez {baseTotal.toLocaleString()} HTG maintenant</div>
                    </div>
                  </label>
                  <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentSplit === 'split' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <RadioGroupItem value="split" id="split" />
                    <div className="flex-1">
                      <div className="font-bold text-slate-800">Paiement fractionné (50/50)</div>
                      <div className="text-xs text-slate-500">Payez {(baseTotal / 2).toLocaleString()} HTG maintenant, le reste à la livraison</div>
                    </div>
                  </label>
                </RadioGroup>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold mb-4 text-slate-800">Méthode de paiement</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'moncash' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <RadioGroupItem value="moncash" id="moncash" />
                    <Wallet className="w-6 h-6 text-orange-500" />
                    <div className="flex-1 flex justify-between items-center">
                      <span className="font-bold text-slate-800">MonCash</span>
                      <span className="text-[10px] uppercase tracking-wider font-bold bg-orange-500 text-white px-2 py-0.5 rounded-full">Recommandé</span>
                    </div>
                  </label>
                  <label className={`flex items-center space-x-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${paymentMethod === 'card' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                    <RadioGroupItem value="card" id="card" />
                    <CreditCard className="w-6 h-6 text-blue-600" />
                    <span className="font-bold text-slate-800">Carte de crédit/débit</span>
                  </label>
                </RadioGroup>
              </div>

              {deliveryOption !== 'pickup_delimart' && (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                  <h3 className="font-bold mb-1 text-slate-800">Adresse de livraison</h3>
                  <p className="text-slate-600 font-medium">{user.address || 'Non définie'}</p>
                  <p className="text-slate-400 text-sm">{user.region}</p>
                </div>
              )}

              {deliveryOption === 'pickup_delimart' && (
                <div className="bg-green-50 rounded-xl p-4 shadow-sm border border-green-200">
                  <h3 className="font-bold mb-1 text-green-800 flex items-center gap-2"><MapPin className="w-4 h-4"/> Point de retrait</h3>
                  <p className="text-green-700 font-medium">Delimart, Delmas 32</p>
                  <p className="text-green-600 text-sm mt-1">Vous recevrez un message quand votre commande sera prête.</p>
                </div>
              )}

              {paymentMethod === 'card' && (
                <SquarePaymentForm
                  amount={total}
                  onSuccess={(token) => { setSquareToken(token); toast.success('Carte validée'); }}
                  onError={(error) => { setSquareToken(null); toast.error(error); }}
                />
              )}

              <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-100">
                <h3 className="font-bold mb-3 text-slate-800">Instructions spéciales</h3>
                <Textarea
                  placeholder={deliveryOption === 'pickup_delimart' ? "Ex: C'est mon frère qui viendra récupérer le colis..." : "Ex: Sonnez à la porte, laissez à l'accueil..."}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 200))}
                  className="min-h-[80px] bg-slate-50 border-slate-200"
                  maxLength={200}
                />
              </div>

              <div className="bg-slate-800 rounded-xl p-5 text-white shadow-lg">
                <h3 className="font-bold text-slate-300 mb-4 uppercase tracking-wider text-sm">Facture finale</h3>
                
                <div className="space-y-2 mb-4 text-sm text-slate-300">
                  <div className="flex justify-between">
                    <span>Sous-total articles</span>
                    <span>{subtotal} HTG</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Livraison</span>
                    <span>{deliveryFee === 0 ? 'GRATUIT' : `${deliveryFee} HTG`}</span>
                  </div>
                </div>

                <div className="border-t border-slate-600 pt-4 mt-4">
                  {paymentSplit === 'split' ? (
                    <div>
                      <div className="flex justify-between font-black text-2xl text-orange-400 mb-1">
                        <span>À Payer (50%)</span>
                        <span>{(baseTotal / 2).toLocaleString()} HTG</span>
                      </div>
                      <div className="text-right text-xs text-slate-400">
                        Reste {(baseTotal / 2).toLocaleString()} HTG {deliveryOption === 'pickup_delimart' ? 'au retrait' : 'à la livraison'}
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between font-black text-2xl text-orange-400">
                      <span>Total à Payer</span>
                      <span>{baseTotal} HTG</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="h-14 px-6 bg-white border-slate-300 text-slate-700 font-bold" onClick={() => setStep('cart')}>
                  Retour
                </Button>
                <Button
                  className="flex-1 bg-orange-500 hover:bg-orange-600 h-14 text-lg font-bold shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
                  onClick={(e) => {
                    e.preventDefault();
                    createOrderMutation.mutate();
                  }}
                  disabled={createOrderMutation.isPending || redirectingToMoncash || (paymentMethod === 'card' && !squareToken)}
                >
                  {createOrderMutation.isPending ? 'Sécurisation...' : 'Payer maintenant'}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'confirmed' && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-12"
            >
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <svg className="w-12 h-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-3xl font-black text-slate-800 mb-2">Paiement Réussi !</h2>
              <p className="text-slate-500 font-medium mb-8">N° de commande : {orderNumber}</p>

              <div className="bg-orange-50 rounded-2xl p-6 mb-8 border border-orange-100 shadow-sm">
                <p className="text-sm font-bold text-orange-800 uppercase tracking-wider mb-2">Code de Sécurité</p>
                <p className="text-5xl font-black text-orange-500 tracking-[0.2em]">{confirmCode}</p>
                <p className="text-sm text-orange-700 mt-3 font-medium">Ne partagez ce code qu'avec le livreur Rapido Presto.</p>
              </div>

              <div className="flex gap-3 max-w-sm mx-auto">
                <Link to={createPageUrl('Orders')} className="flex-1">
                  <Button variant="outline" className="w-full h-12 font-bold text-slate-700">
                    Suivre
                  </Button>
                </Link>
                <Link to={createPageUrl('Home')} className="flex-1">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600 h-12 font-bold shadow-lg shadow-orange-500/25">
                    Terminer
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}