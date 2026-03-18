import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Envoie une notification push OneSignal pour les commandes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, title, message, orderId, url } = await req.json();

    if (!userId || !title || !message) {
      return Response.json({ error: 'userId, title et message requis' }, { status: 400 });
    }

    const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');
    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');

    if (!ONESIGNAL_API_KEY || !ONESIGNAL_APP_ID) {
      console.error('❌ OneSignal non configuré');
      return Response.json({ error: 'OneSignal not configured' }, { status: 500 });
    }

    console.log(`📤 Envoi notification OneSignal à user ${userId}`);

    // API OneSignal REST pour envoyer notification
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [userId], // OneSignal identifie par user.id
        headings: { en: title },
        contents: { en: message },
        data: { orderId, url },
        url: url || `${Deno.env.get('APP_URL') || ''}/orders`,
        // Activer le son et la vibration
        android_sound: 'notification',
        ios_sound: 'notification.wav',
        android_channel_id: 'rapido-orders',
        priority: 10
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('❌ Erreur OneSignal:', result);
      return Response.json({ error: 'OneSignal API error', details: result }, { status: 500 });
    }

    console.log('✅ Notification envoyée:', result);

    return Response.json({ 
      success: true, 
      notificationId: result.id,
      recipients: result.recipients 
    });

  } catch (error) {
    console.error('❌ Exception sendOrderNotificationOneSignal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});