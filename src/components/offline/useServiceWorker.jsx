import { useEffect } from 'react';
import { readQueue } from '@/lib/useCartSync';

export function useServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').then((registration) => {
        // Check for updates every hour
        setInterval(() => registration.update(), 60 * 60 * 1000);

        // Trim image cache every 30 min
        setInterval(() => {
          registration.active?.postMessage({ type: 'CLEAN_CACHE' });
        }, 30 * 60 * 1000);

        // Handle SW messages (cart queue flush)
        navigator.serviceWorker.addEventListener('message', (event) => {
          if (event.data?.type === 'PROCESS_CART_QUEUE') {
            window.dispatchEvent(new CustomEvent('rp:flush-cart-queue'));
          }
        });
      }).catch((err) => {
        console.warn('[SW] Registration failed:', err);
      });
    });
  }, []);

  // Request Background Sync when cart action is queued
  const requestCartSync = async () => {
    if (!('serviceWorker' in navigator) || !('SyncManager' in window)) return;
    const reg = await navigator.serviceWorker.ready;
    try { await reg.sync.register('sync-cart'); } catch {}
  };

  const clearCache = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    }
  };

  // Legacy compat
  const cacheUserData = () => {};

  return { cacheUserData, clearCache, requestCartSync };
}