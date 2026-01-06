import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

// --- LOGIQUE SONORE ---
export function useNotificationSound() {
  const playSound = useCallback(() => {
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => console.log("Son bloqué : nécessite une interaction utilisateur."));
  }, []);

  return { playSound };
}

// --- LOGIQUE PERMISSIONS ---
export function useBrowserNotifications() {
  const requestPermission = async () => {
    if (!('Notification' in window)) return false;
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  return { requestPermission };
}

// --- LOGIQUE SURVEILLANCE DES COMMANDES ---
export function useOrderNotifications({ enabled, onNewOrder }) {
  const previousCountRef = useRef(null);
  const { playSound } = useNotificationSound();

  useEffect(() => {
    if (!enabled || !onNewOrder) return;

    const currentCount = onNewOrder.length || 0;
    
    // Premier chargement : on initialise sans notifier
    if (previousCountRef.current === null) {
      previousCountRef.current = currentCount;
      return;
    }
    
    // Si le nombre de commandes a augmenté
    if (currentCount > previousCountRef.current) {
      const diff = currentCount - previousCountRef.current;
      
      // 1. Déclencher le son (Marche dans l'APK si l'app est ouverte)
      playSound();

      // 2. Faire vibrer le téléphone (Très utile pour l'APK Android)
      if ("vibrate" in navigator) {
        navigator.vibrate([200, 100, 200]);
      }

      // 3. Afficher un Toast visuel interne (Infaillible dans l'APK)
      toast.success(`🔔 NOUVELLE COMMANDE !`, {
        description: `Vous avez reçu ${diff} nouvelle(s) commande(s).`,
        duration: 10000,
        position: 'top-center',
      });

      // 4. Notification Système (Ne marchera que si l'APK autorise les WebView Notifications)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Nouvelle Commande", {
          body: `Vous avez ${diff} nouvelles commandes en attente.`,
          icon: '/favicon.ico'
        });
      }
    }
    
    previousCountRef.current = currentCount;
  }, [enabled, onNewOrder, playSound]);
}