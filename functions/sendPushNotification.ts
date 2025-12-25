import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { userId, title, message, data } = await req.json();
    
    if (!userId || !title || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const ONESIGNAL_APP_ID = Deno.env.get('ONESIGNAL_APP_ID');
    const ONESIGNAL_API_KEY = Deno.env.get('ONESIGNAL_API_KEY');

    if (!ONESIGNAL_APP_ID || !ONESIGNAL_API_KEY) {
      return Response.json({ error: 'OneSignal not configured' }, { status: 500 });
    }

    // Envoyer notification via OneSignal REST API
    const response = await fetch('https://onesignal.com/api/v1/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${ONESIGNAL_API_KEY}`
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_external_user_ids: [userId],
        headings: { en: title },
        contents: { en: message },
        data: data || {},
        android_channel_id: 'rapido-presto-orders',
        priority: 10
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('OneSignal error:', result);
      return Response.json({ error: 'Failed to send notification', details: result }, { status: 500 });
    }

    return Response.json({ success: true, notificationId: result.id });
  } catch (error) {
    console.error('Push notification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});