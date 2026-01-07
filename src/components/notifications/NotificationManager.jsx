import { useEffect, useCallback } from 'react';
import { toast } from 'sonner';

export function useNotificationManager(user) {
  
  const playAlert = useCallback((data) => {
    // 1. Vibration
    if ("vibrate" in navigator) {
      navigator.vibrate([500, 200, 500]);
    }

    // 2. Son
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => {});

    // 3. Toast persistant
    toast.error("💰 NOUVELLE COMMANDE !", {
      description: `Commande #${data.orderNumber || ''} - ${data.total || ''} HTG`,
      duration: Infinity,
      action: {
        label: "OUVRIR",
        onClick: () => window.location.href = `/entreprise/orders/${data.orderId}`
      },
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Chargement dynamique du script Pusher (Méthode CDN)
    if (!window.Pusher) {
      const script = document.createElement('script');
      script.src = "https://js.pusher.com/8.2.0/pusher.min.js";
      script.async = true;
      script.onload = () => initPusher();
      document.head.appendChild(script);
    } else {
      initPusher();
    }

    let pusherInstance = null;

    function initPusher() {
      // REMPLACEZ 'VOTRE_KEY' ET 'VOTRE_CLUSTER' PAR VOS INFOS PUSHER
      pusherInstance = new window.Pusher('VOTRE_KEY', {
        cluster: 'VOTRE_CLUSTER',
        forceTLS: true
      });

      const channel = pusherInstance.subscribe(`user-${user.id}`);
      
      channel.bind('new-order', (data) => {
        console.log("Signal reçu via Pusher:", data);
        playAlert(data);
      });
    }

    return () => {
      if (pusherInstance) pusherInstance.disconnect();
    };
  }, [user, playAlert]);
}