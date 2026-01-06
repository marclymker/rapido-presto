import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
// Vérifie bien le chemin d'importation ici
import { useBrowserNotifications } from './NotificationManager'; 

export default function NotificationPermission() {
  const [showPrompt, setShowPrompt] = useState(false);
  const { requestPermission } = useBrowserNotifications();

  useEffect(() => {
    if ('Notification' in window) {
      // Si l'utilisateur n'a pas encore répondu (default)
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleActivate = async () => {
    const granted = await requestPermission();
    if (granted) {
      // Petit test immédiat
      new Notification("✅ Notifications activées", {
        body: "Vous recevrez les alertes ici dès qu'une commande arrive."
      });
      setShowPrompt(false);
    } else {
      alert("Vous avez bloqué les notifications. Changez les paramètres de votre navigateur.");
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }} 
        animate={{ opacity: 1, y: 0 }} 
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] w-[90%] max-w-sm"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-5 border border-orange-100 flex flex-col gap-4">
          <div className="flex items-start gap-4">
            <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-200">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900 text-lg leading-tight">Activer les alertes ?</h3>
              <p className="text-sm text-slate-500 mt-1">
                Soyez prévenu par un son dès qu'une nouvelle commande est disponible.
              </p>
            </div>
            <button onClick={() => setShowPrompt(false)} className="text-slate-400">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleActivate} className="bg-orange-600 hover:bg-orange-700 text-white flex-1 font-bold h-11">
              Activer maintenant
            </Button>
            <Button variant="ghost" onClick={() => setShowPrompt(false)} className="text-slate-500 h-11">
              Plus tard
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}