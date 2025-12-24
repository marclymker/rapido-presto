import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

// Son de notification simple en data URI (courte tonalité)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZjDgIHGm98OScTgwOUKvm7rltIAU7k9n0z3krBSl+zPLaizsIHGu88OWcTQsNUavm7rltIAU7k9n0zn4rBSh9y/HaiTsIHGy98OWcTQsNUKrm7rltIAU7lNj0z34rBSh9y/HaizsIHG298OWcTQwOUavm7bptIAU7lNn0zn4rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0zn4rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7rltIAU7k9n0z34rBSh9y/HaizsIHGy98OWcTQsNUavm7g==';

export function useNotificationSound() {
  const audioRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);

  const initialize = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND);
      audioRef.current.volume = 0.7;
    }
    // Jouer et arrêter immédiatement pour initialiser le contexte audio
    audioRef.current.play().then(() => {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsInitialized(true);
    }).catch(err => console.log('Audio init failed:', err));
  };

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log('Sound play failed:', err);
        if (!isInitialized) {
          toast.error('Cliquez sur l\'icône son pour activer les notifications sonores');
        }
      });
    }
  };

  return { playSound, initialize, isInitialized };
}

export function useBrowserNotifications() {
  const requestPermission = async () => {
    // Ne pas vérifier l'API Notification, OneSignal gère cela
    return true;
  };

  const showNotification = () => {
    // OneSignal gère les notifications
    return null;
  };

  return { requestPermission, showNotification };
}

export function useOrderNotifications({ enabled, onNewOrder }) {
  const { playSound } = useNotificationSound();
  const previousCountRef = useRef(0);

  useEffect(() => {
    if (enabled && onNewOrder) {
      const currentCount = onNewOrder.length || 0;
      
      // Vérifier s'il y a de nouvelles commandes
      if (currentCount > previousCountRef.current && previousCountRef.current > 0) {
        // Jouer le son
        playSound();

        // Toast visuel dans l'app
        toast.success(`🔔 Nouvelle commande reçue!`, {
          duration: 5000
        });
      }
      
      previousCountRef.current = currentCount;
    }
  }, [enabled, onNewOrder, playSound]);
}