import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBrowserNotifications } from './NotificationManager'; 

export default function NotificationPermission() {
  const [showPrompt, setShowPrompt] = useState(false);
  const { requestPermission } = useBrowserNotifications();

  useEffect(() => {
    if ('Notification' in window) {
      // On affiche le prompt après 3 secondes si la permission est encore par défaut
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleActivate = async () => {
    const granted = await requestPermission();
    if (granted) {
      new Notification("✅ Notifications activées !");
      setShowPrompt(false);
    } else {
      setShowPrompt(false);
    }
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="fixed bottom-4 left-4 right-4 z-[9999] md:max-w-sm md:left-auto"
      >
        <div className="bg-white rounded-2xl shadow-2xl p-5 border-2 border-orange-500">
          <div className="flex gap-4">
            <div className="bg-orange-100 p-3 rounded-xl h-fit">
              <Bell className="w-6 h-6 text-orange-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-slate-900">Notifications de commandes</h3>
              <p className="text-sm text-slate-500 mb-4">
                Activez les alertes sonores pour ne manquer aucune vente.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleActivate} className="bg-orange-500 hover:bg-orange-600 flex-1 text-white font-bold">
                  Activer
                </Button>
                <Button variant="ghost" onClick={() => setShowPrompt(false)}>Plus tard</Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}