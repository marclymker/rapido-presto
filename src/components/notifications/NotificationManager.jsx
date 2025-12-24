import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

export function useNotificationSound() {
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
    }
  }, []);

  const playSound = useCallback(async () => {
    // Demander la permission si pas encore accordée
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === 'granted');
    }

    // Créer une notification silencieuse qui joue le son par défaut
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification('🔔 Nouvelle notification', {
        body: 'Vous avez une nouvelle activité',
        icon: '/favicon.ico',
        tag: 'order-notification',
        requireInteraction: false,
        silent: false // Important: utilise le son par défaut du système
      });

      // Fermer automatiquement après 3 secondes
      setTimeout(() => notification.close(), 3000);
    }
  }, []);

  return { playSound, permissionGranted };
}

export function useBrowserNotifications() {
  const requestPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  };

  const showNotification = (title, body) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, {
        body,
        icon: '/favicon.ico',
        requireInteraction: false,
        silent: false
      });
    }
    return null;
  };

  return { requestPermission, showNotification };
}

export function useOrderNotifications({ enabled, onNewOrder }) {
  const { playSound } = useNotificationSound();
  const { showNotification } = useBrowserNotifications();
  const previousCountRef = useRef(0);
  const notificationCooldownRef = useRef(false);

  useEffect(() => {
    if (!enabled || !onNewOrder) return;

    const currentCount = onNewOrder.length || 0;
    
    // Vérifier s'il y a de nouvelles commandes et éviter les notifications trop fréquentes
    if (currentCount > previousCountRef.current && previousCountRef.current > 0 && !notificationCooldownRef.current) {
      notificationCooldownRef.current = true;
      
      const newOrdersCount = currentCount - previousCountRef.current;
      
      // Jouer le son avec notification native du système
      playSound();

      // Notification toast
      toast.success(`🔔 ${newOrdersCount} nouvelle(s) commande(s)!`, {
        duration: 4000,
        important: true,
      });

      // Réinitialiser le cooldown après 2 secondes
      setTimeout(() => {
        notificationCooldownRef.current = false;
      }, 2000);
    }
    
    previousCountRef.current = currentCount;
  }, [enabled, onNewOrder, playSound, showNotification]);
}