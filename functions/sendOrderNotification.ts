import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Pusher from 'npm:pusher';

// Configuration Pusher unique
const pusher = new Pusher({
  appId: Deno.env.get('PUSHER_APP_ID'),
  key: Deno.env.get('PUSHER_KEY'),
  secret: Deno.env.get('PUSHER_SECRET'),
  cluster: Deno.env.get('PUSHER_CLUSTER'),
  useTLS: true
});

// Fonction simplifiée pour le temps réel
async function sendRealtimeUpdate(channel, event, data) {
  try {
    await pusher.trigger(channel, event, data);
    console.log(`✅ Pusher envoyé : [${channel}] -> ${event}`);
  } catch (err) {
    console.error('⚠️ Erreur Pusher:', err);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    const { orderId, status } = await req.json();
    
    if (!orderId || !status) {
      return Response.json({ error: 'orderId et status requis' }, { status: 400 });
    }

    // SÉCURITÉ: Récupérer la commande avec les permissions de l'utilisateur d'abord
    const orderCheck = await base44.entities.Order.get(orderId);
    if (!orderCheck) return Response.json({ error: 'Commande introuvable' }, { status: 404 });

    // SÉCURITÉ: Vérifier que l'utilisateur est autorisé (client, marchand ou admin)
    const isOwner = orderCheck.client_id === user?.id;
    const isAdmin = user?.role === 'admin';
    
    // Vérifier si l'utilisateur est le marchand de la boutique
    let isMerchant = false;
    if (orderCheck.shop_id) {
      const shop = await base44.entities.Shop.get(orderCheck.shop_id);
      isMerchant = shop?.user_id === user?.id;
    }

    if (!isOwner && !isMerchant && !isAdmin) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // 1. Récupération des données de la commande avec asServiceRole (après vérification)
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    const shop = await base44.asServiceRole.entities.Shop.get(order.shop_id);

    // 2. Préparation du contenu de la notification
    let notificationTitle = "";
    let notificationMessage = "";

    // 3. Logique par Statut
    switch (status) {
      case 'pending':
        notificationTitle = '✅ Commande confirmée';
        notificationMessage = `Votre commande #${order.order_number} est en cours.`;
        
        // Notification immédiate au Marchand
        if (shop?.user_id) {
          await sendRealtimeUpdate(`shop-${shop.user_id}`, 'new-order', {
            orderId: order.id,
            orderNumber: order.order_number,
            total: order.total,
            status: 'pending'
          });
        }
        break;

      case 'preparing':
        notificationTitle = '👨‍🍳 En préparation';
        notificationMessage = `La commande #${order.order_number} est en cuisine.`;
        break;

      case 'ready':
        notificationTitle = '✅ Prête';
        notificationMessage = `La commande #${order.order_number} est prête à être récupérée.`;
        break;

      case 'delivered':
        notificationTitle = '🎉 Livrée';
        notificationMessage = `Commande #${order.order_number} livrée. Bon appétit !`;
        // Notifier aussi le marchand de la fin de livraison
        if (shop?.user_id) {
          await sendRealtimeUpdate(`shop-${shop.user_id}`, 'order-delivered', { orderId: order.id });
        }
        break;

      case 'cancelled':
        notificationTitle = '❌ Annulée';
        notificationMessage = `Votre commande #${order.order_number} a été annulée.`;
        break;
    }

    // 4. Envoi au Client (Temps réel seulement)
    if (notificationTitle) {
      await sendRealtimeUpdate(`user-${order.client_id}`, 'order-status-update', {
        orderId: order.id,
        status: status,
        title: notificationTitle,
        message: notificationMessage
      });
    }

    return Response.json({ success: true, provider: 'pusher-only' });
    
  } catch (error) {
    console.error('Erreur Globale:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});