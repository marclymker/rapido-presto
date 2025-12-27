import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { Button } from "@/components/ui/button";
import { Phone, MapPin, Navigation, CheckCircle } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import 'leaflet/dist/leaflet.css';

export default function MerchantDeliveryTracking({ order, onClose }) {
  const [merchantLocation, setMerchantLocation] = useState(null);
  const [confirmationCode, setConfirmationCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Suivi de la position du marchand
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setMerchantLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude
        });
      },
      (error) => console.error('Geolocation error:', error),
      { enableHighAccuracy: true }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const clientLocation = order.client_location || { 
    lat: 18.5944, 
    lng: -72.3074 
  };

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
      await base44.entities.Order.update(order.id, { 
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

  const center = merchantLocation || clientLocation;

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Map */}
      <div className="flex-1 relative">
        <MapContainer 
          center={[center.lat, center.lng]} 
          zoom={14} 
          className="h-full w-full"
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          
          {/* Client Marker */}
          <Marker position={[clientLocation.lat, clientLocation.lng]}>
            <Popup>
              <div className="text-center">
                <p className="font-bold">📍 Client</p>
                <p className="text-xs">{order.client_address}</p>
              </div>
            </Popup>
          </Marker>

          {/* Merchant Marker */}
          {merchantLocation && (
            <Marker position={[merchantLocation.lat, merchantLocation.lng]}>
              <Popup>
                <p className="font-bold">🚚 Vous</p>
              </Popup>
            </Marker>
          )}

          {/* Route Line */}
          {merchantLocation && (
            <Polyline
              positions={[
                [merchantLocation.lat, merchantLocation.lng],
                [clientLocation.lat, clientLocation.lng]
              ]}
              color="#3b82f6"
              weight={4}
              dashArray="10, 10"
            />
          )}
        </MapContainer>

        {/* Floating back button */}
        <Button
          onClick={onClose}
          className="absolute top-4 left-4 bg-white shadow-lg rounded-full"
          size="icon"
          variant="outline"
        >
          ✕
        </Button>
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
          <Button variant="outline" size="icon">
            <Navigation className="w-4 h-4" />
          </Button>
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