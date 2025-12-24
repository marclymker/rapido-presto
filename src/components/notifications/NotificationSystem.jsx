import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

// Play notification sound
function playNotificationSound(type = 'default') {
  try {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Different sounds for different types
    const frequencies = {
      entreprise: 1000,
      livreur: 900,
      client: 800,
      default: 850
    };
    
    oscillator.frequency.value = frequencies[type] || frequencies.default;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.4);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.4);
  } catch (error) {
    console.error('Audio error:', error);
  }
}

// Show browser notification
function showBrowserNotification(title, options = {}) {
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notification = new Notification(title, {
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        requireInteraction: false,
        ...options
      });
      
      notification.onclick = function() {
        window.focus();
        if (options.data?.url) {
          window.location.href = options.data.url;
        }
        this.close();
      };
      
      return notification;
    } catch (error) {
      console.error('Notification error:', error);
    }
  }
  return null;
}

export function useOrderNotifications(user) {
  const lastCheckRef = useRef(Date.now());
  const notifiedOrdersRef = useRef(new Set());

  // Client notifications - new order updates
  const { data: clientOrders = [] } = useQuery({
    queryKey: ['client-notifications', user?.id],
    queryFn: () => base44.entities.Order.filter({ client_id: user?.id }, '-updated_date', 5),
    enabled: !!user?.id && user?.current_profile === 'client',
    refetchInterval: 10000
  });

  // Entreprise notifications - new pending orders
  const { data: shopOrders = [] } = useQuery({
    queryKey: ['shop-notifications', user?.id],
    queryFn: () => base44.entities.Order.filter({ shop_id: user?.id, status: 'pending' }, '-created_date'),
    enabled: !!user?.id && user?.current_profile === 'entreprise',
    refetchInterval: 5000
  });

  // Livreur notifications - new available orders
  const { data: availableOrders = [] } = useQuery({
    queryKey: ['driver-notifications', user?.id],
    queryFn: async () => {
      const orders = await base44.entities.Order.filter({ 
        status: 'searching_driver'
      }, '-created_date');
      return orders.filter(o => 
        o.shop_commune === user?.commune || o.client_commune === user?.commune
      );
    },
    enabled: !!user?.id && user?.current_profile === 'livreur' && user?.profiles?.livreur?.is_available,
    refetchInterval: 5000
  });

  // Client notifications
  useEffect(() => {
    if (user?.current_profile !== 'client' || !clientOrders.length) return;

    clientOrders.forEach(order => {
      const orderUpdated = new Date(order.updated_date).getTime();
      const key = `${order.id}-${order.status}`;
      
      if (orderUpdated > lastCheckRef.current && !notifiedOrdersRef.current.has(key)) {
        notifiedOrdersRef.current.add(key);
        
        if (order.status === 'preparing') {
          toast.success('Votre commande est en préparation!', {
            description: `Commande #${order.order_number}`
          });
          playNotificationSound('client');
          showBrowserNotification('🍽️ Commande en préparation', {
            body: `Votre commande #${order.order_number} est en cours de préparation`,
            tag: order.id
          });
        } else if (order.status === 'driver_assigned') {
          toast.info('Un livreur a été assigné!', {
            description: `${order.driver_name} va livrer votre commande`
          });
          playNotificationSound('client');
          showBrowserNotification('🚴 Livreur assigné', {
            body: `${order.driver_name} va livrer votre commande`,
            tag: order.id
          });
        } else if (order.status === 'in_delivery') {
          toast.info('Votre commande est en route!', {
            description: `${order.driver_name} est en chemin`
          });
          playNotificationSound('client');
          showBrowserNotification('🚚 Commande en route', {
            body: `${order.driver_name} est en chemin vers vous`,
            tag: order.id
          });
        } else if (order.status === 'cancelled') {
          toast.error('Commande annulée', {
            description: `Commande #${order.order_number} a été annulée`
          });
          playNotificationSound('client');
          showBrowserNotification('❌ Commande annulée', {
            body: `La commande #${order.order_number} a été annulée`,
            tag: order.id
          });
        }
      }
    });

    lastCheckRef.current = Date.now();
  }, [clientOrders, user]);

  // Entreprise notifications
  useEffect(() => {
    if (user?.current_profile !== 'entreprise' || !shopOrders.length) return;

    shopOrders.forEach(order => {
      const orderCreated = new Date(order.created_date).getTime();
      const key = order.id;
      
      if (orderCreated > lastCheckRef.current - 10000 && !notifiedOrdersRef.current.has(key)) {
        notifiedOrdersRef.current.add(key);
        toast.success('Nouvelle commande reçue!', {
          description: `Commande #${order.order_number} - ${order.total} HTG`,
          duration: 8000
        });
        playNotificationSound('entreprise');
        showBrowserNotification('🛒 Nouvelle commande!', {
          body: `Commande #${order.order_number} - ${order.total} HTG\n${order.items?.length || 0} article(s)`,
          tag: order.id,
          requireInteraction: true
        });
      }
    });
  }, [shopOrders, user]);

  // Livreur notifications
  useEffect(() => {
    if (user?.current_profile !== 'livreur' || !availableOrders.length) return;
    if (!user?.profiles?.livreur?.is_available) return;

    availableOrders.forEach(order => {
      const orderCreated = new Date(order.created_date).getTime();
      const key = order.id;
      
      if (orderCreated > lastCheckRef.current - 10000 && !notifiedOrdersRef.current.has(key)) {
        notifiedOrdersRef.current.add(key);
        toast.info('Nouvelle livraison disponible!', {
          description: `${order.shop_name} → ${order.client_commune} - ${order.total} HTG`,
          duration: 10000
        });
        playNotificationSound('livreur');
        showBrowserNotification('📦 Nouvelle livraison!', {
          body: `${order.shop_name} → ${order.client_commune}\nGagnez ${order.total} HTG`,
          tag: order.id,
          requireInteraction: true
        });
      }
    });
  }, [availableOrders, user]);

  return {
    pendingShopOrders: shopOrders.length,
    availableDeliveries: availableOrders.length
  };
}