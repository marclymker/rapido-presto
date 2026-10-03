const express = require('express');
const cors = require('cors');
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const admin = require('firebase-admin');
const { z } = require('zod');

admin.initializeApp();
setGlobalOptions({ region: process.env.FUNCTIONS_REGION || 'us-central1', maxInstances: 10, timeoutSeconds: 60 });
const db = admin.firestore();
const bucket = admin.storage().bucket();
const app = express();
app.use(cors({ origin: true, methods: ['POST', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
app.use(express.json({ limit: '256kb' }));

const ids = z.string().trim().min(1).max(160);
const nonEmpty = z.string().trim().min(1).max(5000);
const statusValues = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'];

function fail(status, error, details) {
  const e = new Error(error);
  e.status = status;
  e.details = details;
  throw e;
}

async function authenticate(req, { optional = false } = {}) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    if (optional) return null;
    fail(401, 'Authentification requise.');
  }
  try {
    return await admin.auth().verifyIdToken(header.slice(7), true);
  } catch {
    fail(401, 'Session Firebase invalide ou expirée.');
  }
}

async function profile(uid) {
  const snap = await db.doc(`User/${uid}`).get();
  return snap.exists ? snap.data() : {};
}

async function requireAdmin(decoded) {
  const data = await profile(decoded.uid);
  if (!['admin', 'owner'].includes(data.role)) fail(403, 'Droits administrateur requis.');
  return data;
}

function body(req, schema) {
  const result = schema.safeParse(req.body || {});
  if (!result.success) fail(400, 'Données invalides.', result.error.flatten());
  return result.data;
}

async function entity(name, id) {
  const snap = await db.doc(`${name}/${id}`).get();
  if (!snap.exists) fail(404, `${name} introuvable.`);
  return { ref: snap.ref, data: snap.data() };
}

async function validateOrderPrice(decoded, req) {
  const input = body(req, z.object({
    items: z.array(z.object({ product_id: ids, quantity: z.number().int().min(1).max(100) })).min(1).max(100),
  }));
  let total = 0;
  const verified = [];
  for (const item of input.items) {
    const product = await entity('Product', item.product_id);
    if (product.data.is_available === false) fail(409, `Produit indisponible: ${item.product_id}`);
    const price = Number(product.data.promo_price ?? product.data.price);
    if (!Number.isFinite(price) || price < 0) fail(422, 'Prix produit invalide.');
    total += price * item.quantity;
    verified.push({ product_id: item.product_id, quantity: item.quantity, unit_price: price });
  }
  return { valid: true, currency: 'HTG', total, items: verified, user_id: decoded.uid };
}

async function submitReview(decoded, req) {
  const input = body(req, z.object({ product_id: ids, rating: z.number().int().min(1).max(5), comment: nonEmpty.optional() }));
  const product = await entity('Product', input.product_id);
  const ref = await db.collection('ProductReview').add({ ...input, user_id: decoded.uid, product_name: product.data.name || '', created_date: admin.firestore.FieldValue.serverTimestamp(), status: 'pending' });
  return { success: true, id: ref.id, status: 'pending' };
}

async function cancelOrder(decoded, req) {
  const input = body(req, z.object({ orderId: ids, reason: nonEmpty.max(1000).optional() }));
  const order = await entity('Order', input.orderId);
  const data = order.data;
  const allowed = data.client_id === decoded.uid || data.shop_owner_id === decoded.uid || data.driver_id === decoded.uid;
  const actor = await profile(decoded.uid);
  if (!allowed && !['admin', 'owner'].includes(actor.role)) fail(403, 'Accès refusé.');
  if (['delivered', 'cancelled'].includes(data.status)) fail(409, 'Cette commande ne peut plus être annulée.');
  await order.ref.update({ status: 'cancelled', cancellation_reason: input.reason || '', cancelled_by: decoded.uid, updated_date: admin.firestore.FieldValue.serverTimestamp() });
  return { success: true, orderId: input.orderId, status: 'cancelled' };
}

async function chatService(decoded, req) {
  const input = body(req, z.object({ action: z.enum(['list', 'messages', 'send', 'unread-count', 'vendor_products']), convId: ids.optional(), text: nonEmpty.max(4000).optional(), product_id: ids.optional() }));
  if (input.action === 'list') {
    const [customer, vendor] = await Promise.all([
      db.collection('Conversation').where('customer_id', '==', decoded.uid).limit(50).get(),
      db.collection('Conversation').where('vendor_id', '==', decoded.uid).limit(50).get(),
    ]);
    const rows = [...customer.docs, ...vendor.docs].map(d => ({ id: d.id, ...d.data() }));
    return { data: rows.filter((v, i, a) => a.findIndex(x => x.id === v.id) === i) };
  }
  if (!input.convId) fail(400, 'conversation_id requis.');
  const conversation = await entity('Conversation', input.convId);
  if (![conversation.data.customer_id, conversation.data.vendor_id].includes(decoded.uid)) fail(403, 'Accès refusé.');
  if (input.action === 'messages') {
    const snap = await db.collection('ChatMessage').where('conversation_id', '==', input.convId).orderBy('created_date', 'asc').limit(100).get();
    return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
  }
  if (input.action === 'send') {
    if (!input.text) fail(400, 'Message vide.');
    const ref = await db.collection('ChatMessage').add({ conversation_id: input.convId, sender_id: decoded.uid, text: input.text, product_id: input.product_id || null, created_date: admin.firestore.FieldValue.serverTimestamp(), is_read: false });
    await conversation.ref.update({ last_message: input.text.slice(0, 200), last_message_date: admin.firestore.FieldValue.serverTimestamp() });
    return { success: true, id: ref.id };
  }
  if (input.action === 'unread-count') {
    const snap = await db.collection('ChatMessage').where('sender_id', '!=', decoded.uid).where('is_read', '==', false).limit(100).get();
    return { count: snap.size };
  }
  return { data: [] };
}

async function adminProducts(decoded, req) {
  await requireAdmin(decoded);
  const input = body(req, z.object({ action: z.enum(['list', 'create', 'update', 'delete']), productId: ids.optional(), data: z.record(z.any()).optional() }));
  if (input.action === 'list') {
    const snap = await db.collection('Product').limit(500).get();
    return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) };
  }
  if (!input.productId && input.action !== 'create') fail(400, 'productId requis.');
  if (input.action === 'create') {
    const ref = await db.collection('Product').add({ ...(input.data || {}), created_date: admin.firestore.FieldValue.serverTimestamp(), owner_id: decoded.uid });
    return { success: true, id: ref.id };
  }
  if (input.action === 'delete') { await db.doc(`Product/${input.productId}`).delete(); return { success: true }; }
  await db.doc(`Product/${input.productId}`).set({ ...(input.data || {}), updated_date: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { success: true, id: input.productId };
}

async function adminShops(decoded, req) {
  await requireAdmin(decoded);
  const input = body(req, z.object({ action: z.enum(['list', 'create', 'update', 'delete', 'listEnterpriseUsers']), shopId: ids.optional(), data: z.record(z.any()).optional() }));
  if (input.action === 'list') { const snap = await db.collection('Shop').limit(500).get(); return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) }; }
  if (input.action === 'listEnterpriseUsers') { const snap = await db.collection('User').where('current_profile', '==', 'enterprise').limit(500).get(); return { data: snap.docs.map(d => ({ id: d.id, ...d.data() })) }; }
  if (input.action === 'create') { const ref = await db.collection('Shop').add({ ...(input.data || {}), created_date: admin.firestore.FieldValue.serverTimestamp(), user_id: decoded.uid }); return { success: true, id: ref.id }; }
  if (!input.shopId) fail(400, 'shopId requis.');
  if (input.action === 'delete') { await db.doc(`Shop/${input.shopId}`).delete(); return { success: true }; }
  await db.doc(`Shop/${input.shopId}`).set({ ...(input.data || {}), updated_date: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
  return { success: true, id: input.shopId };
}

async function notification(decoded, req) {
  const input = body(req, z.object({ orderId: ids.optional(), status: z.enum(statusValues).optional(), userId: ids.optional(), message: nonEmpty.max(1000).optional() }));
  if (input.orderId) { const order = await entity('Order', input.orderId); const permitted = [order.data.client_id, order.data.driver_id, order.data.shop_owner_id].includes(decoded.uid); const actor = await profile(decoded.uid); if (!permitted && !['admin', 'owner'].includes(actor.role)) fail(403, 'Accès refusé.'); }
  const target = input.userId || decoded.uid;
  const ref = await db.collection('Notification').add({ user_id: target, order_id: input.orderId || null, status: input.status || null, message: input.message || `Mise à jour de commande: ${input.status || 'nouvelle notification'}`, created_date: admin.firestore.FieldValue.serverTimestamp(), read: false });
  return { success: true, id: ref.id, queued: true };
}

async function route(name, decoded, req) {
  switch (name) {
    case 'validateOrderPrice': return validateOrderPrice(decoded, req);
    case 'submitReview': return submitReview(decoded, req);
    case 'cancelOrder': return cancelOrder(decoded, req);
    case 'chatService': return chatService(decoded, req);
    case 'adminProducts': return adminProducts(decoded, req);
    case 'adminShops': return adminShops(decoded, req);
    case 'sendOrderNotification':
    case 'sendWhatsAppOrderNotification':
    case 'sendOrderEmail':
    case 'sendPushNotification': return notification(decoded, req);
    case 'getOneSignalAppId': { const value = process.env.ONESIGNAL_APP_ID; if (!value) fail(503, 'OneSignal n’est pas configuré côté serveur.'); return { app_id: value }; }
    case 'getPusherConfig': { if (!process.env.PUSHER_KEY || !process.env.PUSHER_CLUSTER) fail(503, 'Pusher n’est pas configuré côté serveur.'); return { key: process.env.PUSHER_KEY, cluster: process.env.PUSHER_CLUSTER }; }
    case 'squarePayment':
    case 'moncashCreatePayment':
    case 'moncashVerifyPayment': return fail(503, 'Paiement non activé : configurez les secrets du fournisseur côté serveur avant utilisation.');
    case 'uploadFile': return fail(501, 'Upload sécurisé à migrer vers Firebase Storage direct avec règles et App Check.');
    case 'generateAltTexts':
    case 'generateProductFAQ':
    case 'publishBlogToSocial':
    case 'metaConversionsAPI': return fail(501, 'Cette intégration externe doit être configurée côté serveur avant utilisation.');
    default: return fail(404, `Fonction backend inconnue: ${name}`);
  }
}

app.post('/:name', async (req, res) => {
  try {
    if (!/^[A-Za-z][A-Za-z0-9_-]{1,80}$/.test(req.params.name)) fail(400, 'Nom de fonction invalide.');
    const decoded = await authenticate(req);
    const result = await route(req.params.name, decoded, req);
    res.status(200).json(result || { success: true });
  } catch (error) {
    const status = Number.isInteger(error.status) ? error.status : 500;
    console.error('[functions]', req.params.name, status, error.message);
    res.status(status).json({ error: error.message || 'Erreur interne.', ...(error.details ? { details: error.details } : {}) });
  }
});

app.all('*', (req, res) => res.status(405).json({ error: 'Méthode non autorisée.' }));
exports.api = onRequest({ cors: true }, app);
