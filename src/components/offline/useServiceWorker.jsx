import { useEffect } from 'react';

export function useServiceWorker() {
  useEffect(() => {
    // ⚡ Enregistrement optimisé après chargement complet
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker
          .register('/service-worker.js')
          .then((registration) => {
            console.log('✅ [SW] Registered - Cache optimisé pour connexions lentes');

            // ⚡ Vérifier mises à jour toutes les heures (au lieu de chaque minute)
            setInterval(() => {
              registration.update();
            }, 60 * 60 * 1000);

            // ⚡ Nettoyer le cache d'images périodiquement
            setInterval(() => {
              registration.active?.postMessage({ type: 'CLEAN_CACHE' });
            }, 30 * 60 * 1000);

            // Listen for updates
            registration.addEventListener('updatefound', () => {
              const newWorker = registration.installing;
              console.log('[SW] New version available');

              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[SW] Update ready for installation');
                }
              });
            });
          })
          .catch((error) => {
            console.error('[SW] Registration failed:', error);
          });
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