import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

const playSound = () => {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  audio.play().catch(() => console.log("Audio bloqué"));
};

const vibratePhone = () => {
  if ("vibrate" in navigator) {
    navigator.vibrate([200, 100, 200]); // Vibration style Android
  }
};

export function useBrowserNotifications() {
  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    return await Notification.requestPermission() === 'granted';
  };
  return { requestPermission };
}

export function useOrderNotifications({ enabled, onNewOrder }) {
  const previousCountRef = useRef(null);

  useEffect(() => {
    if (!enabled || !onNewOrder) return;

    const currentCount = onNewOrder.length || 0;
    
    if (previousCountRef.current === null) {
      previousCountRef.current = currentCount;
      return;
    }
    
    if (currentCount > previousCountRef.current) {
      const diff = currentCount - previousCountRef.current;
      
      // ACTIONS IMMEDIATES (Fonctionnent dans l'APK)
      playSound();
      vibratePhone();
      
      // TOAST (UI Interne - Fonctionne toujours)
      toast.error(`NOUVELLE COMMANDE (${diff})`, {
        description: "Une nouvelle activité a été détectée !",
        duration: 10000,
        position: 'top-center',
      });

      // NOTIFICATION SYSTEME (Si l'APK le permet)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("🔔 Commande reçue !", { body: `Nouveau message disponible` });
      }
    }
    
    previousCountRef.current = currentCount;
  }, [enabled, onNewOrder]);
}