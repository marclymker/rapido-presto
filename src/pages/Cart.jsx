import React, { useState, useEffect } from 'react';
import { firebase } from '@/api/firebaseClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Plus, Minus, CreditCard, Wallet, AlertTriangle, MapPin, Lock } from 'lucide-react';
import { useAuth } from '@/components/auth/useAuth';
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import SquarePaymentForm from '@/components/payment/SquarePaymentForm';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';

// ---------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH : GÉOGRAPHIE & LOGISTIQUE
// ---------------------------------------------------------------------------
const normalizeForRegion = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

const REGION_DATA = {
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
  'carrefour': { index: 9, section: 2 },
  'gressier': { index: 10, section: 2 },
  'leogane': { index: 11, section: 2 },
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
  if (!clientRegionName || !shopRegionName) return 495;

  const target = REGION_DATA[normalizeForRegion(clientRegionName)];
  const shop = REGION_DATA[normalizeForRegion(shopRegionName)];

  if (!target || !shop) return 495;

  const isSameRegion = target.index === shop.index;
  let diff = Math.abs(target.index - shop.index);
  let penalty = target.section !== shop.section ? 50 : 0;
  let score = diff + penalty;

  const isHeavyLoad = shopItems.some(item => CATEGORY_GROUP_HEAVY.includes(item.category));

  let rawFee = 0;
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
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('step') === 'checkout' ? 'checkout' : 'cart';
  });
  const [paymentMethod, setPaymentMethod] = useState('moncash');
  const [paymentSplit, setPaymentSplit] = useState('full');
  const [deliveryOption, setDeliveryOption] = useState('standard');
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [redirectingToMoncash, setRedirectingToMoncash] = useState(false);
  const [squareToken, setSquareToken] = useState(null);

  const queryClient = useQueryClient();

  const { data: cartItems = [], isLoading: cartLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => firebase.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id,
    refetchInterval: 60000,
    refetchIntervalInBackground: true
  });

  // Protection asymétrique de session
  useEffect(() => {
    if (!authLoading && !user) {
      navigate(createPageUrl('Home'));
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (step === 'checkout' && cartItems.length === 0 && !cartLoading) {
      setStep('cart');
    }
  }, [step, cartItems, cartLoading]);

  const updateQuantityMutation = useMutation({
    mutationFn: ({ id, quantity }) => {
      if (quantity <= 0) return firebase.entities.CartItem.delete(id);
      return firebase.entities.CartItem.update(id, { quantity });
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
    mutationFn: (id) => firebase.entities.CartItem.delete(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries(['cart', user?.id]);
      const previous = queryClient.getQueryData(['cart', user?.id]);
      queryClient.setQueryData(['cart', user?.id], (old = []) => old.filter(i => i.id !== id));
      return { previous };
    },
    onError: (_, __, ctx) => { if (ctx?.previous) queryClient.setQueryData(['cart', user?.id], ctx.previous); },
    onSettled: () => queryClient.invalidateQueries(['cart'])
  });

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

  useEffect(() => {
    if (!hasDelmasShop && deliveryOption === 'pickup_delimart') {
      setDeliveryOption('standard');
    }
  }, [hasDelmasShop, deliveryOption]);

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      const cartItemIds = cartItems.map(item => item.id);
      const priceValidation = await firebase.functions.invoke('validateOrderPrice', {
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

          const order = await firebase.entities.Order.create({
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

          const paymentResponse = await firebase.functions.invoke('squarePayment', {
            sourceId: squareToken,
            amount: totalAmount,
            orderId: createdOrders[0].orderNum
          });

          if (!paymentResponse.data.success) throw new Error('Paiement refusé');

          for (const order of createdOrders) {
            await firebase.functions.invoke('sendOrderNotification', { orderId: order.orderId, status: 'pending' }).catch(() => {});
            await firebase.functions.invoke('sendWhatsAppOrderNotification', { orderId: order.orderId }).catch(() => {});
          }

          await Promise.all(cartItems.map(item => firebase.entities.CartItem.delete(item.id)));
          return { orderNum: createdOrders[0].orderNum, code: createdOrders[0].code };
        } catch (error) {
          throw new Error(error.message || 'Erreur lors du paiement par carte');
        }
      }

      if (paymentMethod === 'moncash') {
        const { createdOrders, orderNumBase } = await processOrders('moncash');
        // Attention : Suppression des articles AVANT l'aboutissement de l'URL MonCash.
        await Promise.all(cartItems.map(item => firebase.entities.CartItem.delete(item.id)));

        const response = await firebase.functions.invoke('moncashCreatePayment', {
          orderId: orderNumBase,
          amount: totalAmount,
          description: `Commande ${orderNumBase}`
        });

        const paymentData = response.data;
        if (!paymentData?.success || !paymentData?.paymentUrl) {
          throw new Error(paymentData?.error || 'Erreur MonCash: URL de redirection manquante');
        }

        for (const order of createdOrders) {
          await firebase.entities.Order.update(order.orderId, {
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

  // La "Loading Gate" : Empêche tout rendu tant que les états critiques ne sont pas résolus.
  if (authLoading || cartLoading || !user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const Radio = ({ on }) => (
    <span className={`w-[22px] h-[22px] rounded-full border-2 flex items-center justify-center shrink-0 ${on ? 'border-[#3897F0]' : 'border-[#DBDBDB]'}`}>
      {on && <span className="w-3 h-3 rounded-full bg-[#3897F0]" />}
    </span>
  );
  const Row = ({ label, value, bold }) => (
    <div className={`flex justify-between text-[14px] ${bold ? 'font-bold text-[#262626] pt-2' : 'text-[#8E8E8E]'}`}><span>{label}</span><span>{value}</span></div>
  );
  const Option = ({ on, onClick, title, sub, right }) => (
    <button type="button" onClick={onClick} className="w-full flex items-center gap-3 py-3 text-left border-b border-[#EFEFEF] last:border-0">
      <Radio on={on} />
      <span className="flex-1 min-w-0"><span className="block text-[14px] text-[#262626]">{title}</span>{sub && <span className="block text-[12px] text-[#8E8E8E]">{sub}</span>}</span>
      {right && <span className="text-[14px] text-[#8E8E8E]">{right}</span>}
    </button>
  );
  const placeOrder = () => {
    try { trackInitiateCheckout(cartItems, baseTotal); } catch (err) { console.error('Tracking Error:', err); }
    createOrderMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-white text-[#262626]">
      <header className="bg-white sticky top-0 z-40 border-b border-[#DBDBDB]" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="h-11 px-4 grid grid-cols-3 items-center">
          {step !== 'confirmed'
            ? <Link to={createPageUrl('Home')} className="text-[14px] justify-self-start">Annuler</Link>
            : <span />}
          <h1 className="text-[16px] font-semibold flex items-center justify-center gap-1.5">
            {step !== 'confirmed' && <Lock className="w-3.5 h-3.5" />}{step === 'confirmed' ? 'Commande' : 'Paiement'}
          </h1>
          <span />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 pb-10">
        {cartItems.length === 0 && step !== 'confirmed' && (
          <div className="text-center py-16">
            <p className="text-[#8E8E8E] mb-4 text-sm">Votre panier est vide</p>
            <Link to={createPageUrl('Home')} className="text-[14px] font-semibold" style={{ color: '#3897F0' }}>Continuer vos achats</Link>
          </div>
        )}

        {cartItems.length > 0 && step !== 'confirmed' && (
          <>
            {cartItems.map(item => (
              <div key={item.id} className="flex gap-3 py-4 border-b border-[#EFEFEF]">
                <div className="w-[60px] h-[75px] bg-[#EFEFEF] overflow-hidden shrink-0">
                  {item.product_image && <img src={item.product_image} alt="" className="w-full h-full object-cover" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold truncate">{item.product_name}</p>
                  {(item.customization?.color || item.customization?.size) && (
                    <p className="text-[12px] text-[#8E8E8E]">{[item.customization.color?.name, item.customization.size?.name].filter(Boolean).join(' · ')}</p>
                  )}
                  <p className="text-[12px] text-[#8E8E8E] truncate">Vendu et expédié par {item.shop_name}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[14px]">{((item.unit_price + (item.total_customization_price || 0)) * item.quantity).toLocaleString()} HTG</span>
                    <span className="flex items-center gap-3 border border-[#DBDBDB] rounded-md px-2 py-0.5">
                      <button type="button" aria-label="Moins" onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 })}><Minus className="w-3.5 h-3.5" /></button>
                      <span className="text-[13px] w-4 text-center">{item.quantity}</span>
                      <button type="button" aria-label="Plus" onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}><Plus className="w-3.5 h-3.5" /></button>
                    </span>
                  </div>
                </div>
              </div>
            ))}

            <div className="py-4 space-y-1.5 border-b border-[#EFEFEF]">
              <Row label="Sous-total" value={`${subtotal.toLocaleString()} HTG`} />
              <Row label="Livraison" value={deliveryFee === 0 ? 'Gratuit' : `${deliveryFee.toLocaleString()} HTG`} />
              {pendingBalance > 0 && (
                <div className="flex justify-between text-[14px] text-red-600"><span className="flex items-center gap-1.5"><AlertTriangle className="w-4 h-4" />Solde dû (annulation)</span><span>{pendingBalance} HTG</span></div>
              )}
              <Row bold label="Total" value={`${baseTotal.toLocaleString()} HTG`} />
            </div>

            <section className="pt-4">
              <h2 className="text-[16px] font-bold mb-1">Livraison</h2>
              <Option on={deliveryOption === 'standard'} onClick={() => setDeliveryOption('standard')} title="Standard" sub="24 h - 48 h" right={`${standardFee.toLocaleString()} HTG`} />
              {shopCount > 1 && <Option on={deliveryOption === 'express'} onClick={() => setDeliveryOption('express')} title="Express" sub="12 h - 24 h, chaque boutique expédie séparément" right={`${expressFee.toLocaleString()} HTG`} />}
              {hasDelmasShop && <Option on={deliveryOption === 'pickup_delimart'} onClick={() => setDeliveryOption('pickup_delimart')} title="Retrait à Delimart (Delmas 32)" sub="Récupérez votre commande sans frais" right="Gratuit" />}
              <div className="py-3 text-[13px]">
                <p className="text-[#8E8E8E] flex items-center gap-1">{deliveryOption === 'pickup_delimart' && <MapPin className="w-3.5 h-3.5" />}{deliveryOption === 'pickup_delimart' ? 'Point de retrait' : 'Adresse de livraison'}</p>
                <p>{deliveryOption === 'pickup_delimart' ? 'Delimart, Delmas 32' : `${user?.address || 'Non définie'}${user?.region ? `, ${user.region}` : ''}`}</p>
              </div>
            </section>

            <section className="pt-2">
              <h2 className="text-[16px] font-bold mb-1">Paiement</h2>
              <Option on={paymentMethod === 'moncash'} onClick={() => setPaymentMethod('moncash')} title="MonCash" right={<Wallet className="w-5 h-5" />} />
              <Option on={paymentMethod === 'card'} onClick={() => setPaymentMethod('card')} title="Carte de crédit / débit" right={<CreditCard className="w-5 h-5" />} />
              {paymentMethod === 'card' && (
                <div className="py-3">
                  <SquarePaymentForm amount={total} onSuccess={(token) => { setSquareToken(token); toast.success('Carte validée'); }} onError={(error) => { setSquareToken(null); toast.error(error); }} />
                </div>
              )}
              <Option on={paymentSplit === 'full'} onClick={() => setPaymentSplit('full')} title="Payer 100 % maintenant" sub={`${baseTotal.toLocaleString()} HTG`} />
              <Option on={paymentSplit === 'split'} onClick={() => setPaymentSplit('split')} title="Payer 50 % maintenant" sub={`${(baseTotal / 2).toLocaleString()} HTG maintenant, le reste ${deliveryOption === 'pickup_delimart' ? 'au retrait' : 'à la livraison'}`} />
            </section>

            <Textarea
              placeholder="Instructions pour la livraison (facultatif)"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value.slice(0, 200))}
              className="mt-3 min-h-[64px] text-[14px] border-[#DBDBDB]"
              maxLength={200}
            />

            <button type="button" onClick={placeOrder}
              disabled={createOrderMutation.isPending || redirectingToMoncash || (paymentMethod === 'card' && !squareToken)}
              className="w-full mt-5 h-11 rounded-md text-white text-[14px] font-semibold disabled:opacity-50 active:opacity-80" style={{ backgroundColor: '#3897F0' }}>
              {createOrderMutation.isPending ? 'Sécurisation...' : `Passer la commande · ${total.toLocaleString()} HTG`}
            </button>
            <p className="text-center text-[11px] text-[#8E8E8E] mt-3">En appuyant sur « Passer la commande », vous acceptez les conditions de paiement et de livraison de Rapido Presto.</p>
          </>
        )}

        {step === 'confirmed' && (
          <div className="text-center py-12">
            <div className="w-20 h-20 rounded-full border-2 border-[#262626] flex items-center justify-center mx-auto mb-5">
              <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            </div>
            <h2 className="text-[20px] font-semibold">Commande passée</h2>
            <p className="text-[14px] text-[#8E8E8E] mb-6">N° de commande : {orderNumber}</p>
            <div className="border border-[#DBDBDB] rounded-lg p-5 mb-6">
              <p className="text-[12px] text-[#8E8E8E] mb-1">Code de sécurité</p>
              <p className="text-[36px] font-semibold tracking-[0.2em]">{confirmCode}</p>
              <p className="text-[12px] text-[#8E8E8E] mt-1">Ne partagez ce code qu'avec le livreur.</p>
            </div>
            <Link to={createPageUrl('Orders')} className="block w-full h-11 leading-[44px] rounded-md text-white text-[14px] font-semibold" style={{ backgroundColor: '#3897F0' }}>Suivre ma commande</Link>
            <Link to={createPageUrl('Home')} className="block mt-3 text-[14px] font-semibold">Continuer vos achats</Link>
          </div>
        )}
      </main>
    </div>
  );
}
