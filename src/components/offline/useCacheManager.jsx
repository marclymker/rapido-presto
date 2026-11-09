import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { firebaseApi } from '@/api/firebaseClient';
import { useServiceWorker } from './useServiceWorker';

export function useCacheManager(user) {
  const { cacheUserData } = useServiceWorker();

  // Cache user data when authenticated
  useEffect(() => {
    if (user?.id) {
      const userData = {
        user: JSON.stringify(user),
        'user-profile': JSON.stringify(user)
      };
      cacheUserData(userData);
      console.log('[Cache] User data cached');
    }
  }, [user?.id, cacheUserData]);

  // Cache products periodically
  const { data: products } = useQuery({
    queryKey: ['products-cache'],
    queryFn: async () => {
      const items = await firebaseApi.entities.Product.list('-created_date', 50);
      if (items.length > 0) {
        cacheUserData({
          'products-list': JSON.stringify(items)
        });
        console.log('[Cache] Products cached:', items.length);
      }
      return items;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });

  // Cache shops periodically
  const { data: shops } = useQuery({
    queryKey: ['shops-cache'],
    queryFn: async () => {
      const items = await firebaseApi.entities.Shop.list('-rating', 20);
      if (items.length > 0) {
        cacheUserData({
          'shops-list': JSON.stringify(items)
        });
        console.log('[Cache] Shops cached:', items.length);
      }
      return items;
    },
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Cache user's cart if authenticated
  const { data: cartItems } = useQuery({
    queryKey: ['cart-cache', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const items = await firebaseApi.entities.CartItem.filter({ user_id: user.id });
      if (items.length > 0) {
        cacheUserData({
          'cart-items': JSON.stringify(items)
        });
        console.log('[Cache] Cart cached:', items.length);
      }
      return items;
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
  });

  // Cache user's orders if authenticated
  const { data: orders } = useQuery({
    queryKey: ['orders-cache', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const items = await firebaseApi.entities.Order.filter({ client_id: user.id }, '-created_date', 20);
      if (items.length > 0) {
        cacheUserData({
          'orders-list': JSON.stringify(items)
        });
        console.log('[Cache] Orders cached:', items.length);
      }
      return items;
    },
    enabled: !!user?.id,
    staleTime: 3 * 60 * 1000,
    gcTime: 20 * 60 * 1000,
  });

  return {
    cachedProducts: products,
    cachedShops: shops,
    cachedCartItems: cartItems,
    cachedOrders: orders
  };
}
