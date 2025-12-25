import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import { MapPin, Store, User } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix pour les icônes Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Icônes personnalisées
const createIcon = (color, icon) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background: ${color};
        width: 40px;
        height: 40px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="transform: rotate(45deg); color: white; font-size: 18px;">
          ${icon}
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40]
  });
};

const driverIcon = createIcon('#f97316', '🏍️');
const shopIcon = createIcon('#3b82f6', '🏪');
const clientIcon = createIcon('#10b981', '📍');

export default function DeliveryMap({ order }) {
  const [center, setCenter] = useState([18.5944, -72.3074]); // Port-au-Prince par défaut

  useEffect(() => {
    // Centrer sur le livreur s'il a une position, sinon sur le client
    if (order.driver_location?.lat && order.driver_location?.lng) {
      setCenter([order.driver_location.lat, order.driver_location.lng]);
    } else if (order.client_location?.lat && order.client_location?.lng) {
      setCenter([order.client_location.lat, order.client_location.lng]);
    }
  }, [order]);

  // Construire la route: boutique -> livreur -> client
  const routePoints = [];
  if (order.shop_location?.lat && order.shop_location?.lng) {
    routePoints.push([order.shop_location.lat, order.shop_location.lng]);
  }
  if (order.driver_location?.lat && order.driver_location?.lng) {
    routePoints.push([order.driver_location.lat, order.driver_location.lng]);
  }
  if (order.client_location?.lat && order.client_location?.lng) {
    routePoints.push([order.client_location.lat, order.client_location.lng]);
  }

  if (!order.driver_location && !order.client_location && !order.shop_location) {
    return (
      <div className="bg-slate-100 rounded-lg p-8 text-center text-slate-500">
        <MapPin className="w-12 h-12 mx-auto mb-2 text-slate-400" />
        <p>Localisation non disponible</p>
      </div>
    );
  }

  return (
    <div className="relative">
      <MapContainer
        center={center}
        zoom={14}
        className="h-[400px] rounded-lg z-0"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Boutique */}
        {order.shop_location?.lat && order.shop_location?.lng && (
          <Marker
            position={[order.shop_location.lat, order.shop_location.lng]}
            icon={shopIcon}
          >
            <Popup>
              <div className="text-center">
                <Store className="w-5 h-5 mx-auto mb-1 text-blue-500" />
                <p className="font-semibold">{order.shop_name}</p>
                <p className="text-xs text-slate-500">Point de départ</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Livreur */}
        {order.driver_location?.lat && order.driver_location?.lng && (
          <Marker
            position={[order.driver_location.lat, order.driver_location.lng]}
            icon={driverIcon}
          >
            <Popup>
              <div className="text-center">
                <User className="w-5 h-5 mx-auto mb-1 text-orange-500" />
                <p className="font-semibold">{order.driver_name}</p>
                <p className="text-xs text-slate-500">En livraison</p>
                {order.driver_location.timestamp && (
                  <p className="text-xs text-slate-400 mt-1">
                    Mise à jour: {new Date(order.driver_location.timestamp).toLocaleTimeString('fr-HT')}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* Client */}
        {order.client_location?.lat && order.client_location?.lng && (
          <Marker
            position={[order.client_location.lat, order.client_location.lng]}
            icon={clientIcon}
          >
            <Popup>
              <div className="text-center">
                <MapPin className="w-5 h-5 mx-auto mb-1 text-green-500" />
                <p className="font-semibold">Vous</p>
                <p className="text-xs text-slate-500">Destination</p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* Route */}
        {routePoints.length >= 2 && (
          <Polyline
            positions={routePoints}
            color="#f97316"
            weight={4}
            opacity={0.7}
            dashArray="10, 10"
          />
        )}
      </MapContainer>

      {/* Légende */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg p-3 text-xs z-10">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
          <span>Boutique</span>
        </div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
          <span>Livreur</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Vous</span>
        </div>
      </div>
    </div>
  );
}