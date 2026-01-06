import { useEffect, useRef, useCallback } from 'react';
import { toast } from 'sonner';

// Fonction pour le son
const playNotificationSound = () => {
  const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
  audio.play().catch(() => console.log("Son bloqué: nécessite une interaction utilisateur préalable."));
};

// Export 1 : Gestion des permissions
export function useBrowserNotifications() {
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      console.warn("Ce navigateur ne supporte pas les notifications.");
      return false;
    }
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  };

  return { requestPermission };
}

// Export 2 : Surveillance des commandes
export function useOrderNotifications({ enabled, onNewOrder }) {
  const previousCountRef = useRef(null);

  useEffect(() => {
    if (!enabled || !onNewOrder) return;

    const currentCount = onNewOrder.length || 0;
    
    // Initialisation silencieuse
    if (previousCountRef.current === null) {
      previousCountRef.current = currentCount;
      return;
    }
    
    // Si nouvelles commandes détectées
    if (currentCount > previousCountRef.current) {
      const diff = currentCount - previousCountRef.current;
      
      playNotificationSound();

      // 1. Notification Système (Navigateur)
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("🔔 Nouvelle commande !", {
          body: `Vous avez ${diff} nouvelle(s) commande(s) en attente.`,
          icon: '/favicon.ico',
          vibrate: [200, 100, 200]
        });
      }

      // 2. Toast UI (Dans l'app)
      toast.success(`Nouvelle commande !`, {
        description: `Quantité : ${diff}`,
        duration: 8000,
      });
    }
    
    previousCountRef.current = currentCount;
  }, [enabled, onNewOrder]);
}