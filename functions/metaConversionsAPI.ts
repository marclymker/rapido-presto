import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event_name, event_id, custom_data, user_data } = await req.json();

    const pixelId = Deno.env.get('META_PIXEL_ID');
    const accessToken = Deno.env.get('META_ACCESS_TOKEN');

    if (!pixelId || !accessToken) {
      return Response.json({ error: 'Meta credentials not configured' }, { status: 500 });
    }

    // Préparer les données utilisateur
    const userData = {
      em: user_data?.email || user.email,
      ph: user_data?.phone,
      fn: user.full_name?.split(' ')[0],
      ln: user.full_name?.split(' ').slice(1).join(' '),
      client_ip_address: user_data?.client_ip_address,
      client_user_agent: user_data?.client_user_agent,
      fbc: user_data?.fbc, // Facebook Click ID
      fbp: user_data?.fbp, // Facebook Browser ID
    };

    // Nettoyer les valeurs undefined
    Object.keys(userData).forEach(key => {
      if (userData[key] === undefined || userData[key] === '') {
        delete userData[key];
      }
    });

    // Préparer l'événement
    const eventData = {
      event_name,
      event_time: Math.floor(Date.now() / 1000),
      event_id,
      action_source: 'website',
      event_source_url: custom_data?.event_source_url || 'https://rapido509.com',
      user_data: userData,
      custom_data: custom_data || {},
    };

    // Envoyer à Meta Conversions API
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${pixelId}/events`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: [eventData],
          access_token: accessToken,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      console.error('Meta CAPI Error:', result);
      return Response.json({ error: 'Failed to send event', details: result }, { status: 500 });
    }

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('Meta CAPI Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});