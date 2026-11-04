import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from 'lucide-react';
import { toast } from "sonner";
import { firebaseApi } from '@/api/firebaseClient';

export default function SquarePaymentForm({ amount, onSuccess, onError }) {
  const [card, setCard] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [configLoading, setConfigLoading] = useState(true);

  useEffect(() => {
    let disposed = false;
    const initializeCard = async (config) => {
      try {
        if (!window.Square) throw new Error('SDK Square indisponible');
        const payments = window.Square.payments(config.applicationId, config.locationId);
        const cardInstance = await payments.card();
        await cardInstance.attach('#card-container');
        if (!disposed) setCard(cardInstance);
      } catch (error) {
        console.error('Square initialization error:', error);
        toast.error('Erreur lors du chargement du formulaire de paiement');
      } finally {
        if (!disposed) setConfigLoading(false);
      }
    };

    const initSquare = async () => {
      try {
        const response = await firebaseApi.functions.invoke('squareConfig');
        const config = response.data;
        if (!config?.applicationId || !config?.locationId) throw new Error('Configuration Square incomplète');
        const initialize = () => initializeCard(config);
        if (!window.Square) {
          const script = document.createElement('script');
          script.src = 'https://web.squarecdn.com/v1/square.js';
          script.async = true;
          script.onload = initialize;
          script.onerror = () => {
            toast.error('SDK Square indisponible');
            if (!disposed) setConfigLoading(false);
          };
          document.body.appendChild(script);
        } else {
          initialize();
        }
      } catch (error) {
        console.error('Square configuration error:', error);
        toast.error(error.message || 'Square n’est pas encore configuré');
        if (!disposed) setConfigLoading(false);
      }
    };

    initSquare();

    return () => {
      disposed = true;
      if (card) {
        card.destroy();
      }
    };
  }, []);

  const handlePayment = async () => {
    if (!card) {
      toast.error('Formulaire de paiement non initialisé');
      return;
    }

    setProcessing(true);

    try {
      const result = await card.tokenize();

      if (result.status === 'OK') {
        onSuccess(result.token);
      } else {
        let errorMessage = 'Erreur lors de la validation de la carte';
        if (result.errors) {
          errorMessage = result.errors.map(e => e.message).join(', ');
        }
        toast.error(errorMessage);
        if (onError) onError(errorMessage);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erreur lors du traitement du paiement');
      if (onError) onError(error.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border p-4">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-800">Paiement par carte</h3>
        </div>

        <div id="card-container" className="min-h-[120px]"></div>

        <div className="mt-4 text-xs text-slate-500 flex items-center gap-2">
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z"/>
          </svg>
          Paiement sécurisé par Square
        </div>
      </div>

      <Button
        onClick={handlePayment}
        disabled={processing || configLoading || !card}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white py-6 text-lg font-bold"
      >
        {configLoading ? 'Chargement sécurisé...' : processing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Traitement...
          </>
        ) : (
          `Payer ${amount?.toFixed(0)} HTG`
        )}
      </Button>
    </div>
  );
}
