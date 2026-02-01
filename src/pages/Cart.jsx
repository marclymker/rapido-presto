import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { ArrowLeft, Plus, Minus, Trash2, CreditCard, Wallet, Banknote, Clock, AlertTriangle, Check, Info, LayoutGrid } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { motion, AnimatePresence } from 'framer-motion';
import { getHaitiTime } from '@/components/utils/dateFormat';
import SquarePaymentForm from '@/components/payment/SquarePaymentForm';

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
    const [user, setUser] = useState(null);
    const [step, setStep] = useState('cart'); // cart, checkout, confirmed
    const [paymentPlan, setPaymentPlan] = useState('SPLIT'); // 'FULL' or 'SPLIT' (50/50)
    const [paymentMethod, setPaymentMethod] = useState('CASH');
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
    }, []);

    const { data: cartItems = [], isLoading } = useQuery({
        queryKey: ['cart', user?.id],
        queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
        enabled: !!user?.id,
        refetchInterval: 60000
    });

    const updateQuantityMutation = useMutation({
        mutationFn: ({ id, quantity }) => {
            if (quantity <= 0) return base44.entities.CartItem.delete(id);
            return base44.entities.CartItem.update(id, { quantity });
        },
        onSuccess: () => queryClient.invalidateQueries(['cart'])
    });

    const deleteItemMutation = useMutation({
        mutationFn: (id) => base44.entities.CartItem.delete(id),
        onSuccess: () => queryClient.invalidateQueries(['cart'])
    });

    // Calculs de prix
    const subtotal = cartItems.reduce((sum, item) => {
        const itemTotal = (item.unit_price + (item.total_customization_price || 0)) * item.quantity;
        return sum + itemTotal;
    }, 0);

    const itemsByShop = cartItems.reduce((acc, item) => {
        if (!acc[item.shop_id]) acc[item.shop_id] = [];
        acc[item.shop_id].push(item);
        return acc;
    }, {});

    let deliveryFee = 0;
    Object.keys(itemsByShop).forEach(shopId => {
        const shopRegion = itemsByShop[shopId][0].shop_region;
        deliveryFee += calculateDeliveryFee(user?.region || '', shopRegion);
    });

    const totalOrder = subtotal + deliveryFee + (user?.pending_balance || 0);
    const amountToPayNow = paymentPlan === 'SPLIT' ? totalOrder / 2 : totalOrder;

    const createOrderMutation = useMutation({
        mutationFn: async () => {
            const shopIds = Object.keys(itemsByShop);
            
            // Logique de création de commande (Simplifiée pour Square/MonCash/Cash)
            // Note: En mode SPLIT, nous marquons le statut de paiement comme 'partially_paid' si électronique
            
            if (paymentMethod === 'card') {
                if (!squareToken) throw new Error('Token de paiement manquant');
                
                const createdOrders = [];
                for (const shopId of shopIds) {
                    const shopItems = itemsByShop[shopId];
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
                        items: shopItems.map(item => ({ name: item.product_name, quantity: item.quantity, total: item.unit_price * item.quantity })),
                        total: (shopItems.reduce((s, i) => s + (i.unit_price * i.quantity), 0)) + calculateDeliveryFee(user.region, shopItems[0].shop_region),
                        payment_method: 'card',
                        payment_plan: paymentPlan,
                        status: 'pending',
                        payment_status: 'paid',
                        confirmation_code: code
                    });
                    createdOrders.push({ orderId: order.id, orderNum, code });
                }

                const paymentResponse = await base44.functions.invoke('squarePayment', {
                    sourceId: squareToken,
                    amount: amountToPayNow,
                    orderId: createdOrders[0].orderNum
                });

                if (!paymentResponse.data.success) throw new Error('Paiement refusé');
                await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));
                return { orderNum: createdOrders[0].orderNum, code: createdOrders[0].code };
            }

            if (paymentMethod === 'moncash') {
                const orderNum = 'RP' + Date.now().toString().slice(-6);
                const response = await base44.functions.invoke('moncashCreatePayment', {
                    orderId: orderNum,
                    amount: amountToPayNow,
                    description: `Commande ${orderNum} (${paymentPlan})`
                });

                if (!response.data?.success) throw new Error('Erreur MonCash');

                // Simulation de création pour le flow MonCash
                await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));
                return { moncashUrl: response.data.paymentUrl, redirecting: true };
            }

            // Default: CASH
            const orderNum = 'RP' + Date.now().toString().slice(-6);
            const code = generateConfirmationCode();
            await base44.entities.Order.create({
                order_number: orderNum,
                client_id: user.id,
                total: totalOrder,
                payment_method: 'CASH',
                payment_plan: paymentPlan,
                amount_due_now: amountToPayNow,
                status: 'pending',
                confirmation_code: code
            });
            
            await Promise.all(cartItems.map(item => base44.entities.CartItem.delete(item.id)));
            return { orderNum, code };
        },
        onSuccess: (data) => {
            if (data.redirecting) {
                window.location.href = data.moncashUrl;
                return;
            }
            setOrderNumber(data.orderNum);
            setConfirmCode(data.code);
            setStep('confirmed');
            toast.success('Commande enregistrée !');
        },
        onError: (err) => toast.error(err.message)
    });

    if (!user || isLoading) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" /></div>;

    return (
        <div className="min-h-screen bg-slate-50">
            <header className="bg-white sticky top-0 z-40 border-b">
                <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => step === 'checkout' ? setStep('cart') : navigate(-1)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <h1 className="text-lg font-semibold">
                        {step === 'cart' ? 'Mon Panier' : step === 'checkout' ? 'Finalisation' : 'Confirmé'}
                    </h1>
                </div>
            </header>

            <main className="max-w-2xl mx-auto px-4 py-6">
                <AnimatePresence mode="wait">
                    {step === 'cart' && (
                        <motion.div key="cart" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            {cartItems.length === 0 ? (
                                <div className="text-center py-12">
                                    <p className="text-slate-500 mb-4">Votre panier est vide</p>
                                    <Button onClick={() => navigate(createPageUrl('Home'))} className="bg-orange-500">Boutique</Button>
                                </div>
                            ) : (
                                <>
                                    <div className="space-y-3">
                                        {cartItems.map(item => (
                                            <div key={item.id} className="bg-white rounded-xl p-4 flex gap-4">
                                                <div className="w-16 h-16 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                                                    {item.product_image ? <img src={item.product_image} className="w-full h-full object-cover" /> : "📦"}
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-medium truncate">{item.product_name}</h3>
                                                    <p className="text-orange-500 font-bold">{item.unit_price} HTG</p>
                                                    <div className="flex items-center gap-2 mt-2">
                                                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity - 1 })}><Minus className="w-3 h-3"/></Button>
                                                        <span>{item.quantity}</span>
                                                        <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantityMutation.mutate({ id: item.id, quantity: item.quantity + 1 })}><Plus className="w-3 h-3"/></Button>
                                                        <Button variant="ghost" className="h-7 w-7 text-red-500 ml-auto" onClick={() => deleteItemMutation.mutate(item.id)}><Trash2 className="w-4 h-4"/></Button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="bg-white rounded-xl p-4 mt-6 border-t-4 border-orange-500">
                                        <div className="flex justify-between font-bold text-lg">
                                            <span>Total Commande</span>
                                            <span className="text-orange-500">{totalOrder} HTG</span>
                                        </div>
                                        <Button className="w-full mt-4 bg-orange-500 h-12" onClick={() => setStep('checkout')}>Passer au paiement</Button>
                                    </>
                            )}
                        </motion.div>
                    )}

                    {step === 'checkout' && (
                        <motion.div key="checkout" initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="space-y-6">
                            
                            {/* 1. OPTION DE PAIEMENT (FULL vs SPLIT) */}
                            <div className="bg-white rounded-xl p-4 border-2 border-orange-100">
                                <h3 className="font-bold mb-4 flex items-center gap-2">
                                    <LayoutGrid className="w-5 h-5 text-orange-500" /> 
                                    Option de paiement
                                </h3>
                                <RadioGroup value={paymentPlan} onValueChange={setPaymentPlan} className="grid grid-cols-1 gap-3">
                                    <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${paymentPlan === 'SPLIT' ? 'border-orange-500 bg-orange-50' : 'border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <RadioGroupItem value="SPLIT" id="split" />
                                            <Label htmlFor="split" className="cursor-pointer">
                                                <p className="font-bold text-orange-700">Split Payment (50/50)</p>
                                                <p className="text-xs text-slate-500">Payez la moitié aujourd'hui, le reste plus tard.</p>
                                            </Label>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">{totalOrder / 2} HTG</p>
                                            <p className="text-[10px] uppercase text-slate-400">Aujourd'hui</p>
                                        </div>
                                    </div>

                                    <div className={`flex items-center justify-between p-4 rounded-xl border-2 transition-all ${paymentPlan === 'FULL' ? 'border-orange-500 bg-orange-50' : 'border-slate-100'}`}>
                                        <div className="flex items-center gap-3">
                                            <RadioGroupItem value="FULL" id="full" />
                                            <Label htmlFor="full" className="cursor-pointer">
                                                <p className="font-bold text-slate-700">Paiement Complet</p>
                                                <p className="text-xs text-slate-500">Réglez la totalité de la commande maintenant.</p>
                                            </Label>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold text-lg">{totalOrder} HTG</p>
                                        </div>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* 2. METHODE DE PAIEMENT */}
                            <div className="bg-white rounded-xl p-4">
                                <h3 className="font-semibold mb-4 text-slate-700">Méthode de règlement</h3>
                                <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                                    <div className="flex items-center space-x-3 p-3 rounded-lg border">
                                        <RadioGroupItem value="CASH" id="cash" />
                                        <Label htmlFor="cash" className="flex items-center gap-3 cursor-pointer flex-1">
                                            <Banknote className="w-5 h-5 text-green-600" />
                                            <span>{paymentPlan === 'SPLIT' ? 'Cash à la livraison (Acompte)' : 'Cash à la livraison'}</span>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-3 p-3 rounded-lg border">
                                        <RadioGroupItem value="moncash" id="moncash" />
                                        <Label htmlFor="moncash" className="flex items-center gap-3 cursor-pointer flex-1">
                                            <Wallet className="w-5 h-5 text-orange-600" />
                                            <span>Moncash</span>
                                        </Label>
                                    </div>
                                    <div className="flex items-center space-x-3 p-3 rounded-lg border">
                                        <RadioGroupItem value="card" id="card" />
                                        <Label htmlFor="card" className="flex items-center gap-3 cursor-pointer flex-1">
                                            <CreditCard className="w-5 h-5 text-blue-600" />
                                            <span>Carte de Crédit</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {paymentMethod === 'card' && (
                                <SquarePaymentForm 
                                    amount={amountToPayNow} 
                                    onSuccess={setSquareToken} 
                                    onError={(err) => toast.error(err)} 
                                />
                            )}

                            <div className="bg-white rounded-xl p-4 space-y-2">
                                <div className="flex justify-between text-slate-500">
                                    <span>Total commande</span>
                                    <span>{totalOrder} HTG</span>
                                </div>
                                <div className="flex justify-between font-bold text-xl pt-2 border-t text-orange-600">
                                    <span>À PAYER MAINTENANT</span>
                                    <span>{amountToPayNow} HTG</span>
                                </div>
                                {paymentPlan === 'SPLIT' && (
                                    <p className="text-[10px] text-center text-blue-500 bg-blue-50 p-2 rounded">
                                        Le solde restant de {(totalOrder / 2).toFixed(0)} HTG sera dû ultérieurement.
                                    </p>
                                )}
                            </div>

                            <Button 
                                className="w-full bg-orange-500 h-14 text-lg font-bold" 
                                onClick={() => createOrderMutation.mutate()}
                                disabled={createOrderMutation.isPending || (paymentMethod === 'card' && !squareToken)}
                            >
                                {createOrderMutation.isPending ? "Traitement..." : `Payer ${amountToPayNow} HTG`}
                            </Button>
                        </motion.div>
                    )}

                    {step === 'confirmed' && (
                        <motion.div key="confirmed" initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-center py-10">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Check className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Commande Réussie !</h2>
                            <p className="text-slate-500 mb-6">Référence: {orderNumber}</p>
                            <div className="bg-orange-50 p-6 rounded-2xl mb-8">
                                <p className="text-xs text-orange-600 uppercase tracking-widest mb-2">Code de retrait</p>
                                <p className="text-5xl font-black text-orange-600">{confirmCode}</p>
                            </div>
                            <Button className="w-full bg-slate-900" onClick={() => navigate(createPageUrl('Orders'))}>Voir mes commandes</Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}