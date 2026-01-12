import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Pusher from 'npm:pusher';

// Configuration Pusher (Récupérée depuis tes secrets Base44)
const pusher = new Pusher({
  appId: Deno.env.get('PUSHER_APP_ID'),
  key: Deno.env.get('PUSHER_KEY'),
  secret: Deno.env.get('PUSHER_SECRET'),
  cluster: Deno.env.get('PUSHER_CLUSTER'),
  useTLS: true
});

const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');

// Helper pour OneSignal (Push Mobile)
async function sendOneSignalNotification(userIds, title, message, url = "https://rapido.ht") {
  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) return;
  const activeIds = userIds.filter(id => id != null);
  if (activeIds.length === 0) return;

  try {
    await fetch('https://onesignal.com/api/v1/notifications', {
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
        priority: 10
      })
    });
  } catch (error) {
    console.error('Erreur OneSignal:', error);
  }
}

// Helper pour Pusher (Temps réel interface Web)
async function sendRealtimeUpdate(channel, event, data) {
  try {
    await pusher.trigger(channel, event, data);
    console.log(`✅ Pusher envoyé sur ${channel}`);
  } catch (err) {
    console.error('⚠️ Erreur Pusher:', err);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId, status } = await req.json();
    
    if (!orderId || !status) {
      return Response.json({ error: 'orderId et status requis' }, { status: 400 });
    }

    // 1. Récupération des données
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    if (!order) return Response.json({ error: 'Commande introuvable' }, { status: 404 });

    const shop = await base44.asServiceRole.entities.Shop.get(order.shop_id);
    const baseUrl = 'https://rapido.ht';
    
    // 2. Logique de Notification
    let notificationTitle = "";
    let notificationMessage = "";

    switch (status) {
      case 'pending':
        notificationTitle = '✅ Commande confirmée';
        notificationMessage = `Votre commande #${order.order_number} est en cours.`;
        
        // Alerte Temps Réel pour le Marchand
        if (shop?.user_id) {
          await sendRealtimeUpdate(`shop-${shop.user_id}`, 'new-order', {
            orderId: order.id,
            orderNumber: order.order_number,
            total: order.total
          });
          
          await sendOneSignalNotification([shop.user_id], '💰 Nouvelle Commande !', `Reçue : ${order.total} HTG`, `${baseUrl}/entreprise/orders`);
        }
        break;

      case 'preparing':
        notificationTitle = '👨‍🍳 En préparation';
        notificationMessage = `La commande #${order.order_number} est en cuisine.`;
        break;

      case 'ready':
        notificationTitle = '✅ Commande prête';
        notificationMessage = `Commande #${order.order_number} prête. Recherche de livreur...`;
        break;

      case 'delivered':
        notificationTitle = '🎉 Livraison terminée';
        notificationMessage = `Commande #${order.order_number} livrée. Bon appétit !`;
        if (shop?.user_id) {
            await sendOneSignalNotification([shop.user_id], '✅ Livrée', `Commande #${order.order_number} terminée.`);
        }
        break;

      // ... Ajoute les autres cas ici si nécessaire
    }

    // 3. Notification Client (OneSignal + Pusher)
    if (notificationTitle) {
      await sendOneSignalNotification([order.client_id], notificationTitle, notificationMessage);
      await sendRealtimeUpdate(`user-${order.client_id}`, 'order-status-update', {
        orderId: order.id,
        status: status,
        title: notificationTitle,
        message: notificationMessage
      });
    }

    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Erreur Globale:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});