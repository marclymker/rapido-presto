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
        // Paiement réussi - mettre à jour la commande
        const orders = await base44.entities.Order.filter({ 
          moncash_transaction_id: transactionId 
        });

        if (orders.length > 0) {
          const order = orders[0];
          await base44.entities.Order.update(order.id, {
            payment_status: 'paid'
          });

          setOrderDetails({
            orderNumber: order.order_number,
            amount: paymentData.amount
          });
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
            Paiement Réussi!
          </h1>
          
          <p className="text-slate-600 mb-6">
            Votre paiement MonCash a été effectué avec succès
          </p>

          {orderDetails && (
            <div className="bg-slate-50 rounded-xl p-4 mb-6">
              <div className="text-sm text-slate-500 mb-1">Numéro de commande</div>
              <div className="text-lg font-bold text-slate-800">{orderDetails.orderNumber}</div>
              <div className="text-sm text-slate-500 mt-3">Montant payé</div>
              <div className="text-2xl font-bold text-orange-500">{orderDetails.amount} HTG</div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button 
              onClick={() => navigate(createPageUrl('Orders'))}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              Voir mes commandes
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