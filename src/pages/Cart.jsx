import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Banknote, Clock, AlertTriangle, Copy, Check, Info, ShoppingBag, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { getHaitiTime } from '@/components/utils/dateFormat';
import SquarePaymentForm from '@/components/payment/SquarePaymentForm';

// --- LOGIQUE DES FRAIS (GARDÉE INTACTE) ---
function calculateDeliveryFee(clientCommune, shopCommune) {
  const hour = getHaitiTime().getHours();
  const sameCommune = clientCommune === shopCommune;
  if (hour >= 8 && hour < 11) return sameCommune ? 300 : 500;
  if (hour >= 12 && hour < 15) return sameCommune ? 400 : 750;
  if (hour >= 16 && hour < 21) return sameCommune ? 300 : 500;
  if (hour >= 21 && hour < 23) return sameCommune ? 500 : 750;
  return sameCommune ? 400 : 600;
}

function generateConfirmationCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

function calculateMoncashFee(amount) {
  if (amount <= 10) return 0;
  if (amount <= 100) return 5;
  if (amount <= 250) return 10;
  if (amount <= 500) return 15;
  if (amount <= 1000) return 25;
  if (amount <= 2000) return 45;
  if (amount <= 4000) return 75;
  if (amount <= 7500) return 115;
  if (amount <= 10000) return 145;
  if (amount <= 15000) return 185;
  if (amount <= 20000) return 225;
  if (amount <= 25000) return 270;
  if (amount <= 30000) return 315;
  if (amount <= 40000) return 380;
  if (amount <= 50000) return 450;
  if (amount <= 60000) return 525;
  if (amount <= 75000) return 600;
  return amount * 0.01;
}

function calculateNatcashFee(amount) {
  const feeRanges = [
    { min: 20, max: 99, fee: 5.50 }, { min: 100, max: 249, fee: 11.50 },
    { min: 250, max: 499, fee: 13.50 }, { min: 500, max: 999, fee: 21.00 },
    { min: 1000, max: 1999, fee: 41.00 }, { min: 2000, max: 3999, fee: 68.00 },
    { min: 4000, max: 7999, fee: 97.00 }, { min: 8000, max: 11999, fee: 125.00 },
    { min: 12000, max: 19999, fee: 165.00 }, { min: 20000, max: 40000, fee: 274.00 }
  ];
  for (const range of feeRanges) {
    if (amount >= range.min && amount <= range.max) return range.fee;
  }
  return amount > 40000 ? 274.00 + Math.floor((amount - 40000) / 20000) * 100 : 0;
}

const ACCOUNTS = {
  moncash: { number: "50948690366", name: "Marc lymker JEAN" },
  natcash: { number: "3527-0511", name: "Rebecca Christa Rigaud" }
};

