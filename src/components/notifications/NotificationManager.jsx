import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

export function useNotificationSound() {
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    if ('Notification' in window) {
      setPermissionGranted(Notification.permission === 'granted');
      console.log('🔔 Permission notifications:', Notification.permission);
    }
  }, []);

  const playSound = useCallback(async () => {
    console.log('🔊 Tentative de jouer le son...');
    
    // Demander la permission si pas encore accordée
    if ('Notification' in window && Notification.permission === 'default') {
      console.log('📝 Demande de permission...');
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === 'granted');
      console.log('✅ Permission accordée:', permission);
    }

    // Créer une notification avec son
    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('📢 Affichage notification...');
      const notification = new Notification('🔔 Nouvelle commande!', {
        body: 'Vous avez une nouvelle activité',
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'order-notification-' + Date.now(),
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200]
      });

      // Fermer après 5 secondes
      setTimeout(() => notification.close(), 5000);
      
      console.log('✅ Notification affichée');
    } else {
      console.warn('⚠️ Notifications non autorisées');
    }
  }, []);

  return { playSound, permissionGranted };
}

export function useBrowserNotifications() {
  const requestPermission = async () => {
    console.log('🔔 Demande de permission notifications...');
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      console.log('✅ Permission:', permission);
      return permission === 'granted';
    }
    const granted = Notification.permission === 'granted';
    console.log('🔔 Permission actuelle:', granted);
    return granted;
  };

  const showNotification = (title, body) => {
    console.log('📢 Affichage notification:', title, body);
    if ('Notification' in window && Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200],
        tag: 'notification-' + Date.now()
      });
      
      setTimeout(() => notification.close(), 5000);
      return notification;
    }
    console.warn('⚠️ Impossible d\'afficher la notification');
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