import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bell, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function NotificationPermission() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // On vérifie si l'utilisateur a déjà cliqué sur "Activer" ou "Plus tard"
    const choice = localStorage.getItem('rapido-notif-choice');
    if (!choice) {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAction = async (granted) => {
    if (granted) {
      // On enregistre le choix pour ne plus afficher la popup
      localStorage.setItem('rapido-notif-choice', 'granted');
      
      // On demande la permission au navigateur/APK pour le son/notifications
      if ("Notification" in window) {
        try {
          await Notification.requestPermission();
        } catch (e) {
          console.log("Erreur de permission native");
        }
      }
    } else {
      // On enregistre "later" pour ne plus l'embêter pendant cette session
      localStorage.setItem('rapido-notif-choice', 'later');
    }
    setShow(false);
  };

  if (!show) return null;

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ y: 100, opacity: 0 }} 
        animate={{ y: 0, opacity: 1 }} 
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4 bg-white border-t border-slate-100 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]"
      >
        <div className="max-w-md mx-auto flex items-center gap-4">
          <div className="bg-orange-500 p-3 rounded-2xl shrink-0">
            <Bell className="text-white w-6 h-6" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold text-slate-900 leading-tight">Activer les alertes ?</p>
            <p className="text-[11px] text-slate-500 mt-1">Ne manquez aucune commande Rapido.</p>
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
              className="text-[10px] text-slate-400 py-1 font-medium"
            >
              Plus tard
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}