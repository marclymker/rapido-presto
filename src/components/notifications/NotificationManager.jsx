import { useEffect, useCallback } from 'react';
import Pusher from 'pusher-js';
import { toast } from 'sonner';

export function useNotificationManager(user) {
  
  const playAlert = useCallback((data) => {
    // VIBRATION : Marche très bien sur APK Android
    if ("vibrate" in navigator) {
      navigator.vibrate([500, 200, 500]);
    }

    // SON
    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audio.play().catch(() => console.log("Audio en attente d'interaction"));

    // TOAST PERSISTANT
    toast.error("💰 NOUVELLE COMMANDE !", {
      description: `Commande #${data.orderNumber} - ${data.total} HTG`,
      duration: Infinity, // Reste à l'écran
      action: {
        label: "OUVRIR",
        onClick: () => window.location.href = `/entreprise/orders/${data.orderId}`
      },
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Activer le mode debug pour voir les logs dans ton APK
    Pusher.logToConsole = true;

    const pusher = new Pusher('TA_CLE_PUSHER', {
      cluster: 'TA_ZONE',
      forceTLS: true
    });

    console.log("Connexion Pusher pour l'utilisateur:", user.id);
    const channel = pusher.subscribe(`user-${user.id}`);

    channel.bind('new-order', (data) => {
      console.log("Signal Pusher reçu !", data);
      playAlert(data);
    });

    return () => {
      pusher.unsubscribe(`user-${user.id}`);
      pusher.disconnect();
    };
  }, [user, playAlert]);
}