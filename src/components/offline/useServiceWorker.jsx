import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('[SW] Registered successfully');

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Every minute

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            console.log('[SW] New version available');

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New service worker is ready
                console.log('[SW] Update ready for installation');
                // Could show user a "update available" notification here
              }
            });
          });
        })
        .catch((error) => {
          console.error('[SW] Registration failed:', error);
        });
    } else {
      console.warn('[SW] Service Workers not supported');
    }
  }, []);

  // Function to cache user data
  const cacheUserData = (data) => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CACHE_DATA',
        payload: data
      });
      console.log('[SW] User data caching requested');
    }
  };

  // Function to clear cache
  const clearCache = () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CLEAR_CACHE'
      });
      console.log('[SW] Cache clear requested');
    }
  };

  return { cacheUserData, clearCache };
}