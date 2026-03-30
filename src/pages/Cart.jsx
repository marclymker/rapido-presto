import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Clock, AlertTriangle } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { getHaitiTime } from '@/components/utils/dateFormat';
import SquarePaymentForm from '@/components/payment/SquarePaymentForm';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';

function calculateDeliveryFee(clientCommune, shopCommune) {
  const hour = getHaitiTime().getHours();
  const sameCommune = clientCommune === shopCommune;
  
  if (hour >= 8 && hour < 11) {
    return sameCommune ? 300 : 500;
  } else if (hour >= 12 && hour < 15) {
    return sameCommune ? 400 : 750;
  } else if (hour >= 16 && hour < 21) {
    return sameCommune ? 300 : 500;
  } else if (hour >= 21 && hour < 23) {
    return sameCommune ? 500 : 750;
  }
  return sameCommune ? 400 : 600;
}

function generateConfirmationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export default function Cart() {
  const { trackInitiateCheckout, trackPurchase } = useActivityTracker();
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('cart');
  const [paymentMethod, setPaymentMethod] = useState('moncash');
  const [paymentSplit, setPaymentSplit] = useState('full');
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

  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }) => {
      if (quantity <= 0) {
        return base44.entities.CartItem.delete(id);
      }
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

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      // SÉCURITÉ: Valider les prix côté serveur AVANT de créer la commande
      const cartItemIds = cartItems.map(item => item.id);
      const priceValidation = await base44.functions.invoke('validateOrderPrice', {
        cartItemIds,
        paymentSplit
      });

      if (!priceValidation.data?.success) {
        throw new Error(priceValidation.data?.error || 'Validation des prix échouée');
      }

      const { validation } = priceValidation.data;
      const { itemsByShop, finalTotal: totalAmount } = validation;
      const shopIds = Object.keys(itemsByShop);

      // Si Square, traiter le paiement par carte
      if (paymentMethod === 'card') {
        if (!squareToken) {
          throw new Error('Token de paiement manquant');
        }

        try {
          const createdOrders = [];
          for (const shopId of shopIds) {
            // Utiliser les prix VALIDÉS côté serveur
            const validatedItems = itemsByShop[shopId].items;
            const shopSubtotal = validatedItems.reduce((sum, item) => sum + item.verified_total, 0);
            const orderNum = 'RP' + Date.now().toString().slice(-6) + '-' + shopId.slice(-4);
            const code = generateConfirmationCode();

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
                quantity: item.quantity,
                unit_price: item.verified_price + item.verified_customization_price,
                total: item.verified_total,
                customization: item.customization
              })),
              subtotal: shopSubtotal,
              delivery_fee: validation.deliveryFee / shopIds.length,
              total: shopSubtotal + (validation.deliveryFee / shopIds.length),
              payment_method: 'card',
              payment_split: paymentSplit,
              status: 'pending',
              payment_status: 'pending',
              confirmation_code: code
            });

            createdOrders.push({ orderId: order.id, orderNum, code });
          }

          const paymentResponse = await base44.functions.invoke('squarePayment', {
            sourceId: squareToken,
            amount: totalAmount,
            orderId: createdOrders[0].orderNum
          });

          if (!paymentResponse.data.success) {
            throw new Error('Paiement refusé');
          }

          for (const order of createdOrders) {
            await base44.entities.Order.update(order.orderId, {
              payment_status: 'paid'
            });

            await base44.functions.invoke('sendOrderNotification', {
              orderId: order.orderId,
              status: 'pending'
            }).catch(err => console.error('Notification error:', err));

            await base44.functions.invoke('sendWhatsAppOrderNotification', {
              orderId: order.orderId
            }).catch(err => console.error('WhatsApp error:', err));
          }

          await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));

          return {
            orderNum: createdOrders[0].orderNum,
            code: createdOrders[0].code,
            allOrders: createdOrders
          };
        } catch (error) {
          console.error('Square payment error:', error);
          throw new Error(error.message || 'Erreur lors du paiement par carte');
        }
      }

      // Si MonCash
      if (paymentMethod === 'moncash') {
        console.log('🔵 DÉBUT PAIEMENT MONCASH');
        const orderNum = 'RP' + Date.now().toString().slice(-6);
        
        const createdOrders = [];
        for (const shopId of shopIds) {
          // Utiliser les prix VALIDÉS côté serveur
          const validatedItems = itemsByShop[shopId].items;
          const shopSubtotal = validatedItems.reduce((sum, item) => sum + item.verified_total, 0);
          const code = generateConfirmationCode();

          const order = await base44.entities.Order.create({
            order_number: `${orderNum}-${shopId.slice(-4)}`,
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
              quantity: item.quantity,
              unit_price: item.verified_price + item.verified_customization_price,
              total: item.verified_total,
              customization: item.customization
            })),
            subtotal: shopSubtotal,
            delivery_fee: validation.deliveryFee / shopIds.length,
            total: shopSubtotal + (validation.deliveryFee / shopIds.length),
            payment_method: 'moncash',
            payment_split: paymentSplit,
            status: 'pending',
            payment_status: 'pending',
            confirmation_code: code,
            special_instructions: specialInstructions
          });

          createdOrders.push({ orderId: order.id, code, orderNum: order.order_number });
        }

        console.log('✅ Commandes créées:', createdOrders.length);

        await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));
        console.log('✅ Panier vidé');

        console.log('📞 Appel API MonCash avec montant:', totalAmount, 'HTG');
        
        const response = await base44.functions.invoke('moncashCreatePayment', {
          orderId: orderNum,
          amount: totalAmount,
          description: `Commande ${orderNum}`
        });

        console.log('📥 Réponse MonCash:', response);

        const paymentData = response.data;
        console.log('📦 Payment Data:', paymentData);

        if (!paymentData?.success) {
          console.error('❌ Erreur MonCash:', paymentData?.error);
          throw new Error(paymentData?.error || 'Erreur MonCash: Échec de création du paiement');
        }

        if (!paymentData?.paymentUrl) {
          console.error('❌ URL de paiement manquante:', paymentData);
          throw new Error('URL de redirection MonCash manquante');
        }

        console.log('✅ URL MonCash reçue:', paymentData.paymentUrl);

        for (const order of createdOrders) {
          await base44.entities.Order.update(order.orderId, {
            moncash_transaction_id: paymentData.transactionId
          });
        }

        console.log('✅ Transaction ID enregistrée');

        // Retourner les données pour déclencher onSuccess PUIS rediriger
        return {
          redirectToMoncash: true,
          paymentUrl: paymentData.paymentUrl,
          orderNum: createdOrders[0].orderNum
        };
      }
    },
    onSuccess: (data) => {
      console.log('✅ Mutation success:', data);
      
      if (!data) return;
      
      // MonCash: redirection immédiate
      if (data.redirectToMoncash && data.paymentUrl) {
        console.log('🚀 REDIRECTION MonCash vers:', data.paymentUrl);
        window.location.href = data.paymentUrl;
        return;
      }
      
      // Square: afficher confirmation + tracking Purchase
      queryClient.invalidateQueries(['cart']);
      setOrderNumber(data.orderNum);
      setConfirmCode(data.code);
      setStep('confirmed');
      toast.success('Commande confirmée!');
      // Track achat GA4 + Meta Pixel (Advantage+ catalog)
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
      // Pixel direct pour garantir le Purchase sur la page panier
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
    onError: (error) => {
      console.error('❌ Erreur mutation:', error);
      toast.error(error.message || 'Erreur lors de la création de la commande');
    }
  });

  if (!user || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const itemsByShop = cartItems.reduce((acc, item) => {
    if (!acc[item.shop_id]) {
      acc[item.shop_id] = [];
    }
    acc[item.shop_id].push(item);
    return acc;
  }, {});

  const subtotal = cartItems.reduce((sum, item) => {
    const itemTotal = (item.unit_price + (item.total_customization_price || 0)) * item.quantity;
    return sum + itemTotal;
  }, 0);

  let deliveryFee = 0;
  
  // Livraison gratuite si sous-total >= 3000 HTG
  if (subtotal < 3000) {
    Object.keys(itemsByShop).forEach(shopId => {
      const shopRegion = itemsByShop[shopId][0].shop_region;
      deliveryFee += calculateDeliveryFee(user.region, shopRegion);
    });
  }

  const pendingBalance = user?.pending_balance || 0;
  const baseTotal = subtotal + deliveryFee + pendingBalance;
  const total = paymentSplit === 'split' ? baseTotal / 2 : baseTotal;
  const shopCount = Object.keys(itemsByShop).length;

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
                  <p className="font-medium">📦 Commande multi-boutique</p>
                  <p className="text-xs mt-1">
                    Votre panier contient des articles de {shopCount} boutiques différentes.
                    Les délais de livraison peuvent varier.
                  </p>
                </div>
              )}

              <div className="space-y-3">
                {cartItems.map(item => (
                  <div key={item.id} className="bg-white rounded-xl p-4 flex gap-4">
                    <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                      {item.product_image ? (
                        <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xl">📦</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-slate-800 truncate">{item.product_name}</h3>
                      <p className="text-sm text-slate-500">{item.shop_name}</p>
                      {item.customization && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {item.customization.color && (
                            <span className="inline-flex items-center gap-1 text-xs bg-slate-100 rounded-full px-2 py-0.5">
                              <div className="w-3 h-3 rounded-full border" style={{ backgroundColor: item.customization.color.hex }} />
                              {item.customization.color.name}
                            </span>
                          )}
                          {item.customization.size && (
                            <span className="text-xs bg-slate-100 rounded-full px-2 py-0.5">
                              Taille: {item.customization.size.name}
                            </span>
                          )}
                          {item.customization.text && (
                            <span className="text-xs bg-slate-100 rounded-full px-2 py-0.5">
                              "{item.customization.text}"
                            </span>
                          )}
                          {item.customization.arrangement && (
                            <span className="text-xs bg-slate-100 rounded-full px-2 py-0.5">
                              {item.customization.arrangement.name}
                            </span>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between mt-2">
                        <div>
                          <span className="font-semibold text-orange-500">
                            {(item.unit_price + (item.total_customization_price || 0)) * item.quantity} HTG
                          </span>
                          {item.total_customization_price > 0 && (
                            <span className="text-xs text-slate-500 ml-1">
                              (+{item.total_customization_price * item.quantity} HTG)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 })}
                          >
                            <Minus className="w-4 h-4" />
                          </Button>
                          <span className="w-8 text-center">{item.quantity}</span>
                          <Button
                            size="icon"
                            variant="outline"
                            className="h-8 w-8"
                            onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}
                          >
                            <Plus className="w-4 h-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-red-500"
                            onClick={() => deleteItemMutation.mutate(item.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Link to={createPageUrl('Home')}>
                <Button variant="outline" className="w-full mt-4">
                  Ajouter plus d'articles
                </Button>
              </Link>

              <div className="bg-white rounded-xl p-4 mt-6 space-y-2">
                <div className="flex justify-between text-slate-600">
                  <span>Sous-total</span>
                  <span>{subtotal} HTG</span>
                </div>
                <div className="flex justify-between items-center text-slate-600">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-500" />
                    <span>Frais de livraison {shopCount > 1 ? `(${shopCount} boutiques)` : ''}</span>
                  </div>
                  <div className="text-right">
                    {deliveryFee === 0 && subtotal >= 3000 ? (
                      <div className="font-medium text-green-600">GRATUIT ✓</div>
                    ) : (
                      <div className="font-medium">{deliveryFee} HTG</div>
                    )}
                    <div className="text-xs text-slate-400">Livraison: 20-30 min</div>
                  </div>
                </div>
                {pendingBalance > 0 && (
                  <div className="flex justify-between items-center text-orange-600 font-medium">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Balance due (annulation)</span>
                    </div>
                    <span>+{pendingBalance} HTG</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total</span>
                  <span className="text-orange-500">{baseTotal} HTG</span>
                </div>
              </div>

              <Button
                className="w-full mt-4 bg-orange-500 hover:bg-orange-600 h-12 text-lg"
                onClick={() => {
                  trackInitiateCheckout(cartItems, baseTotal);
                  setStep('checkout');
                }}
              >
                Confirmer la commande
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
              {/* Payment Split Option */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold mb-4">Mode de paiement</h3>
                <RadioGroup value={paymentSplit} onValueChange={setPaymentSplit} className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50">
                    <RadioGroupItem value="full" id="full" />
                    <Label htmlFor="full" className="flex items-center gap-3 cursor-pointer flex-1">
                      <div className="flex-1">
                        <div className="font-medium">Paiement complet (100%)</div>
                        <div className="text-xs text-slate-500">Payez {baseTotal.toLocaleString()} HTG maintenant</div>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50">
                    <RadioGroupItem value="split" id="split" />
                    <Label htmlFor="split" className="flex items-center gap-3 cursor-pointer flex-1">
                      <div className="flex-1">
                        <div className="font-medium">Paiement fractionné (50% / 50%)</div>
                        <div className="text-xs text-slate-500">Payez {(baseTotal / 2).toLocaleString()} HTG maintenant, le reste à la livraison</div>
                      </div>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Payment Method */}
              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold mb-4">Méthode de paiement</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  <div className="flex items-center space-x-3 p-3 rounded-lg border-2 border-orange-500 bg-orange-50 hover:bg-orange-100">
                    <RadioGroupItem value="moncash" id="moncash" />
                    <Label htmlFor="moncash" className="flex items-center gap-3 cursor-pointer flex-1">
                      <Wallet className="w-5 h-5 text-orange-600" />
                      <div className="flex-1">
                        <span className="font-medium">Moncash</span>
                        <span className="ml-2 text-xs bg-orange-600 text-white px-2 py-0.5 rounded-full">Recommandé</span>
                      </div>
                    </Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-slate-50">
                    <RadioGroupItem value="card" id="card" />
                    <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                      <CreditCard className="w-5 h-5 text-blue-600" />
                      <span>Carte de débit/crédit (Square)</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold mb-3">Adresse de livraison</h3>
                <p className="text-slate-600">{user.address || 'Non définie'}</p>
                <p className="text-slate-500 text-sm">{user.region}</p>
              </div>

              {paymentMethod === 'card' && (
                <SquarePaymentForm
                  amount={total}
                  onSuccess={(token) => {
                    setSquareToken(token);
                    toast.success('Carte validée');
                  }}
                  onError={(error) => {
                    setSquareToken(null);
                    toast.error(error);
                  }}
                />
              )}

              <div className="bg-white rounded-xl p-4">
                <h3 className="font-semibold mb-3">Instructions spéciales (optionnel)</h3>
                <Textarea
                  placeholder="Ex: Sonnez à la porte, pas d'interphone..."
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 200))}
                  className="min-h-[80px]"
                  maxLength={200}
                />
                <p className="text-xs text-slate-400 mt-1">{specialInstructions.length}/200 caractères</p>
              </div>

              <div className="bg-white rounded-xl p-4 space-y-2">
                <h3 className="font-semibold mb-3">Récapitulatif</h3>
                {Object.keys(itemsByShop).map(shopId => {
                  const shopItems = itemsByShop[shopId];
                  return (
                    <div key={shopId} className="mb-3 pb-3 border-b">
                      <p className="text-xs font-semibold text-slate-500 mb-2">{shopItems[0].shop_name}</p>
                      {shopItems.map(item => (
                        <div key={item.id} className="text-sm text-slate-600">
                          <div className="flex justify-between">
                            <span>{item.quantity}x {item.product_name}</span>
                            <span>{(item.unit_price + (item.total_customization_price || 0)) * item.quantity} HTG</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Sous-total</span>
                    <span>{subtotal} HTG</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Livraison {shopCount > 1 ? `(${shopCount} boutiques)` : ''}</span>
                    <span>{deliveryFee} HTG</span>
                  </div>
                  {pendingBalance > 0 && (
                    <div className="flex justify-between text-orange-600 font-medium">
                      <span>Balance due (annulation)</span>
                      <span>+{pendingBalance} HTG</span>
                    </div>
                  )}

                  <div className="flex justify-between font-bold text-lg pt-2 border-t mt-2">
                    <span>Total général</span>
                    <span className="text-slate-600">{baseTotal} HTG</span>
                  </div>

                  {paymentSplit === 'split' ? (
                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-200 mt-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-orange-800">À payer maintenant (50%)</span>
                        <span className="text-xl font-bold text-orange-600">{(baseTotal / 2).toLocaleString()} HTG</span>
                      </div>
                      <div className="text-xs text-orange-600 mt-1">
                        Reste {(baseTotal / 2).toLocaleString()} HTG à payer à la livraison
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between font-bold text-xl text-orange-500 pt-2 border-t mt-2">
                      <span>À payer maintenant</span>
                      <span>{baseTotal} HTG</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setStep('cart')}
                >
                  Retour
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-orange-500 hover:bg-orange-600"
                  onClick={(e) => {
                    e.preventDefault();
                    console.log('🔘 Clic sur bouton confirmation');
                    console.log('💳 Méthode de paiement:', paymentMethod);
                    console.log('💰 Montant total:', total, 'HTG');
                    createOrderMutation.mutate();
                  }}
                  disabled={
                    createOrderMutation.isPending ||
                    redirectingToMoncash ||
                    (paymentMethod === 'card' && !squareToken)
                  }
                >
                  {createOrderMutation.isPending ? (
                    paymentMethod === 'moncash' ? 'Redirection MonCash...' : 'Traitement...'
                  ) : (
                    'Confirmer le paiement'
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === 'confirmed' && (
            <motion.div
              key="confirmed"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-center py-8"
            >
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-slate-800 mb-2">Commande Confirmée!</h2>
              <p className="text-slate-500 mb-6">Numéro: {orderNumber}</p>

              <div className="bg-orange-50 rounded-2xl p-6 mb-6">
                <p className="text-sm text-orange-700 mb-2">Code de confirmation</p>
                <p className="text-4xl font-bold text-orange-600 tracking-widest">{confirmCode}</p>
                <p className="text-xs text-orange-600 mt-2">Donnez ce code au livreur</p>
              </div>

              <div className="flex gap-3">
                <Link to={createPageUrl('Orders')} className="flex-1">
                  <Button variant="outline" className="w-full">
                    Mes Commandes
                  </Button>
                </Link>
                <Link to={createPageUrl('Home')} className="flex-1">
                  <Button className="w-full bg-orange-500 hover:bg-orange-600">
                    Continuer
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