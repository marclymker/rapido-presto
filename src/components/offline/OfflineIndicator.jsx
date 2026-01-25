import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, CheckCircle } from 'lucide-react';
import { useOnlineStatus } from './useOnlineStatus';

export default function OfflineIndicator() {
  const { isOnline } = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 bg-red-500 text-white px-4 py-3 flex items-center justify-center gap-2 shadow-lg z-[100]"
        >
          <WifiOff className="w-4 h-4" />
          <span className="text-sm font-medium">Mode hors ligne - Les données seront synchronisées à la reconnexion</span>
        </motion.div>
      )}

      {isOnline && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.3 }}
          className="fixed top-0 left-0 right-0 bg-green-500 text-white px-4 py-3 flex items-center justify-center gap-2 shadow-lg z-[100]"
        >
          <CheckCircle className="w-4 h-4" />
          <span className="text-sm font-medium">Reconnecté - Synchronisation en cours...</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}