import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

export default function PaymentCallback() {
  const [status, setStatus] = useState('loading'); // loading, success, failed
  const [orderDetails, setOrderDetails] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      // Récupérer le transactionId de l'URL
      const urlParams = new URLSearchParams(window.location.search);
      const transactionId = urlParams.get('transactionId');

      if (!transactionId) {
        setStatus('failed');
        setError('ID de transaction manquant');
        return;
      }

      // Vérifier le paiement
      const response = await base44.functions.invoke('moncashVerifyPayment', {
        transactionId: transactionId
      });

      const paymentData = response.data;

      if (paymentData.success && paymentData.status === 'success') {
        // Vérifier si c'est un abonnement Premium (order_id commence par SUB_)
        const urlParams = new URLSearchParams(window.location.search);
        const orderId = urlParams.get('orderId');
        
        if (orderId && orderId.startsWith('SUB_')) {
          // C'est un abonnement Premium - appeler le webhook
          await base44.functions.invoke('premiumWebhook', {
            transaction_id: transactionId,
            order_id: orderId,
            status: 'successful'
          });

          setOrderDetails({
            orderNumber: orderId,
            amount: paymentData.amount,
            isPremium: true
          });
        } else {
          // Paiement de commande normale
          const orders = await base44.entities.Order.filter({ 
            moncash_transaction_id: transactionId 
          });

          if (orders.length > 0) {
            // Mettre à jour TOUTES les commandes avec ce transactionId
            for (const order of orders) {
              await base44.entities.Order.update(order.id, {
                payment_status: 'paid'
              });

              // ENVOYER LES NOTIFICATIONS APRÈS PAIEMENT RÉUSSI
              await base44.functions.invoke('sendOrderNotification', {
                orderId: order.id,
                status: 'pending'
              }).catch(err => console.error('Notification error:', err));

              // DEBUG: Vérifier les données avant d'envoyer WhatsApp
              console.log('=== PAYMENT CALLBACK - AVANT ENVOI WHATSAPP ===');
              console.log('Order ID:', order.id);
              
              const debugResult = await base44.functions.invoke('debugWhatsApp', {
                orderId: order.id
              }).catch(err => {
                console.error('Debug error:', err);
                return null;
              });
              
              if (debugResult) {
                console.log('Debug result:', debugResult.data);
              }

              // Envoyer notification WhatsApp au marchand
              const whatsappResult = await base44.functions.invoke('sendWhatsAppOrderNotification', {
                orderId: order.id
              }).catch(err => {
                console.error('WhatsApp notification error:', err);
                return { error: err.message };
              });
              
              console.log('WhatsApp result:', whatsappResult);
              console.log('=== FIN ENVOI WHATSAPP ===');
            }

            setOrderDetails({
              orderNumber: orders[0].order_number,
              amount: paymentData.amount,
              isPremium: false
            });
          }
        }

        setStatus('success');
      } else {
        setStatus('failed');
        setError(paymentData.error || 'Le paiement a échoué');
      }
    } catch (error) {
      console.error('Payment verification error:', error);
      setStatus('failed');
      setError(error.message || 'Erreur lors de la vérification du paiement');
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-16 h-16 animate-spin text-orange-500 mx-auto mb-4" />
          <p className="text-slate-600">Vérification du paiement...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-12 h-12 text-green-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            {orderDetails?.isPremium ? '👑 Premium Activé!' : 'Paiement Réussi!'}
          </h1>
          
          <p className="text-slate-600 mb-6">
            {orderDetails?.isPremium 
              ? 'Votre abonnement Premium est maintenant actif. Vos produits seront diffusés sur Facebook & Instagram!'
              : 'Votre paiement MonCash a été effectué avec succès'}
          </p>

          {orderDetails && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="text-sm text-slate-500 mb-1">
                {orderDetails.isPremium ? 'Abonnement' : 'Numéro de commande'}
              </div>
              <div className="text-lg font-bold text-slate-800">{orderDetails.orderNumber}</div>
              <div className="text-sm text-slate-500 mt-3">Montant payé</div>
              <div className="text-2xl font-bold text-orange-500">{orderDetails.amount} HTG</div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate(createPageUrl(orderDetails?.isPremium ? 'EnterpriseDashboard' : 'Orders'))}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {orderDetails?.isPremium ? 'Retour au Dashboard' : 'Voir mes commandes'}
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl('Home'))}
              variant="outline"
              className="w-full"
            >
              Retour à l'accueil
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center"
        >
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <XCircle className="w-12 h-12 text-red-600" />
          </div>

          <h1 className="text-2xl font-bold text-slate-800 mb-2">
            Paiement Échoué
          </h1>
          
          <p className="text-slate-600 mb-2">
            Votre paiement MonCash n'a pas pu être traité
          </p>

          {error && (
            <div className="bg-red-50 text-red-700 rounded-lg p-3 mb-6 text-sm">
              {error}
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate(createPageUrl('Cart'))}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Retour au panier
            </Button>
            <Button 
              onClick={() => navigate(createPageUrl('Home'))}
              variant="outline"
              className="w-full"
            >
              Retour à l'accueil
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  return null;
}