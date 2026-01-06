import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationPermission() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Vérifie si l'utilisateur est déjà abonné après un court délai
    const timer = setTimeout(() => {
      window.OneSignalDeferred = window.OneSignalDeferred || [];
      window.OneSignalDeferred.push(async (OneSignal) => {
        const hasPermission = OneSignal.Notifications.permission;
        if (!hasPermission) {
          setShowPrompt(true);
        }
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, []);

  const handleRequestPermission = () => {
    window.OneSignalDeferred.push(async (OneSignal) => {
      try {
        await OneSignal.Notifications.requestPermission();
        setShowPrompt(false);
      } catch (err) {
        console.error("Erreur permission:", err);
      }
    });
  };

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -50 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-[90%] max-w-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-orange-100 p-5 relative">
            <button 
              onClick={() => setShowPrompt(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                <Bell className="w-6 h-6 text-orange-500 animate-pulse" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900">Activer les alertes</h3>
                <p className="text-xs text-slate-500">Soyez notifié dès qu'une commande est disponible.</p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white"
                onClick={handleRequestPermission}
              >
                Activer maintenant
              </Button>
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setShowPrompt(false)}
              >
                Plus tard
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}