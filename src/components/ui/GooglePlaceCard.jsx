import React from 'react';
import { calculateDistance, estimateDeliveryTime } from '@/components/utils/distanceCalculation';

export default function GooglePlaceCard({ place, userLocation, onClick }) {
  const distance = userLocation 
    ? calculateDistance(
        userLocation.lat, 
        userLocation.lng,
        place.location.lat, 
        place.location.lng
      )
    : null;

  const deliveryTime = distance ? estimateDeliveryTime(distance) : null;
  const isOpen = place.opening_hours?.open_now;

  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:shadow-md transition-all cursor-pointer active:scale-[0.98]"
    >
      {/* Image de la boutique */}
      <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden flex-shrink-0">
        {place.company_logo_url ? (
          <img 
            src={place.company_logo_url}
            className="w-full h-full object-cover"
            alt={place.company_name}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl">
            🏪
          </div>
        )}
      </div>

      {/* Infos Boutique */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h4 className="font-bold text-slate-900 text-base leading-tight truncate">
            {place.company_name}
          </h4>
          {isOpen !== undefined && (
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase whitespace-nowrap ${
              isOpen 
                ? 'bg-green-100 text-green-700' 
                : 'bg-red-100 text-red-700'
            }`}>
              {isOpen ? 'Ouvert' : 'Fermé'}
            </span>
          )}
        </div>
        
        {/* Rating et Distance */}
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <span className="flex items-center gap-1">
            ⭐ {place.rating || 'N/A'}
          </span>
          {distance && (
            <>
              <span>•</span>
              <span className="font-medium">{distance} km</span>
            </>
          )}
        </div>

        {/* Temps de livraison */}
        {deliveryTime && (
          <div className="flex items-center gap-1 text-orange-600 font-bold text-xs">
            <span className="text-base">🚴</span>
            <span>Livraison en ~{deliveryTime} min</span>
          </div>
        )}

        {/* Adresse */}
        {place.vicinity && (
          <p className="text-xs text-slate-400 mt-1 truncate">
            📍 {place.vicinity}
          </p>
        )}
      </div>
    </div>
  );
}