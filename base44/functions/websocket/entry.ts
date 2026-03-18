import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

// Map pour stocker les connexions actives par type
const connections = new Map();

Deno.serve(async (req) => {
  // Gérer la connexion WebSocket
  if (req.headers.get("upgrade") === "websocket") {
    const { socket, response } = Deno.upgradeWebSocket(req);
    
    const url = new URL(req.url);
    const channel = url.searchParams.get('channel') || 'default';
    const userId = url.searchParams.get('userId');
    
    socket.onopen = () => {
      console.log(`WebSocket connected - Channel: ${channel}, User: ${userId}`);
      
      // Ajouter la connexion à la map
      if (!connections.has(channel)) {
        connections.set(channel, new Set());
      }
      connections.get(channel).add({ socket, userId });
      
      // Envoyer confirmation
      socket.send(JSON.stringify({ 
        type: 'connected', 
        channel,
        timestamp: new Date().toISOString() 
      }));
      
      // Démarrer le heartbeat
      const heartbeat = setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'ping' }));
        } else {
          clearInterval(heartbeat);
        }
      }, 30000); // Ping toutes les 30 secondes
    };
    
    socket.onmessage = async (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'pong') {
          return;
        }
        
        // Broadcaster à tous les clients du même channel
        if (data.type === 'broadcast' && connections.has(channel)) {
          for (const conn of connections.get(channel)) {
            if (conn.socket.readyState === WebSocket.OPEN) {
              conn.socket.send(JSON.stringify({
                type: 'update',
                entity: data.entity,
                action: data.action,
                timestamp: new Date().toISOString()
              }));
            }
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    };
    
    socket.onclose = () => {
      console.log(`WebSocket closed - Channel: ${channel}`);
      if (connections.has(channel)) {
        const channelConns = connections.get(channel);
        channelConns.forEach(conn => {
          if (conn.socket === socket) {
            channelConns.delete(conn);
          }
        });
        if (channelConns.size === 0) {
          connections.delete(channel);
        }
      }
    };
    
    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    return response;
  }
  
  // API REST pour notifier les changements
  if (req.method === 'POST') {
    try {
      const base44 = createClientFromRequest(req);
      const user = await base44.auth.me();
      
      if (!user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
      }
      
      const { channel, entity, action } = await req.json();
      
      // Broadcaster aux WebSockets connectés
      if (connections.has(channel)) {
        for (const conn of connections.get(channel)) {
          if (conn.socket.readyState === WebSocket.OPEN) {
            conn.socket.send(JSON.stringify({
              type: 'update',
              entity,
              action,
              timestamp: new Date().toISOString()
            }));
          }
        }
      }
      
      return Response.json({ success: true, notified: connections.get(channel)?.size || 0 });
    } catch (error) {
      return Response.json({ error: error.message }, { status: 500 });
    }
  }
  
  return Response.json({ 
    status: 'WebSocket server running',
    channels: Array.from(connections.keys()),
    totalConnections: Array.from(connections.values()).reduce((sum, set) => sum + set.size, 0)
  });
});