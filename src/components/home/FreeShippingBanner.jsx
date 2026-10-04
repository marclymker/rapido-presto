import React from 'react';
import { Truck, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FreeShippingBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 text-white py-3 px-4 rounded-xl shadow-lg mb-4 overflow-hidden relative"
    >
      {/* Effet de brillance animé */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />

      <div className="relative flex items-center justify-center gap-3">
        <motion.div
          animate={{
            x: [0, 10, 0],
            rotate: [0, 5, 0]
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          <Truck className="w-6 h-6 md:w-8 md:h-8" />
        </motion.div>

        <div className="flex flex-col md:flex-row md:items-center md:gap-2">
          <span className="text-sm md:text-lg font-black uppercase tracking-wide">
            Livraison Gratuite
          </span>
          <span className="text-xs md:text-base font-bold">
            à partir de 3,000 Gourdes
          </span>
        </div>

        <Zap className="w-5 h-5 md:w-6 md:h-6 fill-current animate-pulse" />
      </div>
    </motion.div>
  );
}
