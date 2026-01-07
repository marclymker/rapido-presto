import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export function useBrowserNotifications(user) {
  const audioRef = useRef(null);

  // Précharger l'audio au montage du composant
  useEffect(() => {
    audioRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
    audioRef.current.load(); // Précharge le fichier
    
    // Débloquer l'audio avec un clic utilisateur (workaround navigateurs)
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
  
  const playAlert = useCallback((data) => {
    const orderInfo = `Commande #${data.orderNumber || ''} - ${data.total || ''} HTG`;
    
    // 1. Vibration pour mobile
    if ("vibrate" in navigator) {
      navigator.vibrate([500, 200, 500]);
    }

    // 2. Son d'alerte
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log("Audio bloqué:", err);
      });
    }

    // 3. Notification système native (popup + son système)
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification("💰 NOUVELLE COMMANDE !", {
          body: orderInfo,
          icon: '/logo.png', // Ajoute ton logo ici
          badge: '/badge.png', // Badge pour Android
          tag: `order-${data.orderId}`, // Évite les doublons
          requireInteraction: true, // Reste affichée jusqu'au clic
          vibrate: [500, 200, 500],
          // Son système (selon le navigateur/OS)
          silent: false
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = `/entreprise/orders/${data.orderId}`;
          notification.close();
        };
      } catch (err) {
        console.log("Notification native échouée:", err);
      }
    }

    // 4. Toast (fallback si pas de permission)
    toast.error("💰 NOUVELLE COMMANDE !", {
      description: orderInfo,
      duration: Infinity,
      action: {
        label: "OUVRIR",
        onClick: () => window.location.href = `/entreprise/orders/${data.orderId}`
      },
    });
  }, []);

  useEffect(() => {
    if (!user?.id) return;

    // Chargement de Pusher via CDN
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
      pusherInstance = new window.Pusher('VOTRE_KEY', {
        cluster: 'VOTRE_CLUSTER',
        forceTLS: true
      });

      const channel = pusherInstance.subscribe(`user-${user.id}`);
      
      channel.bind('new-order', (data) => {
        console.log("Commande reçue:", data);
        playAlert(data);
      });
    }

    return () => {
      if (pusherInstance) pusherInstance.disconnect();
    };
  }, [user, playAlert]);
}