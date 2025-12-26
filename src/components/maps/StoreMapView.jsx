import React, { useState, useEffect } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { calculateDistance, estimateDeliveryTime } from '@/components/utils/distanceCalculation';

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

export default function StoreMapView({ stores, userLocation, onStoreSelect }) {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_PLACES_API_KEY || ''
  });

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-slate-200 animate-pulse flex items-center justify-center">
        <span className="text-slate-500 text-sm">Chargement de la carte...</span>
      </div>
    );
  }

  if (!userLocation) {
    return (
      <div className="w-full h-full bg-slate-100 flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-4xl mb-2">📍</div>
          <p className="text-slate-600 text-sm">Localisation requise</p>
        </div>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={userLocation}
      zoom={15}
      options={{
        disableDefaultUI: true,
        styles: mapStyleSilver,
        zoomControl: false,
        fullscreenControl: false,
        streetViewControl: false,
      }}
    >
      {/* Marqueur de l'utilisateur (Point bleu) */}
      <Marker 
        position={userLocation}
        icon={{
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: '#4285F4',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3,
        }}
        zIndex={1000}
      />

      {/* Marqueurs des boutiques */}
      {stores.map((store) => {
        const storePosition = store.location || store.geometry?.location;
        if (!storePosition) return null;

        return (
          <Marker
            key={store.id}
            position={storePosition}
            title={store.company_name}
            onClick={() => onStoreSelect && onStoreSelect(store)}
            icon={{
              url: store.is_google_place 
                ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png'
                : 'https://maps.google.com/mapfiles/ms/icons/orange-dot.png',
              scaledSize: new window.google.maps.Size(32, 32)
            }}
          />
        );
      })}
    </GoogleMap>
  );
}