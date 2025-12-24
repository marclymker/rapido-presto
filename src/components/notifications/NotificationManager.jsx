import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

export function useNotificationSound() {
  const [isInitialized, setIsInitialized] = useState(false);

  const initialize = useCallback(() => {
    setIsInitialized(true);
  }, []);

  const playSound = useCallback(async (title = '🔔 Nouvelle notification', body = 'Vous avez une nouvelle activité') => {
    console.log('🔊 Tentative notification:', title);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      console.log('📢 Affichage notification navigateur...');
      const notification = new Notification(title, {
        body,
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        tag: 'notification-' + Date.now(),
        requireInteraction: false,
        silent: false,
        vibrate: [200, 100, 200]
      });

      setTimeout(() => notification.close(), 5000);
      console.log('✅ Notification affichée');
    } else {
      console.warn('⚠️ Notifications non autorisées');
    }
  }, []);

  return { playSound, initialize, isInitialized };
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

export function useOrderNotifications({ enabled, onNewOrder, title, message }) {
  const previousCountRef = useRef(0);
  const notificationCooldownRef = useRef(false);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!enabled || !onNewOrder) return;

    const currentCount = onNewOrder.length || 0;
    
    // Initialiser au premier chargement sans notification
    if (!hasInitializedRef.current) {
      previousCountRef.current = currentCount;
      hasInitializedRef.current = true;
      return;
    }
    
    // Vérifier s'il y a de nouvelles commandes
    if (currentCount > previousCountRef.current && !notificationCooldownRef.current) {
      notificationCooldownRef.current = true;
      
      const newOrdersCount = currentCount - previousCountRef.current;
      
      console.log('🔔 Nouvelle(s) commande(s) détectée(s):', newOrdersCount);
      
      // Notification navigateur native
      if ('Notification' in window && Notification.permission === 'granted') {
        const notifTitle = title || '🔔 Nouvelle commande!';
        const notifBody = message || `${newOrdersCount} nouvelle(s) commande(s) disponible(s)`;
        
        const notification = new Notification(notifTitle, {
          body: notifBody,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'order-notification-' + Date.now(),
          requireInteraction: false,
          silent: false,
          vibrate: [200, 100, 200, 100, 200]
        });
        
        setTimeout(() => notification.close(), 6000);
      }

      // Toast dans l'app
      toast.success(`🔔 ${newOrdersCount} nouvelle(s) commande(s)!`, {
        duration: 5000,
        important: true,
      });

      // Réinitialiser le cooldown
      setTimeout(() => {
        notificationCooldownRef.current = false;
      }, 3000);
    }
    
    previousCountRef.current = currentCount;
  }, [enabled, onNewOrder, title, message]);
}