export default function Cart() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('cart'); 
  const [paymentPlan, setPaymentPlan] = useState('FULL'); // 'FULL' ou 'TWO_STEPS'
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [orderNumber, setOrderNumber] = useState('');
  const [confirmCode, setConfirmCode] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [transactionCode, setTransactionCode] = useState('');
  const [copiedState, setCopiedState] = useState({ account: false, amount: false });
  const [squareToken, setSquareToken] = useState(null);
  
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(u => setUser(u)).catch(() => navigate(createPageUrl('Home')));
  }, []);

  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  // --- CORRECTION 2: ARTICLES SIMILAIRES PAR CATÉGORIE ---
  const firstItemCategory = cartItems[0]?.category_id;
  const { data: similarProducts = [] } = useQuery({
    queryKey: ['similar-products', firstItemCategory],
    queryFn: () => base44.entities.Product.filter({ 
        category_id: firstItemCategory,
        id: { $ne: cartItems[0]?.product_id } // Éviter de suggérer le produit déjà présent
    }, { limit: 4 }),
    enabled: !!firstItemCategory
  });

  // --- CALCULS DU PANIER ---
  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price + (item.total_customization_price || 0)) * item.quantity, 0);
  const itemsByShop = cartItems.reduce((acc, item) => {
    if (!acc[item.shop_id]) acc[item.shop_id] = [];
    acc[item.shop_id].push(item);
    return acc;
  }, {});
  
  let deliveryFee = 0;
  Object.keys(itemsByShop).forEach(shopId => {
    deliveryFee += calculateDeliveryFee(user?.region || '', itemsByShop[shopId][0].shop_region);
  });
  
  const baseTotal = subtotal + deliveryFee + (user?.pending_balance || 0);

  // Logique du montant immédiat selon l'option choisie
  const isTwoSteps = paymentPlan === 'TWO_STEPS';
  const amountToPayNow = isTwoSteps ? (baseTotal / 2) : baseTotal;
  const balanceToPayLater = isTwoSteps ? (baseTotal / 2) : 0;

  const transferFee = paymentMethod === 'moncash' ? calculateMoncashFee(amountToPayNow) : 
                     paymentMethod === 'natcash' ? calculateNatcashFee(amountToPayNow) : 0;
  
  const finalAmountToPay = amountToPayNow + transferFee;

  const copyToClipboard = (text, type) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedState(prev => ({ ...prev, [type]: true }));
      setTimeout(() => setCopiedState(prev => ({ ...prev, [type]: false })), 2000);
      toast.success('Copié !');
    });
  };

  const createOrderMutation = useMutation({
    mutationFn: async () => {
      if ((paymentMethod === 'moncash' || paymentMethod === 'natcash') && !transactionCode.trim()) {
        throw new Error('Code de transaction requis');
      }
      if (paymentMethod === 'card' && !squareToken) {
        throw new Error('Veuillez valider votre carte');
      }

      const shopIds = Object.keys(itemsByShop);
      const firstOrderNum = 'RP' + Date.now().toString().slice(-6);

      if (paymentMethod === 'card') {
        const paymentResponse = await base44.functions.invoke('squarePayment', {
          sourceId: squareToken,
          amount: amountToPayNow,
          orderId: firstOrderNum
        });
        if (!paymentResponse.data.success) throw new Error('Paiement par carte refusé');
      }

      for (const shopId of shopIds) {
        const shopItems = itemsByShop[shopId];
        const code = generateConfirmationCode();

        await base44.entities.Order.create({
          order_number: `${firstOrderNum}-${shopId.slice(-4)}`,
          client_id: user.id,
          client_name: user.full_name,
          client_phone: user.phone,
          client_address: user.address || '',
          client_region: user.region,
          shop_id: shopId,
          shop_name: shopItems[0].shop_name,
          items: shopItems.map(item => ({
            product_id: item.product_id,
            name: item.product_name,
            quantity: item.quantity,
            unit_price: item.unit_price + (item.total_customization_price || 0)
          })),
          total: baseTotal,
          amount_paid_now: amountToPayNow,
          pending_balance: balanceToPayLater,
          payment_plan: paymentPlan,
          payment_method: paymentMethod,
          status: (paymentMethod === 'moncash' || paymentMethod === 'natcash') ? 'pending_validation' : 'pending',
          payment_status: isTwoSteps ? 'partially_paid' : (paymentMethod === 'CASH' ? 'pending' : 'paid'),
          confirmation_code: code,
          external_transaction_code: transactionCode.trim(),
          special_instructions: specialInstructions
        });
      }

      await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));
      return { orderNum: firstOrderNum, code: generateConfirmationCode() };
    },
    onSuccess: (data) => {
      setOrderNumber(data.orderNum);
      setConfirmCode(data.code);
      setStep('confirmed');
    }
  });

  return (
    <div className="min-h-screen bg-[#F0F2F2]"> {/* Style Amazon Background */}
      <header className="bg-[#232F3E] text-white p-4 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="text-white p-0 hover:bg-transparent" onClick={() => navigate(-1)}>
              <ArrowLeft />
            </Button>
            <h1 className="text-xl font-bold">RapidPanye</h1>
          </div>
          <div className="text-sm font-medium">Panier ({cartItems.length})</div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-4 md:py-8">
        <AnimatePresence mode="wait">
          {step === 'cart' && (
            <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-4">
                <div className="bg-white p-6 shadow-sm rounded-sm">
                  <h2 className="text-2xl font-bold border-b pb-4 mb-4">Votre panier</h2>
                  {cartItems.map(item => (
                    <div key={item.id} className="flex gap-4 border-b py-4 last:border-0">
                      <div className="w-24 h-24 bg-slate-100 rounded" />
                      <div className="flex-1">
                        <div className="flex justify-between font-bold">
                          <span>{item.product_name}</span>
                          <span>{item.unit_price} HTG</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Vendu par: {item.shop_name}</p>
                        <Button variant="ghost" className="h-auto p-0 text-red-500 text-xs mt-4" onClick={() => base44.entities.CartItem.delete(item.id)}>Supprimer</Button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* ARTICLES SIMILAIRES */}
                {similarProducts.length > 0 && (
                <div className="bg-white p-6 shadow-sm rounded-sm">
                   <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><ShoppingBag className="text-orange-500" size={18}/> Recommandé pour vous</h3>
                   <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {similarProducts.map(prod => (
                        <div key={prod.id} className="group border p-2 rounded hover:border-orange-400 cursor-pointer">
                          <div className="aspect-square bg-slate-50 mb-2 rounded" />
                          <p className="text-xs font-bold line-clamp-1">{prod.name}</p>
                          <p className="text-orange-700 font-bold text-sm">{prod.price} HTG</p>
                          <Button size="sm" className="w-full mt-2 h-7 text-[10px] bg-yellow-400 hover:bg-yellow-500 text-black">Ajouter</Button>
                        </div>
                      ))}
                   </div>
                </div>
                )}
              </div>

              <div className="bg-white p-6 shadow-sm border h-fit rounded-sm">
                <div className="text-lg mb-4">Sous-total : <span className="font-bold">{subtotal} HTG</span></div>
                <Button className="w-full bg-[#FFD814] hover:bg-[#F7CA00] text-black border border-[#FCD200] rounded-lg shadow-sm font-medium" onClick={() => setStep('plan')}>
                    Passer la commande
                </Button>
              </div>
            </motion.div>
          )}

          {/* CORRECTION 1: CHOIX DU PLAN DE PAIEMENT */}
          {step === 'plan' && (
             <motion.div key="plan" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="max-w-xl mx-auto space-y-6">
                <div className="bg-white p-6 shadow-md rounded-lg border">
                    <h3 className="text-xl font-black mb-6">Choisissez votre option de paiement</h3>
                    <RadioGroup value={paymentPlan} onValueChange={setPaymentPlan} className="space-y-4">
                        <Label className={`flex flex-col p-5 border-2 rounded-xl cursor-pointer transition-all ${paymentPlan === 'FULL' ? 'border-orange-500 bg-orange-50' : 'border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="FULL" />
                                <span className="font-bold text-lg">Paiement Complet</span>
                            </div>
                            <p className="ml-7 text-sm text-slate-500 mt-1 text-balance">Réglez la totalité de votre commande maintenant ({baseTotal} HTG).</p>
                        </Label>

                        <Label className={`flex flex-col p-5 border-2 rounded-xl cursor-pointer transition-all ${paymentPlan === 'TWO_STEPS' ? 'border-orange-500 bg-orange-50' : 'border-slate-100'}`}>
                            <div className="flex items-center gap-3">
                                <RadioGroupItem value="TWO_STEPS" />
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-lg">Paiement en 2 temps (50/50)</span>
                                        <Zap size={16} className="text-orange-500 fill-orange-500"/>
                                    </div>
                                </div>
                            </div>
                            <p className="ml-7 text-sm text-slate-500 mt-1">Payez 50% maintenant ({baseTotal/2} HTG) et l'autre moitié à la livraison.</p>
                        </Label>
                    </RadioGroup>
                </div>
                <Button className="w-full h-14 bg-[#232F3E] text-white rounded-xl font-bold" onClick={() => setStep('checkout')}>
                    Continuer vers la méthode de paiement
                </Button>
             </motion.div>
          )}

          {step === 'checkout' && (
            <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="max-w-2xl mx-auto space-y-6 pb-20">
              <div className="bg-white p-6 shadow-sm border rounded-lg">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-xl">Méthode de paiement</h3>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded font-bold uppercase tracking-wider">Plan: {paymentPlan === 'FULL' ? 'Complet' : '2 Temps'}</span>
                </div>
                
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  {['CASH', 'card', 'moncash', 'natcash'].map((method) => (
                    <Label key={method} className="flex items-center space-x-3 p-4 rounded-lg border cursor-pointer hover:bg-slate-50">
                      <RadioGroupItem value={method} />
                      <span className="flex-1 flex items-center gap-3 capitalize font-medium">
                        {method === 'CASH' && <Banknote className="text-green-600" />}
                        {method === 'card' && <CreditCard className="text-blue-600" />}
                        {method === 'moncash' && <Wallet className="text-orange-500" />}
                        {method === 'natcash' && <Wallet className="text-purple-500" />}
                        {method === 'CASH' ? 'Cash à la livraison' : method === 'card' ? 'Carte de crédit' : method}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border-t-4 border-orange-500">
                  <div className="flex justify-between items-end">
                      <div>
                        <p className="text-xs opacity-60 uppercase font-black">À payer maintenant</p>
                        <p className="text-4xl font-black">{finalAmountToPay} HTG</p>
                      </div>
                      {isTwoSteps && <div className="text-right text-orange-400 font-bold text-sm">Reste à la livraison: {balanceToPayLater} HTG</div>}
                  </div>
              </div>

              {paymentMethod === 'card' && (
                <SquarePaymentForm amount={amountToPayNow} onSuccess={setSquareToken} onError={(err) => toast.error(err)} />
              )}

              {(paymentMethod === 'moncash' || paymentMethod === 'natcash') && (
                <div className="p-6 bg-white rounded-xl border border-dashed border-slate-300">
                  <div className="flex justify-between items-center mb-4">
                    <p className="font-bold text-lg italic">{paymentMethod.toUpperCase()}</p>
                    <div className="text-right">
                        <p className="text-sm font-bold">{ACCOUNTS[paymentMethod].number}</p>
                        <p className="text-[10px] text-slate-500">{ACCOUNTS[paymentMethod].name}</p>
                    </div>
                  </div>
                  <Input className="h-12 border-2 focus:border-orange-500" placeholder="Entrez le code de transaction reçu par SMS" value={transactionCode} onChange={(e) => setTransactionCode(e.target.value)} />
                </div>
              )}

              <Button className="w-full h-16 bg-orange-600 text-white text-lg font-black rounded-xl shadow-lg hover:bg-orange-700" onClick={() => createOrderMutation.mutate()} disabled={createOrderMutation.isPending}>
                {createOrderMutation.isPending ? "Traitement..." : "Finaliser ma commande"}
              </Button>
            </motion.div>
          )}

          {step === 'confirmed' && (
            <motion.div key="confirmed" initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="text-center py-20 bg-white rounded-2xl shadow-sm border">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"><Check className="text-green-600 w-10 h-10" /></div>
              <h2 className="text-3xl font-black mb-4">C'est validé !</h2>
              <p className="text-slate-500 mb-8 px-6">Votre code de confirmation unique est :</p>
              <div className="bg-orange-100 text-orange-800 p-8 rounded-3xl max-w-xs mx-auto mb-8 border-2 border-orange-200">
                <p className="text-6xl font-black tracking-tighter">{confirmCode}</p>
              </div>
              <Link to={createPageUrl('Home')}><Button className="px-12 h-12 rounded-full font-bold">Retour à l'accueil</Button></Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}