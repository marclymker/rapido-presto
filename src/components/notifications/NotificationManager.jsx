import { useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';

export function useBrowserNotifications(user) {
  const audioRef = useRef(null);
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Précharger l'audio
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
  
  const playAlert = useCallback((data) => {
    const orderInfo = `Commande #${data.orderNumber || data.order_number || ''} - ${data.total || ''} HTG`;
    
    // 1. Vibration
    if ("vibrate" in navigator) {
      navigator.vibrate([500, 200, 500]);
    }

    // 2. Son
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => {
        console.log("Audio bloqué:", err);
      });
    }

    // 3. Notification native
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        const notification = new Notification("💰 NOUVELLE COMMANDE !", {
          body: orderInfo,
          icon: '/logo.png',
          badge: '/badge.png',
          tag: `order-${data.orderId || data.id}`,
          requireInteraction: true,
          vibrate: [500, 200, 500],
          silent: false
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = `/entreprise/orders/${data.orderId || data.id}`;
          notification.close();
        };
      } catch (err) {
        console.log("Notification native échouée:", err);
      }
    }

    // 4. Toast
    toast.error("💰 NOUVELLE COMMANDE !", {
      description: orderInfo,
      duration: Infinity,
      action: {
        label: "OUVRIR",
        onClick: () => window.location.href = `/entreprise/orders/${data.orderId || data.id}`
      },
    });
  }, []);

  // Connexion WebSocket
  const connectWebSocket = useCallback(() => {
    if (!user?.id) return;

    // URL de ta fonction websocket Base44
    const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/functions/websocket?channel=orders&userId=${user.id}`;
    
    try {
      wsRef.current = new WebSocket(wsUrl);
      
      wsRef.current.onopen = () => {
        console.log('✅ WebSocket connecté');
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };
      
      wsRef.current.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          console.log('📨 Message WebSocket reçu:', message);
          
          // Répondre au ping
          if (message.type === 'ping') {
            wsRef.current.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          
          // Nouvelle commande
          if (message.type === 'update' && message.entity === 'order' && message.action === 'new') {
            console.log('🔔 Nouvelle commande détectée!');
            playAlert(message.data || message);
          }
          
        } catch (error) {
          console.error('Erreur parsing WebSocket:', error);
        }
      };
      
      wsRef.current.onerror = (error) => {
        console.error('❌ Erreur WebSocket:', error);
      };
      
      wsRef.current.onclose = () => {
        console.log('🔌 WebSocket déconnecté, reconnexion dans 5s...');
        // Reconnexion automatique
        reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
      };
      
    } catch (error) {
      console.error('Erreur création WebSocket:', error);
      reconnectTimeoutRef.current = setTimeout(connectWebSocket, 5000);
    }
  }, [user, playAlert]);

  // Initialiser WebSocket
  useEffect(() => {
    connectWebSocket();
    
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [connectWebSocket]);
}

// Exports alternatifs
export const useNotificationSound = useBrowserNotifications;
export const useNotificationManager = useBrowserNotifications;
export const useOrderNotifications = useBrowserNotifications;