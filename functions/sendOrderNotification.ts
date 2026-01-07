import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');

async function sendOneSignalNotification(userIds, title, message, url = "https://rapido.ht") {
  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) return;

  const activeIds = userIds.filter(id => id != null);
  if (activeIds.length === 0) return;

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: activeIds, 
        headings: { en: title, fr: title },
        contents: { en: message, fr: message },
        launch_url: url,
        priority: 10,
        android_accent_color: "FFFF5722",
        small_icon: "ic_stat_onesignal_default",
        content_available: true,
      })
    });

    const result = await response.json();
    console.log(`Résultat OneSignal pour ${activeIds.length} users:`, result);
  } catch (error) {
    console.error('Erreur fetch OneSignal:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId, status } = await req.json();
    
    if (!orderId || !status) {
      return Response.json({ error: 'orderId et status requis' }, { status: 400 });
    }

    // Récupérer la commande
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) {
      return Response.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    // Récupérer la boutique
    const shop = await base44.asServiceRole.entities.Shop.get(order.shop_id);
    
    const baseUrl = 'https://rapido.ht';
    
    // Envoi des notifications selon le statut
    switch (status) {
      case 'pending':
        // Client
        await sendOneSignalNotification(
          [order.client_id], 
          '✅ Commande confirmée', 
          `Votre commande #${order.order_number} est en cours.`
        );
        // Marchand
        if (shop?.user_id) {
          await sendOneSignalNotification(
            [shop.user_id], 
            '💰 Nouvelle Commande !', 
            `Reçue : ${order.total} HTG`, 
            `${baseUrl}/entreprise/orders`
          );
          
          // NOUVEAU : Notification WebSocket en temps réel
          try {
            await fetch(`${baseUrl}/api/functions/websocket`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                channel: 'orders',
                entity: 'order',
                action: 'new',
                data: {
                  orderId: order.id,
                  orderNumber: order.order_number,
                  total: order.total,
                  status: status,
                  shopUserId: shop.user_id
                }
              })
            });
            console.log('✅ Notification WebSocket envoyée');
          } catch (wsError) {
            console.log('⚠️ WebSocket notification échouée:', wsError);
          }
        }
        break;
        
      case 'preparing':
        await sendOneSignalNotification(
          [order.client_id], 
          '👨‍🍳 Commande en préparation', 
          `Votre commande #${order.order_number} est en cours de préparation.`
        );
        break;
        
      case 'ready':
        await sendOneSignalNotification(
          [order.client_id], 
          '✅ Commande prête', 
          `Commande #${order.order_number} prête. Recherche de livreur...`
        );
        break;
        
      case 'driver_assigned':
        await sendOneSignalNotification(
          [order.client_id], 
          '🚗 Livreur en route', 
          `Votre commande #${order.order_number} arrive bientôt !`
        );
        break;
        
      case 'in_delivery':
        await sendOneSignalNotification(
          [order.client_id], 
          '📦 En livraison', 
          `Votre commande #${order.order_number} est en cours de livraison.`
        );
        break;
        
      case 'delivered':
        await sendOneSignalNotification(
          [order.client_id], 
          '🎉 Livraison terminée', 
          `Commande #${order.order_number} livrée. Bon appétit !`
        );
        if (shop?.user_id) {
          await sendOneSignalNotification(
            [shop.user_id], 
            '✅ Commande livrée', 
            `Commande #${order.order_number} livrée avec succès.`
          );
        }
        break;
        
      case 'cancelled':
        await sendOneSignalNotification(
          [order.client_id], 
          '❌ Commande annulée', 
          `Votre commande #${order.order_number} a été annulée.`
        );
        if (shop?.user_id) {
          await sendOneSignalNotification(
            [shop.user_id], 
            '❌ Commande annulée', 
            `Commande #${order.order_number} annulée.`
          );
        }
        break;
    }
    
    return Response.json({ 
      success: true, 
      message: `Notifications envoyées pour commande ${order.order_number}` 
    });
    
  } catch (error) {
    console.error('Erreur sendOrderNotification:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});