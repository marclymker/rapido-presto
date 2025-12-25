import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');

// --- FONCTION ONESIGNAL OPTIMISÉE ---
async function sendOneSignalNotification(userIds, title, message, url = "https://rapido.ht") {
  if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
    console.log('OneSignal non configuré');
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
        // On cible par l'ID utilisateur que nous avons défini avec OneSignal.login()
        include_external_user_ids: userIds,
        headings: { fr: title },
        contents: { fr: message },
        // Cette URL permet d'ouvrir la page spécifique au clic sur mobile
        launch_url: url,
        priority: 10, // Haute priorité pour réveiller le téléphone
        android_channel_id: 'orders',
        ios_badgeType: 'Increase',
        ios_badgeCount: 1
      })
    });

    const result = await response.json();
    console.log(`Notification envoyée à ${userIds.join(',')}:`, result);
  } catch (error) {
    console.error('Erreur OneSignal:', error);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { orderId, status } = await req.json();
    
    // Récupérer les détails de la commande
    const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
    const order = orders[0];
    if (!order) return Response.json({ error: 'Order not found' }, { status: 404 });

    // Récupérer l'entreprise (Marchand)
    const shops = await base44.asServiceRole.entities.Shop.filter({ id: order.shop_id });
    const shop = shops[0];

    const baseUrl = "https://rapido.ht"; // Remplacez par votre vrai domaine

    // --- LOGIQUE DE NOTIFICATION PAR STATUT ---
    switch (status) {
      case 'pending':
        // 1. Notifier le Client
        await sendOneSignalNotification(
          [order.client_id], 
          '✅ Commande confirmée', 
          `Votre commande #${order.order_number} est en cours de validation.`,
          `${baseUrl}/orders/${order.id}`
        );
        
        // 2. Notifier le Marchand (Indispensable)
        if (shop?.user_id) {
          await sendOneSignalNotification(
            [shop.user_id], 
            '💰 Nouvelle Commande !', 
            `Commande #${order.order_number} reçue ! (${order.total} HTG)`,
            `${baseUrl}/entreprise/orders/${order.id}`
          );
        }
        break;

      case 'ready':
        // Appel aux livreurs à proximité
        const livreurs = await base44.asServiceRole.entities.Profile.filter({ 
          current_profile: 'livreur',
          region: order.region || 'Delmas',
          is_available: true 
        });

        const livreurIds = livreurs.map(l => l.user_id);
        if (livreurIds.length > 0) {
          await sendOneSignalNotification(
            livreurIds,
            '📦 Course disponible',
            `Nouvelle livraison à ${order.region} (${order.delivery_fee} HTG)`,
            `${baseUrl}/livreur/jobs`
          );
        }
        break;

      case 'delivered':
        // Notifier le Client de la livraison finale
        await sendOneSignalNotification(
          [order.client_id],
          '🎉 Commande livrée',
          'Bon appétit ! Votre commande a été livrée avec succès.',
          `${baseUrl}/orders/${order.id}`
        );
        break;
        
      // Vous pouvez ajouter les autres status (accepted, in_delivery) ici...
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});