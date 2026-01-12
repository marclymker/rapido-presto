import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Banknote, Clock, AlertTriangle, Copy, Check, Info } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { getHaitiTime } from '@/components/utils/dateFormat';
import SquarePaymentForm from '@/components/payment/SquarePaymentForm';

// --- LOGIQUE DES FRAIS ---

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

// Frais Moncash basés sur le tableau officiel (Retrait/Transfert)
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

// Comptes Marchands Mis à jour
const ACCOUNTS = {
  moncash: { number: "50948690366", name: "Marc lymker JEAN" },
  natcash: { number: "3527-0511", name: "Rebecca Christa Rigaud" }
};

export default function Cart() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState('cart'); 
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

  const { data: cartItems = [], isLoading } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  // --- LOGIQUE DE CALCUL DU TOTAL ---
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
  const transferFee = paymentMethod === 'moncash' ? calculateMoncashFee(baseTotal) : 
                     paymentMethod === 'natcash' ? calculateNatcashFee(baseTotal) : 0;
  const finalAmountToPay = baseTotal + transferFee;

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
        throw new Error('Le code de transaction est obligatoire');
      }

      const shopIds = Object.keys(itemsByShop);
      const firstOrderNum = 'RP' + Date.now().toString().slice(-6);

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
          total: finalAmountToPay,
          payment_method: paymentMethod,
          status: (paymentMethod === 'moncash' || paymentMethod === 'natcash') ? 'pending_validation' : 'pending',
          payment_status: paymentMethod === 'CASH' ? 'pending' : 'paid',
          confirmation_code: code,
          external_transaction_code: transactionCode.trim(),
          transfer_fee: transferFee,
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
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b p-4 sticky top-0 z-50">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => step === 'checkout' ? setStep('cart') : navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">{step === 'cart' ? 'Panier' : 'Vérification'}</h1>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4">
        <AnimatePresence mode="wait">
          {step === 'cart' && (
            <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="space-y-3 mb-6">
                {cartItems.map(item => (
                  <div key={item.id} className="bg-white p-4 rounded-xl flex justify-between shadow-sm">
                    <div>
                      <p className="font-bold">{item.product_name}</p>
                      <p className="text-sm text-slate-500">{item.quantity} x {item.unit_price} HTG</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => base44.entities.CartItem.delete(item.id)}>
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border space-y-2">
                <div className="flex justify-between"><span>Sous-total</span><span>{subtotal} HTG</span></div>
                <div className="flex justify-between"><span>Livraison</span><span>{deliveryFee} HTG</span></div>
                <div className="flex justify-between font-bold text-xl border-t pt-2 mt-2">
                  <span>Total</span><span className="text-orange-600">{baseTotal} HTG</span>
                </div>
              </div>
              <Button className="w-full mt-6 bg-orange-500 h-12 text-lg" onClick={() => setStep('checkout')}>Continuer</Button>
            </motion.div>
          )}

          {step === 'checkout' && (
            <motion.div key="checkout" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6 pb-20">
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <h3 className="font-bold mb-4">Méthode de paiement</h3>
                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                  {['CASH', 'moncash', 'natcash'].map(m => (
                    <div key={m} className="flex items-center space-x-3 p-3 rounded-lg border">
                      <RadioGroupItem value={m} id={m} />
                      <Label htmlFor={m} className="flex-1 flex items-center gap-3 cursor-pointer capitalize">
                        <Wallet className={`w-5 h-5 ${m === 'moncash' ? 'text-orange-500' : 'text-purple-500'}`} />
                        {m === 'CASH' ? 'Cash à la livraison' : m}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {(paymentMethod === 'moncash' || paymentMethod === 'natcash') && (
                <div className={`p-5 rounded-2xl border-2 ${paymentMethod === 'moncash' ? 'border-orange-200 bg-orange-50/30' : 'border-purple-200 bg-purple-50/30'}`}>
                  <div className="flex items-center gap-2 mb-4">
                    <Info className="w-5 h-5" />
                    <h3 className="font-bold">Instructions de transfert {paymentMethod}</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs text-slate-500 mb-1">Montant exact à transférer (Frais inclus)</p>
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-black text-slate-800">{finalAmountToPay} HTG</span>
                        <Button size="sm" variant="outline" onClick={() => copyToClipboard(finalAmountToPay.toString(), 'amount')}>
                          {copiedState.amount ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                      <p className="text-[10px] text-red-500 mt-1">Dont {transferFee} HTG de frais de retrait {paymentMethod}</p>
                    </div>

                    <div className="bg-white p-4 rounded-xl border shadow-sm">
                      <p className="text-xs text-slate-500 mb-1">Compte {paymentMethod.toUpperCase()}</p>
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-lg text-blue-700">{ACCOUNTS[paymentMethod].number}</p>
                          <p className="text-sm font-medium">{ACCOUNTS[paymentMethod].name}</p>
                        </div>
                        <Button size="icon" variant="outline" onClick={() => copyToClipboard(ACCOUNTS[paymentMethod].number, 'account')}>
                          {copiedState.account ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-bold">Saisissez le code de transaction reçu par SMS :</Label>
                      <Input 
                        placeholder="Ex: 84930221" 
                        value={transactionCode}
                        onChange={(e) => setTransactionCode(e.target.value)}
                        className="h-12 border-slate-300 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <Button 
                className="w-full h-14 bg-orange-600 text-lg font-bold shadow-lg" 
                onClick={() => createOrderMutation.mutate()}
                disabled={createOrderMutation.isPending}
              >
                {createOrderMutation.isPending ? "Traitement..." : "Confirmer mon paiement"}
              </Button>
            </motion.div>
          )}

          {step === 'confirmed' && (
            <motion.div key="confirmed" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-10">
              <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Check className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-black mb-2">Félicitations !</h2>
              <p className="text-slate-500 mb-8">Votre commande est en cours de vérification.</p>
              
              <div className="bg-slate-900 text-white p-8 rounded-3xl mb-8">
                <p className="text-xs uppercase tracking-widest opacity-60 mb-2">Code de retrait livreur</p>
                <p className="text-6xl font-black tracking-tighter">{confirmCode}</p>
              </div>

              <Link to={createPageUrl('Home')}><Button variant="outline" className="w-full h-12">Retourner au magasin</Button></Link>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}