import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');

async function sendOneSignalNotification(userIds, title, message, priority = 10) {
  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
    console.log('OneSignal not configured, skipping notification');
    return;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: userIds,
        headings: { fr: title, en: title },
        contents: { fr: message, en: message },
        data: { 
          type: 'order_update',
          action: 'view_orders',
          redirect_to: 'Orders'
        },
        priority: priority,
        android_channel_id: 'orders',
        ios_sound: 'notification.wav',
        android_sound: 'notification',
        ios_badgeType: 'Increase',
        ios_badgeCount: 1
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('OneSignal error:', result);
    } else {
      console.log('Notification sent:', result);
    }
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

// Fonction spécifique pour notifier le marchand
async function sendMerchantNotification(merchantId, title, message) {
  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
    console.log('OneSignal not configured, skipping notification');
    return;
  }

  try {
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        filters: [
          { field: 'tag', key: 'user_type', relation: '=', value: 'entreprise' },
          { operator: 'AND' },
          { field: 'tag', key: 'user_id', relation: '=', value: merchantId }
        ],
        headings: { fr: title, en: title },
        contents: { fr: message, en: message },
        data: { 
          type: 'new_order', 
          merchant_id: merchantId,
          action: 'open_orders',
          redirect_to: 'EnterpriseDashboard'
        },
        priority: 10,
        android_channel_id: 'orders',
        ios_sound: 'notification.wav',
        android_sound: 'notification',
        android_led_color: 'FFFF8000',
        android_accent_color: 'FFFF8000',
        ios_badgeType: 'Increase',
        ios_badgeCount: 1,
        ttl: 86400
      })
    });

    const result = await response.json();
    if (!response.ok) {
      console.error('OneSignal merchant notification error:', result);
    } else {
      console.log('Merchant notification sent:', result);
    }
  } catch (error) {
    console.error('Failed to send merchant notification:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderId, status } = await req.json();
    
    // Récupérer les détails de la commande
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    const order = orders[0];
    
    if (!order) {
      return Response.json({ error: 'Order not found' }, { status: 404 });
    }

    // Récupérer l'entreprise
    const shops = await base44.asServiceRole.entities.Shop.filter({ id: order.shop_id });
    const shop = shops[0];

    const notifications = [];

    // Définir les notifications selon le statut
    switch (status) {
      case 'pending':
        // Nouvelle commande - notifier client et entreprise
        notifications.push({
          userIds: [order.client_id],
          title: '✅ Commande confirmée',
          message: `Votre commande #${order.order_number} chez ${order.shop_name} a été envoyée`,
          priority: 7
        });
        
        // Notification spéciale pour le marchand avec haute priorité
        if (shop?.user_id) {
          await sendMerchantNotification(
            shop.user_id,
            '💰 Nouvelle Commande !',
            `Commande #${order.order_number} reçue ! Montant : ${order.total} HTG. Cliquez pour préparer.`
          );
        }
        break;

      case 'cancelled':
        // Commande refusée - notifier client et entreprise
        notifications.push({
          userIds: [order.client_id],
          title: '❌ Commande refusée',
          message: `Votre commande #${order.order_number} a été refusée par ${order.shop_name}`
        });
        if (shop?.user_id) {
          notifications.push({
            userIds: [shop.user_id],
            title: '❌ Commande refusée',
            message: `Commande #${order.order_number} refusée`
          });
        }
        break;

      case 'accepted':
        // Commande acceptée - notifier client et entreprise
        notifications.push({
          userIds: [order.client_id],
          title: '✅ Commande acceptée',
          message: `${order.shop_name} prépare votre commande #${order.order_number}`
        });
        if (shop?.user_id) {
          notifications.push({
            userIds: [shop.user_id],
            title: '✅ Commande acceptée',
            message: `Commande #${order.order_number} en préparation`
          });
        }
        break;

      case 'preparing':
        // En préparation - notifier client et entreprise
        notifications.push({
          userIds: [order.client_id],
          title: '👨‍🍳 Préparation en cours',
          message: `${order.shop_name} prépare votre commande #${order.order_number}`
        });
        if (shop?.user_id) {
          notifications.push({
            userIds: [shop.user_id],
            title: '👨‍🍳 Préparation en cours',
            message: `Commande #${order.order_number} en préparation`
          });
        }
        break;

      case 'ready':
        // Préparation terminée - notifier client et entreprise
        notifications.push({
          userIds: [order.client_id],
          title: '✅ Commande prête',
          message: `Votre commande #${order.order_number} est prête, recherche de livreur...`
        });
        if (shop?.user_id) {
          notifications.push({
            userIds: [shop.user_id],
            title: '✅ Commande prête',
            message: `Commande #${order.order_number} prête pour livraison`
          });
        }
        break;

      case 'searching_driver':
        // Recherche livreur - notifier client et entreprise
        notifications.push({
          userIds: [order.client_id],
          title: '🔍 Recherche de livreur',
          message: `Recherche d'un livreur pour votre commande #${order.order_number}`
        });
        if (shop?.user_id) {
          notifications.push({
            userIds: [shop.user_id],
            title: '🔍 Recherche de livreur',
            message: `Recherche de livreur pour commande #${order.order_number}`
          });
        }
        break;

      case 'driver_assigned':
        // Livreur assigné - notifier client, entreprise et livreur
        notifications.push({
          userIds: [order.client_id],
          title: '🚴 Livreur en route',
          message: `${order.driver_name} récupère votre commande #${order.order_number}`
        });
        if (shop?.user_id) {
          notifications.push({
            userIds: [shop.user_id],
            title: '🚴 Livreur assigné',
            message: `${order.driver_name} prend en charge la commande #${order.order_number}`
          });
        }
        if (order.driver_id) {
          notifications.push({
            userIds: [order.driver_id],
            title: '📦 Nouvelle livraison',
            message: `Récupérez la commande #${order.order_number} chez ${order.shop_name}`
          });
        }
        break;

      case 'in_delivery':
        // Livraison en cours - notifier client et entreprise
        notifications.push({
          userIds: [order.client_id],
          title: '🚚 Livraison en cours',
          message: `${order.driver_name} est en route avec votre commande #${order.order_number}`
        });
        if (shop?.user_id) {
          notifications.push({
            userIds: [shop.user_id],
            title: '🚚 Livraison en cours',
            message: `Commande #${order.order_number} en cours de livraison`
          });
        }
        break;

      case 'delivered':
        // Livraison terminée - notifier client, entreprise et livreur
        notifications.push({
          userIds: [order.client_id],
          title: '🎉 Commande livrée',
          message: `Votre commande #${order.order_number} a été livrée. Bon appétit!`
        });
        if (shop?.user_id) {
          notifications.push({
            userIds: [shop.user_id],
            title: '✅ Livraison terminée',
            message: `Commande #${order.order_number} livrée avec succès`
          });
        }
        if (order.driver_id) {
          notifications.push({
            userIds: [order.driver_id],
            title: '✅ Livraison confirmée',
            message: `Livraison #${order.order_number} terminée avec succès`
          });
        }
        break;
    }

    // Envoyer toutes les notifications
    await Promise.all(
      notifications.map(notif => 
        sendOneSignalNotification(notif.userIds, notif.title, notif.message, notif.priority || 7)
      )
    );

    return Response.json({ success: true, notificationsSent: notifications.length });

  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});