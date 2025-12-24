import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, BellOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationPermission() {
  const [permission, setPermission] = useState('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      
      // Afficher le prompt si pas encore demandé
      if (Notification.permission === 'default') {
        setTimeout(() => setShowPrompt(true), 3000);
      }
    }
  }, []);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
      
      if (result === 'granted') {
        // Test notification
        new Notification('🎉 Notifications activées!', {
          body: 'Vous recevrez désormais des alertes pour vos commandes',
          icon: '/favicon.ico',
          silent: false
        });
      }
    }
  };

  if (permission === 'granted' || !('Notification' in window)) {
    return null;
  }

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-slate-900 mb-1">
                  Activer les notifications
                </h3>
                <p className="text-sm text-slate-600 mb-3">
                  Recevez des alertes instantanées pour vos commandes, même quand l'app est fermée
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600"
                    onClick={requestPermission}
                  >
                    Activer
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setShowPrompt(false)}
                  >
                    Plus tard
                  </Button>
                </div>
              </div>
              <button
                onClick={() => setShowPrompt(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}