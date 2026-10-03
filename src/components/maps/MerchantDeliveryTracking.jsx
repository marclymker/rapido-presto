import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Navigation, CheckCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { firebase } from '@/api/firebaseClient';
import { toast } from "sonner";

export default function MerchantDeliveryTracking({ order, onClose }) {
  const [confirmationCode, setConfirmationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCompleteDelivery = async () => {
    if (!confirmationCode) {
      toast.error('Entrez le code de confirmation');
      return;
    }

    if (confirmationCode !== order.confirmation_code) {
      toast.error('Code incorrect');
      return;
    }

    setLoading(true);
    try {
      await firebase.entities.Order.update(order.id, {
        status: 'delivered'
      });
      toast.success('✅ Livraison terminée !');
      onClose();
    } catch (error) {
      toast.error('Erreur: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header */}
      <div className="bg-orange-500 text-white p-4 flex items-center gap-3">
        <Button onClick={onClose} size="icon" variant="ghost" className="text-white hover:bg-orange-600">
          ✕
        </Button>
        <div>
          <h2 className="font-bold text-lg">Livraison #{order.order_number}</h2>
          <p className="text-sm text-orange-100">{order.client_name}</p>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bg-white border-t shadow-2xl p-4 space-y-4">
        {/* Order Info */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Commande</p>
            <p className="font-bold">#{order.order_number}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">Client</p>
            <p className="font-bold">{order.client_name}</p>
          </div>
        </div>

        {/* Client Contact */}
        <div className="flex items-center gap-2">
          <a href={`tel:${order.client_phone}`} className="flex-1">
            <Button variant="outline" className="w-full">
              <Phone className="w-4 h-4 mr-2" />
              Appeler le client
            </Button>
          </a>
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.client_address + ' ' + (order.client_region || ''))}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="outline" size="icon" title="Ouvrir dans Google Maps">
              <Navigation className="w-4 h-4" />
            </Button>
          </a>
        </div>

        {/* Address */}
        <div className="bg-blue-50 p-3 rounded-lg flex items-start gap-2">
          <MapPin className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-blue-900">
              {order.client_address}
            </p>
            <p className="text-xs text-blue-600">{order.client_region}</p>
          </div>
        </div>

        {/* Confirmation Code */}
        <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 space-y-3">
          <p className="font-bold text-green-700 text-center">
            Code de confirmation du client
          </p>
          <Input
            type="text"
            maxLength={4}
            value={confirmationCode}
            onChange={(e) => setConfirmationCode(e.target.value)}
            placeholder="4 chiffres"
            className="text-center text-3xl font-bold tracking-widest bg-white"
          />
          <Button
            onClick={handleCompleteDelivery}
            disabled={loading || !confirmationCode}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-6"
          >
            <CheckCircle className="w-5 h-5 mr-2" />
            Terminer la livraison
          </Button>
        </div>
      </div>
    </div>
  );
}