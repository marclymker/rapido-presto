import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import Pusher from 'pusher-js'; // S'assurer que le package est installé ou chargé via CDN

export function useBrowserNotifications(user) {
  const audioRef = useRef(null);
  const pusherRef = useRef(null);

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
    const orderInfo = `Commande #${data.orderNumber || data.order_number || ''} - ${data.total || ''} HTG`;
    
    if ("vibrate" in navigator) navigator.vibrate([500, 200, 500]);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.log("Audio bloqué:", err));
    }

    if ("Notification" in window && Notification.permission === "granted") {
      const notification = new Notification("💰 NOUVELLE COMMANDE !", {
        body: orderInfo,
        icon: '/logo.png',
        tag: `order-${data.orderId || data.id}`,
        requireInteraction: true,
      });
      notification.onclick = () => {
        window.focus();
        window.location.href = `/entreprise/orders/${data.orderId || data.id}`;
        notification.close();
      };
    }

    toast.error("💰 NOUVELLE COMMANDE !", {
      description: orderInfo,
      duration: Infinity,
      action: {
        label: "OUVRIR",
        onClick: () => window.location.href = `/entreprise/orders/${data.orderId || data.id}`
      },
    });
  }, []);

  // 3. Connexion à Pusher
  useEffect(() => {
    if (!user?.id) return;

    // Initialisation Pusher (Remplace les clés si nécessaire)
    // Les clés publiques sont sécurisées dans le frontend
    pusherRef.current = new Pusher('TA_PUSHER_KEY', {
      cluster: 'us2',
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
  }, [user?.id, playAlert]);
}

export const useOrderNotifications = useBrowserNotifications;