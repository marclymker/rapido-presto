import { useEffect, useRef } from 'react';
import { toast } from 'sonner';

export function useNotificationSound() {
  const audioRef = useRef(null);

  useEffect(() => {
    // Créer un contexte audio pour le son de notification
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.volume = 0.5;
  }, []);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log('Sound play failed:', err));
    }
  };

  return playSound;
}

export function useBrowserNotifications() {
  const requestPermission = async () => {
    if (!('Notification' in window)) {
      toast.error('Les notifications ne sont pas supportées par votre navigateur');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.success('Notifications activées');
        return true;
      }
    }

    return false;
  };

  const showNotification = (title, options = {}) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      return notification;
    }
  };

  return { requestPermission, showNotification };
}

export function useOrderNotifications({ enabled, onNewOrder }) {
  const playSound = useNotificationSound();
  const { showNotification } = useBrowserNotifications();
  const previousCountRef = useRef(0);

  useEffect(() => {
    if (enabled && onNewOrder) {
      const currentCount = onNewOrder.length || 0;
      
      // Vérifier s'il y a de nouvelles commandes
      if (currentCount > previousCountRef.current && previousCountRef.current > 0) {
        // Jouer le son
        playSound();
        
        // Afficher la notification navigateur
        const newOrdersCount = currentCount - previousCountRef.current;
        showNotification('Nouvelle commande!', {
          body: `Vous avez ${newOrdersCount} nouvelle(s) commande(s)`,
          tag: 'new-order',
          requireInteraction: false
        });

        // Toast visuel dans l'app
        toast.success(`🔔 Nouvelle commande reçue!`, {
          duration: 5000
        });
      }
      
      previousCountRef.current = currentCount;
    }
  }, [enabled, onNewOrder, playSound, showNotification]);
}