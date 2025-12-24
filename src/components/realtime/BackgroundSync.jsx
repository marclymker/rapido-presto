import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Détection du type de connexion
function getConnectionType() {
  const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
  
  if (!connection) return 'unknown';
  
  const type = connection.effectiveType;
  const downlink = connection.downlink;
  const saveData = connection.saveData;
  
  if (saveData) return 'slow';
  if (type === '4g' && downlink > 5) return 'fast';
  if (type === '4g') return 'medium';
  if (type === '3g') return 'medium';
  return 'slow';
}

// Polling adaptatif basé sur la connexion et l'activité
function getPollingInterval(connectionType, isVisible, isActive) {
  if (!isVisible) return 120000; // 2 min quand invisible
  
  if (connectionType === 'slow' || !isActive) {
    return 90000; // 1.5 min pour connexion lente
  }
  
  if (connectionType === 'medium') {
    return 75000; // 1.25 min pour connexion moyenne
  }
  
  return 60000; // 1 min pour connexion rapide
}

export function useBackgroundSync({ userType, enabled = true }) {
  const queryClient = useQueryClient();
  const [syncStatus, setSyncStatus] = useState('idle');
  const [lastSync, setLastSync] = useState(null);
  const intervalRef = useRef(null);
  const isVisibleRef = useRef(true);
  const lastActivityRef = useRef(Date.now());
  const connectionTypeRef = useRef(getConnectionType());
  
  // Détecter la visibilité de la page
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      
      if (!document.hidden) {
        // Page visible: sync immédiat
        syncData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);
  
  // Détecter l'activité utilisateur
  useEffect(() => {
    const updateActivity = () => {
      lastActivityRef.current = Date.now();
    };
    
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, updateActivity, { passive: true });
    });
    
    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateActivity);
      });
    };
  }, []);
  
  // Détecter les changements de connexion
  useEffect(() => {
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    
    if (connection) {
      const handleConnectionChange = () => {
        connectionTypeRef.current = getConnectionType();
        console.log('Connection changed:', connectionTypeRef.current);
        // Réinitialiser l'intervalle avec la nouvelle connexion
        setupPolling();
      };
      
      connection.addEventListener('change', handleConnectionChange);
      return () => connection.removeEventListener('change', handleConnectionChange);
    }
  }, []);
  
  const syncData = useCallback(async () => {
    if (!enabled || !userType) return;
    
    try {
      setSyncStatus('syncing');
      
      const response = await base44.functions.invoke('backgroundSync', {
        action: 'sync',
        userType
      });
      
      if (response.data.success) {
        // Mettre à jour les données dans le cache React Query
        const data = response.data;
        
        if (data.orders) {
          queryClient.setQueryData(['orders'], data.orders);
          if (userType === 'entreprise') {
            queryClient.setQueryData(['shop-orders'], data.orders);
          }
          if (userType === 'client') {
            queryClient.setQueryData(['my-orders'], data.orders);
          }
          if (userType === 'livreur') {
            queryClient.setQueryData(['driver-orders'], data.myOrders);
            queryClient.setQueryData(['available-orders'], data.availableOrders);
          }
        }
        
        if (data.cartItems) {
          queryClient.setQueryData(['cart'], data.cartItems);
        }
        
        if (data.products) {
          queryClient.setQueryData(['my-products'], data.products);
        }
        
        setLastSync(new Date());
        setSyncStatus('success');
      }
    } catch (error) {
      console.error('Background sync error:', error);
      setSyncStatus('error');
    } finally {
      setTimeout(() => setSyncStatus('idle'), 2000);
    }
  }, [enabled, userType, queryClient]);
  
  const setupPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    
    if (!enabled) return;
    
    const isActive = Date.now() - lastActivityRef.current < 60000; // Actif dans la dernière minute
    const interval = getPollingInterval(
      connectionTypeRef.current,
      isVisibleRef.current,
      isActive
    );
    
    console.log(`Background sync interval: ${interval}ms`);
    
    intervalRef.current = setInterval(() => {
      const currentIsActive = Date.now() - lastActivityRef.current < 60000;
      const currentInterval = getPollingInterval(
        connectionTypeRef.current,
        isVisibleRef.current,
        currentIsActive
      );
      
      // Si l'intervalle a changé, reconfigurer
      if (currentInterval !== interval) {
        setupPolling();
        return;
      }
      
      syncData();
    }, interval);
    
    // Sync immédiat au setup
    syncData();
  }, [enabled, syncData]);
  
  useEffect(() => {
    setupPolling();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [setupPolling]);
  
  // Sync au retour de la page
  useEffect(() => {
    const handleFocus = () => {
      syncData();
    };
    
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [syncData]);
  
  return {
    syncStatus,
    lastSync,
    syncNow: syncData,
    connectionType: connectionTypeRef.current
  };
}

// Hook pour enregistrer le Service Worker
export function useServiceWorker() {
  const [registration, setRegistration] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(reg => {
          console.log('Service Worker registered');
          setRegistration(reg);
          
          // Détecter les mises à jour
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setUpdateAvailable(true);
              }
            });
          });
        })
        .catch(err => console.log('Service Worker registration failed:', err));
      
      // Écouter les messages du Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data.type === 'BACKGROUND_SYNC_COMPLETE') {
          console.log('Background sync completed:', event.data);
        }
      });
    }
  }, []);
  
  const update = useCallback(() => {
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      window.location.reload();
    }
  }, [registration]);
  
  return { registration, updateAvailable, update };
}

// Composant indicateur de sync
export function BackgroundSyncIndicator({ syncStatus, lastSync, connectionType }) {
  if (syncStatus === 'idle' && !lastSync) return null;
  
  const statusColors = {
    idle: 'bg-slate-200 text-slate-600',
    syncing: 'bg-blue-200 text-blue-700 animate-pulse',
    success: 'bg-green-200 text-green-700',
    error: 'bg-red-200 text-red-700'
  };
  
  const connectionIcons = {
    fast: '🚀',
    medium: '📶',
    slow: '🐌',
    unknown: '📡'
  };
  
  return (
    <div className={`fixed bottom-20 right-4 px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 ${statusColors[syncStatus]} transition-all z-50`}>
      <span>{connectionIcons[connectionType] || '📡'}</span>
      {syncStatus === 'syncing' && <span>Sync...</span>}
      {syncStatus === 'success' && lastSync && (
        <span>
          ✓ {new Date(lastSync).toLocaleTimeString('fr-FR', { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      )}
      {syncStatus === 'error' && <span>Erreur sync</span>}
    </div>
  );
}