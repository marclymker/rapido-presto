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
      const urlParams = new URLSearchParams(window.location.search);
      const transactionId = urlParams.get('transactionId');
      const orderIdParam = urlParams.get('orderId'); 

      if (!transactionId) throw new Error('ID de transaction manquant');

      const response = await base44.functions.invoke('moncashVerifyPayment', {
        transactionId: transactionId,
        orderId: orderIdParam 
      });

      const paymentData = response.data;

      if (paymentData.success || paymentData.status === 'success') {
        
        // Gestion Commande Standard
        if (orderIdParam && !orderIdParam.startsWith('SUB_')) {
             const pendingOrders = await base44.entities.Order.filter({ status: 'pending_validation' });
             const orders = pendingOrders.filter(o => o.order_number.startsWith(orderIdParam));
             
             for (const order of orders) {
                await base44.entities.Order.update(order.id, {
                  payment_status: 'paid',
                  status: 'pending',
                  moncash_transaction_id: transactionId,
                  external_transaction_code: transactionId
                });
                // Notifications (Silent fail si erreur)
                base44.functions.invoke('sendOrderNotification', { orderId: order.id }).catch(e => console.log(e));
                base44.functions.invoke('sendWhatsAppOrderNotification', { orderId: order.id }).catch(e => console.log(e));
             }
        }
        
        // Gestion Premium (Si nécessaire)
        if (orderIdParam && orderIdParam.startsWith('SUB_')) {
             await base44.functions.invoke('premiumWebhook', { transaction_id: transactionId, order_id: orderIdParam, status: 'successful' });
        }

        setOrderDetails({ orderNumber: orderIdParam, amount: paymentData.amount });
        setStatus('success');

      } else {
        throw new Error(paymentData.error || 'Paiement non validé');
      }

    } catch (error) {
      console.error(error);
      setStatus('failed');
      setError(error.message);
    }
  };

  if (status === 'loading') return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-red-600 w-10 h-10"/></div>;

  if (status === 'success') return (
    <div className="h-screen flex items-center justify-center p-4">
       <div className="text-center">
          <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4"/>
          <h1 className="text-2xl font-bold mb-2">Paiement Réussi !</h1>
          <p className="mb-6">Commande {orderDetails?.orderNumber}</p>
          <Button onClick={() => navigate(createPageUrl('Orders'))} className="bg-black text-white w-full">Voir mes commandes</Button>
       </div>
    </div>
  );

  return (
    <div className="h-screen flex items-center justify-center p-4">
       <div className="text-center">
          <XCircle className="w-16 h-16 text-red-600 mx-auto mb-4"/>
          <h1 className="text-2xl font-bold mb-2">Erreur</h1>
          <p className="text-red-500 mb-6">{error}</p>
          <Button onClick={() => navigate(createPageUrl('Cart'))} className="bg-black text-white w-full">Retour au panier</Button>
       </div>
    </div>
  );
}