import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, Wifi } from 'lucide-react';
import { useOnlineStatus } from './useOnlineStatus';

export default function OfflineIndicator() {
  const { isOnline } = useOnlineStatus();
  const [showBack, setShowBack] = useState(false);
  const [prevOnline, setPrevOnline] = useState(isOnline);

  useEffect(() => {
    if (!prevOnline && isOnline) {
      setShowBack(true);
      const t = setTimeout(() => setShowBack(false), 3000);
      return () => clearTimeout(t);
    }
    setPrevOnline(isOnline);
  }, [isOnline]);

  const visible = !isOnline || showBack;
  const color   = isOnline ? '#16a34a' : '#dc2626';
  const Icon    = isOnline ? Wifi : WifiOff;
  const msg     = isOnline
    ? 'Connexion rétablie — panier synchronisé'
    : 'Hors ligne — lecture seule disponible';

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: -40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -40 }}
          transition={{ duration: 0.25 }}
          className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-center gap-2 py-2 px-4 text-white text-xs font-medium"
          style={{ backgroundColor: color }}
        >
          <Icon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{msg}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}