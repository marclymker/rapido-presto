import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import OpenAI from 'npm:openai';

/**
 * notifyOrderShipped
 * Déclenché quand le statut d'une commande passe à "in_delivery" (expédiée).
 * L'agent compose un message WhatsApp de suivi avec le lien de suivi et les infos clés,
 * puis l'envoie au client via l'API Meta WhatsApp Cloud.
 */
function normalizePhone(raw) {
  if (!raw) return null;
  let phone = String(raw).replace(/[\s\-\+()]/g, '');
  if (phone.startsWith('0')) phone = '509' + phone.substring(1);
  else if (!phone.startsWith('509')) phone = '509' + phone;
  return phone;
}

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
  };
  if (req.method === 'OPTIONS') return new Response('ok', { headers });

  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // L'automation d'entité envoie: { event, data, old_data, changed_fields }
    // On accepte aussi { orderId } pour appels manuels/test
    const orderId = payload?.event?.entity_id || payload?.orderId || payload?.data?.id;
    if (!orderId) {
      return Response.json({ error: 'orderId required (event.entity_id or data.id)' }, { status: 400, headers });
    }

    // Charger la commande (depuis le payload si dispo, sinon DB)
    let orderData = payload?.data;
    if (!orderData || payload?.payload_too_large) {
      const orders = await base44.asServiceRole.entities.Order.filter({ id: orderId });
      orderData = orders?.[0];
    }
    if (!orderData) {
      return Response.json({ error: 'Order not found', orderId }, { status: 404, headers });
    }

    // Récupérer la boutique pour le contexte
    let shop = null;
    if (orderData.shop_id) {
      const shops = await base44.asServiceRole.entities.Shop.filter({ id: orderData.shop_id });
      shop = shops?.[0] || null;
    }

    const appUrl = (Deno.env.get('APP_URL') || 'https://rapido-presto.base44.app').replace(/\/$/, '');
    const trackingUrl = `${appUrl}/DossierLookup?order=${orderId}`;
    const itemsList = (orderData.items || [])
      .map(i => `• ${i.name} x${i.quantity} - ${i.total ?? i.unit_price * i.quantity} HTG`)
      .join('\n');

    // Compose le message dans la voix de l'agent support_client (créole haïtien)
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY') });
    const systemPrompt = `Ou se REBECCA, asistan vant Rapido Presto, yon marketplace an Ayiti.
Ou ap voye yon mesaj WhatsApp bay yon kliyan pou l tande komand l lan **anbis/expedye** (an kour livrezon).

STIL:
- Kreyòl ayisyen sèlman (oswa franse si adrès/mesaj an franse)
- Kout e klè (5-7 liy maksimòm)
- Zanmitay, profèchonèl
- Mete yon link swivi ak enfròmasyon kle

ENCHÈSTRIKSIYON:
- PA okipe lòt pwodui
- PA envante done
- Sèvi ak èaktèkman enfòmasyon yo ba ou
- Fenm ak yon mesaj kout "Mèsi! Kontinye swiv sou link la."`;

    const userPrompt = `Voye yon mesaj WhatsApp bay kliyan sa a pou notifikasyon "komand anbis/expedye".

DETAY KOMAND:
- Nimewo komand: ${orderData.order_number || orderId}
- Kliyan: ${orderData.client_name || 'Kliyan'}
- Boutik: ${orderData.shop_name || shop?.company_name || 'Rapido Presto'}
- Adrès: ${orderData.client_address || 'Pa presize'}
- Zòn: ${orderData.client_region || 'Pa presize'}
- Metòd pyeman: ${orderData.payment_method || 'N/A'}
- Total: ${orderData.total} HTG
- Kòd konfirmasyon: ${orderData.confirmation_code || 'N/A'}

ATIK YO:
${itemsList || 'Pa gen detay atik'}

LINK SWIVI: ${trackingUrl}

Ekri yon sèl mesaj WhatsApp, kout e klè, ki gen lyen lank swivi a, kòd konfirmasyon an, ak yon mesaj bonè pou elarje komand lan. Mo "expedye/anbis" la.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.6,
      max_tokens: 400
    });
    const agentMessage = completion.choices[0].message.content.trim();

    // Envoyer via Meta WhatsApp Cloud API
    const accessToken = Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID');
    if (!accessToken || !phoneNumberId) {
      return Response.json({
        success: false,
        error: 'WhatsApp credentials not configured',
        agentMessage
      }, { status: 500, headers });
    }

    const clientPhone = normalizePhone(orderData.client_phone);
    if (!clientPhone) {
      return Response.json({
        success: false,
        error: 'No client phone on order',
        orderId
      }, { status: 400, headers });
    }

    const whatsappUrl = `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`;
    const messageBody = {
      messaging_product: 'whatsapp',
      to: clientPhone,
      type: 'text',
      text: { body: agentMessage }
    };

    const waRes = await fetch(whatsappUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(messageBody)
    });
    const waData = await waRes.json();

    // Mete ajou Contact (si egziste) ak last_message
    try {
      const contacts = await base44.asServiceRole.entities.Contact.filter({ phone: clientPhone });
      if (contacts?.length) {
        await base44.asServiceRole.entities.Contact.update(contacts[0].id, {
          last_message: `[Tracking] ${agentMessage.substring(0, 120)}`,
          last_contacted_at: new Date().toISOString(),
          status: 'confirmed'
        });
      }
    } catch (e) {
      console.log('Contact update skipped:', e.message);
    }

    return Response.json({
      success: waRes.ok,
      orderId,
      clientPhone,
      agentMessage,
      whatsapp: waData
    }, { status: waRes.ok ? 200 : 502, headers });
  } catch (error) {
    console.error('notifyOrderShipped error:', error);
    return Response.json({ error: error.message }, { status: 500, headers });
  }
});