import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';

export default function NotificationPermission() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // 1. On ne montre rien si les notifications ne sont pas supportées
    if (!("Notification" in window)) return;

    // 2. On vérifie l'état actuel de la permission navigateur
    const currentPermission = Notification.permission;

    // 3. On vérifie si l'utilisateur a déjà cliqué sur "Plus tard" récemment
    const lastChoice = localStorage.getItem('rapido-notif-choice');

    if (currentPermission === 'default' && lastChoice !== 'later') {
      const timer = setTimeout(() => setShow(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAction = async (wantNotifications) => {
    if (wantNotifications) {
      try {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
          localStorage.setItem('rapido-notif-choice', 'granted');
          toast.success("Alertes activées !");

          // Petit test sonore pour confirmer à l'utilisateur
          const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
          audio.play().catch(() => {});

        } else if (permission === 'denied') {
          toast.error("Notifications bloquées par le navigateur.");
          localStorage.setItem('rapido-notif-choice', 'denied');
        }
      } catch (e) {
        console.error("Erreur lors de la demande de permission", e);
      }
    } else {
      // Si "Plus tard", on stocke l'info pour ne pas le harceler à chaque refresh
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
        className="fixed bottom-6 left-4 right-4 z-[9999] md:max-w-md md:mx-auto"
      >
        <div className="bg-white rounded-3xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-100 flex items-center gap-4">
          <div className="bg-orange-500 p-3 rounded-2xl shrink-0 text-white animate-pulse">
            <Bell className="w-6 h-6" />
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold leading-tight text-slate-900">Notifications Temps Réel</p>
            <p className="text-[11px] text-slate-500 mt-1">Soyez alerté instantanément de vos nouvelles commandes.</p>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <Button
              onClick={() => handleAction(true)}
              className="bg-orange-600 hover:bg-orange-700 text-white text-xs h-9 px-6 rounded-xl font-bold border-none"
            >
              Activer
            </Button>
            <button
              onClick={() => handleAction(false)}
              className="text-[10px] text-slate-400 py-1 font-medium bg-transparent border-none hover:text-slate-600 transition-colors"
            >
              Plus tard
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}