import React, { useEffect, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationPermission() {
  const [permission, setPermission] = useState('default');
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
      if (Notification.permission === 'default') {
        const timer = setTimeout(() => setShowPrompt(true), 3000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  const handleRequest = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      setShowPrompt(false);
      
      if (result === 'granted') {
        new Notification("🎉 Super !", {
          body: "Vous recevrez les alertes de commandes ici.",
          icon: '/favicon.ico'
        });
      }
    }
  };

  if (permission !== 'default' || !showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, y: 50 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="fixed bottom-4 left-4 right-4 z-[999] md:left-auto md:right-4 md:max-w-sm"
      >
        <div className="bg-slate-900 text-white rounded-2xl shadow-2xl p-5 border border-slate-700">
          <div className="flex gap-4">
            <div className="bg-orange-500 p-3 rounded-xl h-fit">
              <Bell className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg">Activer les alertes ?</h3>
              <p className="text-slate-300 text-sm mb-4">
                Pour ne rater aucune commande, autorisez les notifications.
              </p>
              <div className="flex gap-2">
                <Button onClick={handleRequest} className="bg-orange-500 hover:bg-orange-600 flex-1">
                  Autoriser
                </Button>
                <Button variant="ghost" onClick={() => setShowPrompt(false)} className="text-slate-400">
                  Plus tard
                </Button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}