import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Fonction pour hasher en SHA256
async function sha256Hash(data) {
  if (!data) return null;
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

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

    // Récupérer l'IP du client depuis les headers
    const clientIp = req.headers.get('cf-connecting-ip') || 
                     req.headers.get('x-forwarded-for')?.split(',')[0] || 
                     req.headers.get('x-real-ip') ||
                     user_data?.client_ip_address;

    // Hasher l'email et le téléphone
    const hashedEmail = await sha256Hash(user_data?.email || user.email);
    const hashedPhone = user_data?.phone ? await sha256Hash(user_data.phone.replace(/[^0-9]/g, '')) : null;

    // Préparer les données utilisateur
    const userData = {
      em: hashedEmail,
      ph: hashedPhone,
      fn: user.full_name?.split(' ')[0]?.toLowerCase(),
      ln: user.full_name?.split(' ').slice(1).join(' ')?.toLowerCase(),
      client_ip_address: clientIp,
      client_user_agent: user_data?.client_user_agent || req.headers.get('user-agent'),
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