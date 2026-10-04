import React, { useState, useEffect } from 'react';
import { createPageUrl } from '@/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Flower2, Clock } from 'lucide-react';

export default function FlowersBanner() {
  const [isVisible, setIsVisible] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    const checkVisibility = () => {
      const now = Date.now();
      const cycleTime = 30 * 60 * 1000; // 30 minutes
      const displayDuration = 2 * 60 * 1000; // 2 minutes

      const timeInCycle = now % cycleTime;
      const shouldShow = timeInCycle < displayDuration;

      setIsVisible(shouldShow);

      if (shouldShow) {
        setTimeLeft(Math.floor((displayDuration - timeInCycle) / 1000));
      }
    };

    checkVisibility();
    const interval = setInterval(checkVisibility, 1000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="px-4 mb-4"
        >
          <button
            onClick={() => {
              window.location.href = createPageUrl('Home');
              setTimeout(() => {
                const event = new CustomEvent('selectCategory', { detail: 'Boutique Fleurs' });
                window.dispatchEvent(event);
              }, 100);
            }}
          >
            <div className="relative bg-gradient-to-r from-pink-500 to-rose-500 rounded-2xl p-4 overflow-hidden shadow-xl">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/10 rounded-full -ml-12 -mb-12" />

              <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                    <Flower2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="bg-white text-pink-600 text-xs font-bold px-2 py-0.5 rounded-full">
                        💐 OFFRE SPÉCIALE
                      </span>
                      <div className="flex items-center gap-1 text-white/90 text-xs">
                        <Clock className="w-3 h-3" />
                        <span>{formatTime(timeLeft)}</span>
                      </div>
                    </div>
                    <h3 className="text-white font-bold text-lg">Fleurs fraîches</h3>
                    <p className="text-white/90 text-sm">Bouquets et arrangements</p>
                  </div>
                </div>

                <div className="bg-white text-pink-600 px-4 py-2 rounded-full font-bold text-sm hover:scale-105 transition-transform">
                  Voir →
                </div>
              </div>
            </div>
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
