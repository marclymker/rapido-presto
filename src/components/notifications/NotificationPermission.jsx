import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function NotificationPermission() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 1. Vérifier si l'utilisateur a déjà fait un choix dans le passé
    const choice = localStorage.getItem('rapido-notif-choice');
    
    if (!choice) {
      // Afficher après 2 secondes si aucun choix n'est mémorisé
      const timer = setTimeout(() => setShow(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAction = async (granted) => {
    if (granted) {
      // Essayer de demander la permission système (navigateur/APK)
      if ("Notification" in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          toast.success("Alertes activées avec succès !");
        }
      }
      // Enregistrer le choix "Accepté"
      localStorage.setItem('rapido-notif-choice', 'granted');
    } else {
      // Enregistrer le choix "Plus tard" pour ne pas harceler l'utilisateur
      localStorage.setItem('rapido-notif-choice', 'later');
    }
    
    // Fermer la popup immédiatement
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div 
          initial={{ y: 100, opacity: 0 }} 
          animate={{ y: 0, opacity: 1 }} 
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-white border-t border-slate-200 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
        >
          <div className="max-w-md mx-auto flex items-center gap-4">
            <div className="bg-orange-500 p-3 rounded-2xl shadow-lg shadow-orange-200 shrink-0">
              <Bell className="text-white w-6 h-6 animate-ring" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-slate-900 leading-tight">Activer les alertes ?</p>
              <p className="text-[11px] text-slate-500 leading-tight mt-1">
                Recevez un son dès qu'une commande arrive.
              </p>
            </div>
            <div className="flex flex-col gap-1">
              <Button 
                onClick={() => handleAction(true)} 
                className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-9 px-4 font-bold"
              >
                Activer
              </Button>
              <button 
                onClick={() => handleAction(false)}
                className="text-[10px] text-slate-400 font-medium py-1"
              >
                Plus tard
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}