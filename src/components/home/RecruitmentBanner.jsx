import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';

export default function RecruitmentBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Vérifier si la bannière a déjà été affichée
    const lastShown = localStorage.getItem('recruitmentBannerLastShown');
    const now = Date.now();

    if (!lastShown || (now - parseInt(lastShown)) > 12 * 60 * 60 * 1000) {
      // Afficher si jamais montré OU si 12 heures se sont écoulées
      setIsVisible(true);

      // Masquer après 1 minute et sauvegarder le timestamp
      const timer = setTimeout(() => {
        setIsVisible(false);
        localStorage.setItem('recruitmentBannerLastShown', now.toString());
      }, 60000);

      return () => clearTimeout(timer);
    }
  }, []);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-700 p-4 text-white shadow-lg animate-slide-in-up">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 p-3 rounded-2xl text-3xl shadow-lg backdrop-blur-sm">
            💰
          </div>
          <div>
            <h3 className="font-black text-base md:text-lg leading-tight">
              Gagnez de l'argent avec Kairos !
            </h3>
            <p className="text-xs md:text-sm opacity-90 mt-0.5">
              Devenez Livreur ou Vendeur dès aujourd'hui et augmentez vos revenus.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href={createPageUrl('ManageProfiles')}
            className="bg-white text-blue-700 px-5 py-2.5 rounded-full text-xs font-black shadow-lg hover:bg-gray-100 hover:scale-105 transition-all uppercase"
          >
            S'inscrire
          </a>
          <button
            onClick={() => setIsVisible(false)}
            className="text-white/60 hover:text-white text-2xl p-1 transition-colors"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
