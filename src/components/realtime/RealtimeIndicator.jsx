import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { motion } from 'framer-motion';

export default function RealtimeIndicator({ isConnected }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex items-center gap-2"
    >
      {isConnected ? (
        <>
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2 }}
            className="relative"
          >
            <Wifi className="w-4 h-4 text-green-500" />
            <motion.span
              animate={{ opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 2 }}
              className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full"
            />
          </motion.div>
          <span className="text-xs text-green-600 font-medium">En direct</span>
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-400">Hors ligne</span>
        </>
      )}
    </motion.div>
  );
}