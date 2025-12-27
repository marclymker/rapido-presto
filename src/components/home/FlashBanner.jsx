import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Clock } from 'lucide-react';

export default function FlashBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes en secondes

  useEffect(() => {
    const checkTime = () => {
      const now = new Date();
      const minutes = now.getMinutes(); 
      const seconds = now.getSeconds();

      // Cycle de 45 minutes : on vérifie le reste de la division (modulo)
      // Si minutes % 45 est entre 0 et 1, la bannière est active (pendant 2 mins)
      const currentCycleMinute = minutes % 45;

      if (currentCycleMinute >= 0 && currentCycleMinute < 2) {
        setIsVisible(true);
        // Calculer le temps restant
        const remaining = (2 * 60) - (currentCycleMinute * 60 + seconds);
        setTimeLeft(remaining);
      } else {
        setIsVisible(false);
      }
    };

    // Vérification toutes les secondes pour une réactivité maximale
    const interval = setInterval(checkTime, 1000);
    checkTime(); // Appel initial

    return () => clearInterval(interval);
  }, []);

  if (!isVisible) return null;

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="w-full bg-gradient-to-r from-blue-600 to-orange-500 text-white overflow-hidden shadow-lg rounded-xl animate-fade-in mx-4 my-4">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-black uppercase tracking-widest">⚡ Offre Flash</span>
            <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full">
              <Clock className="w-3 h-3" />
              <span className="text-xs font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>
          <h3 className="text-xl font-bold">Lunettes & Montres Premium ⌚🕶️</h3>
          <p className="text-sm opacity-90 mt-1">Accessoires de luxe à prix réduits</p>
        </div>
        <Link 
          to={createPageUrl('Home') + '?search=accessoires'}
          className="bg-white text-blue-600 px-6 py-3 rounded-full font-black text-sm hover:scale-105 transition-transform shadow-lg"
        >
          Découvrir
        </Link>
      </div>
    </div>
  );
}