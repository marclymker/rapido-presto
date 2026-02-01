import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

export default function PaymentCallback() {
  const [status, setStatus] = useState('loading'); 
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      // Moncash renvoie transactionId et orderId dans l'URL
      const urlParams = new URLSearchParams(window.location.search);
      const transactionId = urlParams.get('transactionId');
      const orderIdParam = urlParams.get('orderId'); 

      if (!transactionId) {
        throw new Error('ID de transaction manquant');
      }

      // 1. Vérification coté serveur
      // Note: Assure-toi que la fonction backend 'moncashVerifyPayment' existe aussi
      const response = await base44.functions.invoke('moncashVerifyPayment', {
        transactionId: transactionId,
        orderId: orderIdParam 
      });

      const paymentData = response.data;

      if (paymentData.success || paymentData.status === 'success' || paymentData.payment?.message === 'successful') {
        
        // 2. Mise à jour de la commande
        // On cherche les commandes qui commencent par RP... (car dans la DB c'est RP...-SHOPID)
        const pendingOrders = await base44.entities.Order.filter({ 
            status: 'pending_validation'
        });
        
        const orders = pendingOrders.filter(o => o.order_number.startsWith(orderIdParam));

        if (orders.length > 0) {
          for (const order of orders) {
            await base44.entities.Order.update(order.id, {
              payment_status: 'paid',
              status: 'pending', 
              moncash_transaction_id: transactionId,
              external_transaction_code: transactionId
            });

            // Trigger Notifications
            base44.functions.invoke('sendOrderNotification', { orderId: order.id, status: 'pending' }).catch(console.error);
            base44.functions.invoke('sendWhatsAppOrderNotification', { orderId: order.id }).catch(console.error);
          }
        }

        setOrderDetails({
            orderNumber: orderIdParam,
            amount: paymentData.amount || "Payé",
            isPremium: false
        });
        setStatus('success');

      } else {
        throw new Error(paymentData.error || 'Statut de paiement invalide');
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setError(error.message);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-red-600 mb-4" />
        <h2 className="text-lg font-bold">Vérification Moncash...</h2>
        <p className="text-sm text-slate-500">Ne fermez pas cette page.</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <h1 className="text-2xl font-black uppercase mb-2">Paiement Réussi !</h1>
          <p className="text-slate-600 mb-6">Votre commande {orderDetails?.orderNumber} a été validée.</p>
          <Button onClick={() => navigate(createPageUrl('Orders'))} className="w-full bg-black text-white h-12 uppercase font-bold">
            Voir mes commandes
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <XCircle className="w-10 h-10 text-red-600" />
        </div>
        <h1 className="text-xl font-bold uppercase mb-2">Paiement Échoué</h1>
        <p className="text-red-600 bg-red-50 p-3 rounded mb-6 text-sm">{error}</p>
        <Button onClick={() => navigate(createPageUrl('Cart'))} className="w-full bg-black text-white">
          Retourner au panier
        </Button>
      </div>
    </div>
  );
}