import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Pusher from 'npm:pusher';

// Fonction utilitaire pour envoyer une mise à jour temps réel
async function sendRealtimeUpdate(pusher, channel, event, data) {
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

    // Initialiser Pusher dans le handler
    const pusher = new Pusher({
      appId: Deno.env.get('PUSHER_APP_ID'),
      key: Deno.env.get('PUSHER_KEY'),
      secret: Deno.env.get('PUSHER_SECRET'),
      cluster: Deno.env.get('PUSHER_CLUSTER'),
      useTLS: true
    });

    // Vérifier que l'utilisateur est autorisé
    const orderCheck = await base44.entities.Order.get(orderId);
    if (!orderCheck) return Response.json({ error: 'Commande introuvable' }, { status: 404 });

    const isOwner = orderCheck.client_id === user?.id;
    const isAdmin = user?.role === 'admin';
    
    let isMerchant = false;
    if (orderCheck.shop_id) {
      const shop = await base44.entities.Shop.get(orderCheck.shop_id);
      isMerchant = shop?.user_id === user?.id;
    }

    if (!isOwner && !isMerchant && !isAdmin) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Récupération des données avec asServiceRole
    const order = await base44.asServiceRole.entities.Order.get(orderId);
    const shop = await base44.asServiceRole.entities.Shop.get(order.shop_id);

    let notificationTitle = "";
    let notificationMessage = "";

    switch (status) {
      case 'pending':
        notificationTitle = '✅ Commande confirmée';
        notificationMessage = `Votre commande #${order.order_number} est en cours.`;
        if (shop?.user_id) {
          await sendRealtimeUpdate(pusher, `shop-${shop.user_id}`, 'new-order', {
            orderId: order.id, orderNumber: order.order_number, total: order.total, status: 'pending'
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
        if (shop?.user_id) {
          await sendRealtimeUpdate(pusher, `shop-${shop.user_id}`, 'order-delivered', { orderId: order.id });
        }
        break;
      case 'cancelled':
        notificationTitle = '❌ Annulée';
        notificationMessage = `Votre commande #${order.order_number} a été annulée.`;
        break;
    }

    if (notificationTitle) {
      try {
        await base44.asServiceRole.functions.invoke('sendOrderNotificationOneSignal', {
          userId: order.client_id,
          title: notificationTitle,
          message: notificationMessage,
          orderId: order.id,
          url: `${Deno.env.get('APP_URL') || ''}/orders`
        });
      } catch (err) {
        console.error('❌ OneSignal error:', err);
      }

      await sendRealtimeUpdate(pusher, `user-${order.client_id}`, 'order-status-update', {
        orderId: order.id, status: status, title: notificationTitle, message: notificationMessage
      });
    }

    return Response.json({ success: true, provider: 'onesignal+pusher' });
    
  } catch (error) {
    console.error('Erreur Globale:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});