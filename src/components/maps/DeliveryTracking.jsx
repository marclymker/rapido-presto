import React from 'react';
import { GoogleMap, useJsApiLoader, Marker, Polyline } from '@react-google-maps/api';
import { Phone, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { calculateDistance, estimateDeliveryTime } from '@/components/utils/distanceCalculation';
import { useRealtimeDriverLocation } from '@/components/firebase/useRealtimeDriverLocation';

const mapStyleSilver = [
  { "elementType": "geometry", "stylers": [{ "color": "#f5f5f5" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "featureType": "road", "elementType": "geometry", "stylers": [{ "color": "#ffffff" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#e9e9e9" }] }
];

const mapContainerStyle = {
  width: '100%',
  height: '100%',
};

export default function DeliveryTracking({ order }) {
  const { driverLocation: realtimeLocation, isConnected } = useRealtimeDriverLocation(order.id);
  const driverLocation = realtimeLocation || order.driver_location;

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_PLACES_API_KEY || ''
  });

  // Centre de la carte (entre client et livreur)
  const mapCenter = driverLocation && order.client_location
    ? {
        lat: (driverLocation.lat + order.client_location.lat) / 2,
        lng: (driverLocation.lng + order.client_location.lng) / 2
      }
    : order.client_location || { lat: 18.5944, lng: -72.3074 }; // Port-au-Prince par défaut

  // Chemin entre livreur et client
  const path = driverLocation && order.client_location
    ? [driverLocation, order.client_location]
    : [];

  // Distance restante
  const remainingDistance = driverLocation && order.client_location
    ? calculateDistance(
        driverLocation.lat,
        driverLocation.lng,
        order.client_location.lat,
        order.client_location.lng
      )
    : null;

  const estimatedTime = remainingDistance ? estimateDeliveryTime(remainingDistance) : null;

  if (!isLoaded) {
    return (
      <div className="h-[60vh] bg-slate-200 animate-pulse flex items-center justify-center">
        <span className="text-slate-500 text-sm">Chargement de la carte...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Carte de suivi */}
      <div className="h-[60vh] relative">
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={14}
          options={{
            disableDefaultUI: true,
            styles: mapStyleSilver,
            zoomControl: false,
          }}
        >
          {/* Marqueur Client (Destination) */}
          {order.client_location && (
            <Marker
              position={order.client_location}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 10,
                fillColor: '#3B82F6',
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
              }}
              title="Votre position"
            />
          )}

          {/* Marqueur Boutique */}
          {order.shop_location && (
            <Marker
              position={order.shop_location}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
                scaledSize: new window.google.maps.Size(32, 32)
              }}
              title={order.shop_name}
            />
          )}

          {/* Marqueur Livreur (Moto en mouvement) */}
          {driverLocation && (
            <Marker
              position={driverLocation}
              icon={{
                url: 'https://cdn-icons-png.flaticon.com/512/713/713311.png',
                scaledSize: new window.google.maps.Size(40, 40)
              }}
              title={order.driver_name}
              animation={window.google.maps.Animation.DROP}
            />
          )}

          {/* Ligne tracée entre livreur et client */}
          {path.length > 0 && (
            <Polyline
              path={path}
              options={{
                strokeColor: '#2563eb',
                strokeOpacity: 0.7,
                strokeWeight: 4,
                icons: [{
                  icon: {
                    path: 'M 0,-1 0,1',
                    strokeOpacity: 1,
                    scale: 4
                  },
                  offset: '0',
                  repeat: '20px'
                }]
              }}
            />
          )}
        </GoogleMap>
      </div>

      {/* Infos livreur en bas */}
      <div className="flex-1 bg-white rounded-t-3xl -mt-6 z-10 p-6 shadow-2xl overflow-y-auto">
        <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto mb-4" />

        {/* Indicateur de connexion Firebase */}
        <div className={`flex items-center gap-2 mb-4 px-3 py-2 rounded-lg ${
          isConnected ? 'bg-green-50' : 'bg-slate-50'
        }`}>
          {isConnected ? (
            <>
              <Wifi className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-700 font-medium">Suivi en temps réel actif</span>
            </>
          ) : (
            <>
              <WifiOff className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-500">Dernière position connue</span>
            </>
          )}
        </div>

        {/* Carte du livreur */}
        <div className="flex items-center gap-4 mb-6 p-4 bg-slate-50 rounded-2xl">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center text-white text-2xl font-bold">
            {order.driver_name?.charAt(0) || '🚴'}
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-slate-900 text-lg">
              {order.driver_name || 'Livreur'}
            </h4>
            {estimatedTime && (
              <p className="text-sm text-green-600 font-bold">
                🕐 Arrivée estimée : {estimatedTime} min
              </p>
            )}
            {remainingDistance && (
              <p className="text-xs text-slate-500">
                📍 {remainingDistance} km restants
              </p>
            )}
          </div>
          <a href={`tel:${order.driver_phone}`}>
            <Button size="icon" className="rounded-full bg-slate-200 hover:bg-slate-300">
              <Phone className="w-5 h-5 text-slate-700" />
            </Button>
          </a>
        </div>

        {/* Étapes de livraison */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-1 ${
              order.status === 'delivered' ? 'bg-green-500' :
              ['in_delivery', 'driver_assigned'].includes(order.status) ? 'bg-green-500' :
              'bg-slate-300'
            }`} />
            <div className="flex-1">
              <p className={`text-sm ${
                ['in_delivery', 'driver_assigned', 'delivered'].includes(order.status)
                  ? 'text-slate-900 font-semibold'
                  : 'text-slate-400'
              }`}>
                Commande récupérée à la boutique
              </p>
              <p className="text-xs text-slate-400">{order.shop_name}</p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-1 ${
              order.status === 'in_delivery' ? 'bg-blue-500 animate-pulse' :
              order.status === 'delivered' ? 'bg-green-500' :
              'bg-slate-300'
            }`} />
            <div className="flex-1">
              <p className={`text-sm ${
                order.status === 'in_delivery' ? 'text-slate-900 font-bold' :
                order.status === 'delivered' ? 'text-slate-900 font-semibold' :
                'text-slate-400'
              }`}>
                Livreur en route vers vous
              </p>
              {order.status === 'in_delivery' && (
                <p className="text-xs text-blue-600 font-medium">En cours...</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className={`w-3 h-3 rounded-full mt-1 ${
              order.status === 'delivered' ? 'bg-green-500' : 'bg-slate-300'
            }`} />
            <div className="flex-1">
              <p className={`text-sm ${
                order.status === 'delivered' ? 'text-green-600 font-bold' : 'text-slate-400'
              }`}>
                Livraison complétée
              </p>
              {order.status === 'delivered' && order.confirmation_code && (
                <p className="text-xs text-slate-500">Code: {order.confirmation_code}</p>
              )}
            </div>
          </div>
        </div>

        {/* Infos commande */}
        <div className="mt-6 pt-6 border-t">
          <h5 className="font-bold text-slate-700 mb-3">Détails de la commande</h5>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">N° commande</span>
              <span className="font-semibold text-slate-900">{order.order_number}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Adresse</span>
              <span className="font-medium text-slate-900 text-right max-w-[200px]">
                {order.client_address}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
