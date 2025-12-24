import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export function useWebSocket({ channel, userId, onUpdate, enabled = true }) {
  const wsRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const queryClient = useQueryClient();
  
  const connect = useCallback(() => {
    if (!enabled || !channel) return;
    
    try {
      // Construire l'URL WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/functions/websocket?channel=${channel}&userId=${userId || 'anonymous'}`;
      
      console.log('Connecting to WebSocket:', wsUrl);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
      };
      
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
            return;
          }
          
          if (data.type === 'update') {
            console.log('WebSocket update received:', data);
            setLastUpdate(data);
            
            // Invalider les queries React Query pour rafraîchir les données
            if (data.entity) {
              queryClient.invalidateQueries([data.entity]);
            }
            
            // Callback personnalisé
            if (onUpdate) {
              onUpdate(data);
            }
          }
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket closed, reconnecting...');
        setIsConnected(false);
        
        // Reconnexion automatique après 3 secondes
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('WebSocket connection error:', error);
    }
  }, [channel, userId, enabled, onUpdate, queryClient]);
  
  useEffect(() => {
    connect();
    
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);
  
  const broadcast = useCallback((entity, action) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'broadcast',
        entity,
        action
      }));
    }
  }, []);
  
  return { isConnected, lastUpdate, broadcast };
}

export function useAutoRefresh({ queryKey, refetchInterval = 5000, enabled = true }) {
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!enabled) return;
    
    const interval = setInterval(() => {
      queryClient.invalidateQueries(queryKey);
    }, refetchInterval);
    
    return () => clearInterval(interval);
  }, [queryKey, refetchInterval, enabled, queryClient]);
}