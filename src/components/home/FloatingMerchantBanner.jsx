import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { X, Store } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function FloatingMerchantBanner({ user }) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Ne pas afficher si l'utilisateur est déjà marchand
    if (user?.profiles?.entreprise?.is_active) {
      return;
    }

    const checkAndShow = () => {
      const lastShown = localStorage.getItem('floatingMerchantBannerLastShown');
      const now = Date.now();

      if (!lastShown || now - parseInt(lastShown) >= 30 * 60 * 1000) {
        // 30 minutes passées ou jamais affiché
        setIsVisible(true);
        localStorage.setItem('floatingMerchantBannerLastShown', now.toString());

        // Masquer après 60 secondes
        setTimeout(() => {
          setIsVisible(false);
        }, 60 * 1000);
      }
    };

    // Vérifier immédiatement
    checkAndShow();

    // Vérifier toutes les minutes si on doit afficher
    const interval = setInterval(() => {
      checkAndShow();
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [user]);

  if (!isVisible || !user || user?.profiles?.entreprise?.is_active) {
    return null;
  }

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-20 left-4 right-4 z-50"
        >
          <div className="max-w-lg mx-auto">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl shadow-2xl p-4 relative">
              <button
                onClick={() => setIsVisible(false)}
                className="absolute top-2 right-2 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center hover:bg-white/30 transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>

              <Link
                to={createPageUrl('Dashboard')}
                className="flex items-center gap-3"
              >
                <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Store className="w-6 h-6 text-orange-500" />
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold text-sm">
                    💰 Gagnez de l'argent avec Kairos
                  </p>
                  <p className="text-white/90 text-xs mt-0.5">
                    Publier un article →
                  </p>
                </div>
              </Link>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
