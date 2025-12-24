import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';

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
          playNotificationSound();
        } else if (order.status === 'driver_assigned') {
          toast.info('Un livreur a été assigné!', {
            description: `${order.driver_name} va livrer votre commande`
          });
          playNotificationSound();
        } else if (order.status === 'in_delivery') {
          toast.info('Votre commande est en route!', {
            description: `${order.driver_name} est en chemin`
          });
          playNotificationSound();
        } else if (order.status === 'cancelled') {
          toast.error('Commande annulée', {
            description: `Commande #${order.order_number} a été annulée`
          });
          playNotificationSound();
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
        playNotificationSound();
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
        playNotificationSound();
      }
    });
  }, [availableOrders, user]);

  return {
    pendingShopOrders: shopOrders.length,
    availableDeliveries: availableOrders.length
  };
}

function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZUQ0PVqvn77BdGQU+ltrywnMnBSh+zfHaizsIGGS59uighRALUKXh8bllHgU2k9n0y38tBSp3y/HdlkILEl+y6OyrWRYLRp3e8b9uJAU0hdPz1YU1Bhxrvu7mnlcOD1Sr5O+zYRsGPJPX88F3KwUpe8zw24w+CBhkvPTonFENDlOo4/K4aB8GM5DY88V7LgUqd8rx3Y9BCxFdsuru+yI+CBhkvPXmn1UOEFWq5O+1YhsGOo/V88J4LAUpe8vw24s+CBdk');
    audio.volume = 0.3;
    audio.play().catch(() => {});
  } catch (e) {}
}