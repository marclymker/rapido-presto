import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';

export default function PaymentCallback() {
  const [status, setStatus] = useState('loading'); // loading, success, failed
  const [paymentDetails, setPaymentDetails] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    verifyPayment();
  }, []);

  const verifyPayment = async () => {
    try {
      // Get transaction ID from URL
      const urlParams = new URLSearchParams(window.location.search);
      const transactionId = urlParams.get('transactionId');
      
      if (!transactionId) {
        setStatus('failed');
        setError('Transaction ID manquant');
        return;
      }

      // Verify payment with backend
      const { data } = await base44.functions.invoke('moncashVerifyPayment', {
        transactionId
      });

      if (data.success && data.status === 'successful') {
        setStatus('success');
        setPaymentDetails(data);
        
        // Update order status to paid
        if (data.orderId) {
          const orders = await base44.entities.Order.filter({ 
            order_number: data.orderId 
          });
          
          if (orders.length > 0) {
            await base44.entities.Order.update(orders[0].id, {
              payment_status: 'paid',
              moncash_transaction_id: transactionId
            });
          }
        }
      } else {
        setStatus('failed');
        setError(data.status || 'Paiement échoué');
      }
    } catch (err) {
      console.error('Payment verification error:', err);
      setStatus('failed');
      setError(err.message || 'Erreur lors de la vérification');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-lg p-8 max-w-md w-full text-center"
      >
        {status === 'loading' && (
          <>
            <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Vérification du paiement...
            </h2>
            <p className="text-slate-500">
              Veuillez patienter pendant que nous vérifions votre transaction
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle2 className="w-10 h-10 text-green-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Paiement réussi !
            </h2>
            <p className="text-slate-500 mb-6">
              Votre commande a été payée avec succès via MonCash
            </p>
            
            {paymentDetails && (
              <div className="bg-slate-50 rounded-lg p-4 mb-6 text-left">
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Montant</span>
                  <span className="font-semibold">{paymentDetails.amount} HTG</span>
                </div>
                <div className="flex justify-between py-2 border-b">
                  <span className="text-slate-600">Commande</span>
                  <span className="font-semibold">#{paymentDetails.orderId}</span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-slate-600">Transaction</span>
                  <span className="font-mono text-xs">{paymentDetails.transactionId.slice(0, 20)}...</span>
                </div>
              </div>
            )}

            <Button
              onClick={() => navigate(createPageUrl('Orders'))}
              className="w-full bg-green-500 hover:bg-green-600"
            >
              Voir mes commandes
            </Button>
          </>
        )}

        {status === 'failed' && (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <XCircle className="w-10 h-10 text-red-500" />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">
              Paiement échoué
            </h2>
            <p className="text-slate-500 mb-6">
              {error || 'Une erreur est survenue lors du paiement'}
            </p>
            
            <div className="space-y-3">
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
          </>
        )}
      </motion.div>
    </div>
  );
}