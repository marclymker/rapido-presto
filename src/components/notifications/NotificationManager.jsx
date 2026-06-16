import { useEffect, useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';
import Pusher from 'pusher-js';
import { base44 } from '@/api/base44Client';

export function useBrowserNotifications(user) {
  const audioRef = useRef(null);
  const pusherRef = useRef(null);
  const [pusherConfig, setPusherConfig] = useState(null);
  const [soundInitialized, setSoundInitialized] = useState(false);

  const requestPermission = useCallback(() => {
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission().then(perm => {
        if (perm === "granted") {
          toast.success("Notifications activées");
        }
      });
    }
  }, []);

  const initialize = useCallback(() => {
    setSoundInitialized(true);
  }, []);

  // 1. Précharger l'audio (Inchangé)
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.load();
    
    const unlockAudio = () => {
      audioRef.current.play().then(() => {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }).catch(() => {});
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
    
    document.addEventListener('click', unlockAudio);
    document.addEventListener('touchstart', unlockAudio);
    
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('touchstart', unlockAudio);
    };
  }, []);
  
  // 2. Fonction d'alerte visuelle et sonore
  const playAlert = useCallback((data) => {
    // 1. Extraire les données de façon sécurisée (Backend utilise camelCase pour orderId)
    const orderId = data.orderId || data.id;
    const orderNum = data.orderNumber || data.order_number || 'Inconnu';
    const total = data.total || '0';
    const orderInfo = `Commande #${orderNum} - ${total} HTG`;
    
    console.log("🔔 Exécution de playAlert pour:", orderInfo);

    // 2. VIBRATION (Important pour Android)
    if ("vibrate" in navigator) {
      navigator.vibrate([500, 200, 500, 200, 500]); 
    }

    // 3. LE SON (On force le reset avant de jouer)
    if (audioRef.current) {
      audioRef.current.pause(); // Stop si déjà en cours
      audioRef.current.currentTime = 0;
      audioRef.current.volume = 1.0;
      
      const playPromise = audioRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => console.error("Audio bloqué par Android/Browser:", err));
      }
    }

    // 4. NOTIFICATION NATIVE (Android a besoin de ça pour faire du bruit en arrière-plan)
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification("💰 NOUVELLE COMMANDE !", {
          body: orderInfo,
          icon: '/logo.png',
          tag: `order-${orderId}`,
          requireInteraction: true,
          vibrate: [500, 200, 500],
          silent: false 
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = `/entreprise/orders/${orderId}`;
          notification.close();
        };
      } catch (err) {
        console.error("Erreur notification native:", err);
      }
    }

    // 5. TOAST (Visuel dans l'application)
    toast.error("💰 NOUVELLE COMMANDE !", {
      description: orderInfo,
      duration: Infinity,
      action: {
        label: "OUVRIR",
        onClick: () => window.location.href = `/entreprise/orders/${orderId}`
      },
    });
  }, []);

  // 3. Récupérer la config Pusher
  useEffect(() => {
    base44.functions.invoke('getPusherConfig')
      .then(res => setPusherConfig(res.data))
      .catch(err => console.error('Erreur config Pusher:', err));
  }, []);

  // 4. Connexion à Pusher
  useEffect(() => {
    if (!user?.id || !pusherConfig?.key) return;

    pusherRef.current = new Pusher(pusherConfig.key, {
      cluster: pusherConfig.cluster,
      forceTLS: true
    });

    /** * CANAL MARCHAND : Écoute les nouvelles commandes
     * Correspond au backend : `shop-${shop.user_id}`
     */
    const shopChannel = pusherRef.current.subscribe(`shop-${user.id}`);
    
    shopChannel.bind('new-order', (data) => {
      console.log('🔔 Nouvelle commande reçue via Pusher:', data);
      playAlert(data);
    });

    /** * CANAL CLIENT : Écoute les changements de statut
     * Correspond au backend : `user-${order.client_id}`
     */
    const userChannel = pusherRef.current.subscribe(`user-${user.id}`);
    
    userChannel.bind('order-status-update', (data) => {
      console.log('📦 Mise à jour de commande:', data);
      toast.info(data.title, {
        description: data.message
      });
    });

    // Nettoyage à la déconnexion
    return () => {
      if (pusherRef.current) {
        pusherRef.current.unsubscribe(`shop-${user.id}`);
        pusherRef.current.unsubscribe(`user-${user.id}`);
        pusherRef.current.disconnect();
      }
    };
  }, [user?.id, pusherConfig, playAlert]);

  return {
    requestPermission,
    initialize,
    isInitialized: soundInitialized
  };
}

export const useOrderNotifications = useBrowserNotifications;
export const useNotificationSound = useBrowserNotifications;
export const useNotificationManager = useBrowserNotifications;