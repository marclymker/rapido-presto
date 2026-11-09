'use strict';

const crypto = require('crypto');
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');

const db = admin.firestore();
const SITE_ORIGIN = 'https://makariosbridal.shop';
const FUNCTIONS_ORIGIN = 'https://us-central1-rapido-presto-f072a.cloudfunctions.net';

// Les valeurs sont injectées uniquement par Firebase Secret Manager au runtime.
const MONCASH_CLIENT_ID = defineSecret('MONCASH_CLIENT_ID');
const MONCASH_CLIENT_SECRET = defineSecret('MONCASH_CLIENT_SECRET');
const MONCASH_REST_BASE_URL = defineSecret('MONCASH_REST_BASE_URL');
const MONCASH_GATEWAY_BASE_URL = defineSecret('MONCASH_GATEWAY_BASE_URL');
const MONCASH_MODE = defineSecret('MONCASH_MODE');
const SQUARE_ACCESS_TOKEN = defineSecret('SQUARE_ACCESS_TOKEN');
const SQUARE_APPLICATION_ID = defineSecret('SQUARE_APPLICATION_ID');
const SQUARE_LOCATION_ID = defineSecret('SQUARE_LOCATION_ID');
const SQUARE_WEBHOOK_SIGNATURE_KEY = defineSecret('SQUARE_WEBHOOK_SIGNATURE_KEY');
const SQUARE_ENVIRONMENT = defineSecret('SQUARE_ENVIRONMENT');
const SQUARE_CURRENCY = defineSecret('SQUARE_CURRENCY');
const SQUARE_HTG_TO_CURRENCY_RATE = defineSecret('SQUARE_HTG_TO_CURRENCY_RATE');

const allSecrets = [
  MONCASH_CLIENT_ID, MONCASH_CLIENT_SECRET, MONCASH_REST_BASE_URL,
  MONCASH_GATEWAY_BASE_URL, MONCASH_MODE, SQUARE_ACCESS_TOKEN,
  SQUARE_APPLICATION_ID, SQUARE_LOCATION_ID, SQUARE_WEBHOOK_SIGNATURE_KEY,
  SQUARE_ENVIRONMENT, SQUARE_CURRENCY, SQUARE_HTG_TO_CURRENCY_RATE,
];

function secretValue(secret) {
  try { return String(secret.value() || '').trim(); } catch (_) { return ''; }
}

function numberValue(value) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function jsonError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}

async function requireUser(req) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) {
    const error = new Error('Connexion requise');
    error.status = 401;
    throw error;
  }
  try {
    return await admin.auth().verifyIdToken(header.slice(7));
  } catch (_) {
    const error = new Error('Session Firebase invalide');
    error.status = 401;
    throw error;
  }
}

function requirePost(req) {
  if (req.method !== 'POST') {
    const error = new Error('POST required');
    error.status = 405;
    throw error;
  }
}

async function findOrders(orderIds, uid) {
  const ids = [...new Set((Array.isArray(orderIds) ? orderIds : [orderIds])
    .map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length || ids.length > 50) throw Object.assign(new Error('Commande invalide'), { status: 400 });
  const snapshots = await db.getAll(...ids.map((id) => db.collection('Order').doc(id)));
  const orders = snapshots.filter((snapshot) => snapshot.exists).map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }));
  if (orders.length !== ids.length) throw Object.assign(new Error('Une commande est introuvable'), { status: 404 });
  if (orders.some((order) => order.client_id !== uid)) throw Object.assign(new Error('Commande non autorisée'), { status: 403 });
  if (orders.some((order) => ['paid', 'completed', 'cancelled'].includes(String(order.payment_status || '').toLowerCase()))) {
    throw Object.assign(new Error('Cette commande ne peut plus être payée'), { status: 409 });
  }
  return orders;
}

function expectedHtgTotal(orders, paymentSplit = 'full') {
  const total = orders.reduce((sum, order) => sum + numberValue(order.total), 0);
  if (!total || total < 1) throw Object.assign(new Error('Montant de commande invalide'), { status: 400 });
  return Math.round(total * (paymentSplit === 'split' ? 0.5 : 1));
}

async function moncashAccessToken() {
  const clientId = secretValue(MONCASH_CLIENT_ID);
  const clientSecret = secretValue(MONCASH_CLIENT_SECRET);
  const restBase = secretValue(MONCASH_REST_BASE_URL);
  if (!clientId || !clientSecret || !restBase) throw Object.assign(new Error('MonCash n’est pas encore configuré côté serveur'), { status: 503 });
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(`${restBase.replace(/\/$/, '')}/oauth/token`, {
    method: 'POST',
    headers: { Accept: 'application/json', Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'scope=read,write&grant_type=client_credentials',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) throw Object.assign(new Error('Authentification MonCash refusée'), { status: 502 });
  return { token: data.access_token, restBase: restBase.replace(/\/$/, '') };
}

const paymentOptions = { cors: false, secrets: allSecrets, maxInstances: 10 };

exports.squareConfig = onRequest(paymentOptions, async (req, res) => {
  try {
    await requirePost(req);
    await requireUser(req);
    const applicationId = secretValue(SQUARE_APPLICATION_ID);
    const locationId = secretValue(SQUARE_LOCATION_ID);
    if (!applicationId || !locationId) return jsonError(res, 503, 'Square n’est pas encore configuré côté serveur');
    return res.json({ success: true, applicationId, locationId, environment: secretValue(SQUARE_ENVIRONMENT) || 'sandbox', currency: secretValue(SQUARE_CURRENCY) || 'USD' });
  } catch (error) {
    console.error('squareConfig', error.message);
    return jsonError(res, error.status || 500, error.message || 'Configuration Square indisponible');
  }
});

exports.createMonCashPayment = onRequest(paymentOptions, async (req, res) => {
  try {
    requirePost(req);
    const decoded = await requireUser(req);
    const orders = await findOrders(req.body?.orderIds || req.body?.orderId, decoded.uid);
    const paymentSplit = req.body?.paymentSplit === 'split' ? 'split' : 'full';
    const amount = expectedHtgTotal(orders, paymentSplit);
    const { token, restBase } = await moncashAccessToken();
    const orderId = `KAIROS-${orders.map((order) => order.id).join('-')}`.slice(0, 100);
    const response = await fetch(`${restBase}/v1/CreatePayment`, {
      method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, orderId }),
    });
    const data = await response.json().catch(() => ({}));
    const paymentToken = data?.payment_token?.token;
    if (!response.ok || !paymentToken) throw Object.assign(new Error('MonCash n’a pas créé le paiement'), { status: 502 });
    const gateway = secretValue(MONCASH_GATEWAY_BASE_URL);
    if (!gateway) throw Object.assign(new Error('URL de passerelle MonCash absente'), { status: 503 });
    const transactionRef = String(orderId);
    await Promise.all(orders.map((order) => db.collection('Order').doc(order.id).set({
      payment_provider: 'moncash', payment_status: 'pending', payment_order_id: transactionRef,
      payment_amount: amount, updated_date: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })));
    return res.json({ success: true, paymentUrl: `${gateway.replace(/\/$/, '')}/Payment/Redirect?token=${encodeURIComponent(paymentToken)}&orderId=${encodeURIComponent(transactionRef)}`, transactionId: transactionRef, amount });
  } catch (error) {
    console.error('createMonCashPayment', error.message);
    return jsonError(res, error.status || 500, error.message || 'Paiement MonCash indisponible');
  }
});

exports.verifyMonCashPayment = onRequest(paymentOptions, async (req, res) => {
  try {
    requirePost(req);
    const decoded = await requireUser(req);
    const transactionId = String(req.body?.transactionId || '').trim();
    const orderReference = String(req.body?.orderId || '').trim();
    if (!transactionId) return jsonError(res, 400, 'Identifiant de transaction manquant');
    const { token, restBase } = await moncashAccessToken();
    const response = await fetch(`${restBase}/v1/RetrieveTransactionPayment`, {
      method: 'POST', headers: { Accept: 'application/json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ transactionId }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data?.payment) return jsonError(res, 502, 'Vérification MonCash impossible');
    const ordersSnapshot = await db.collection('Order').where('payment_order_id', '==', orderReference || transactionId).limit(50).get();
    const orders = ordersSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    if (!orders.length || orders.some((order) => order.client_id !== decoded.uid)) return jsonError(res, 403, 'Transaction non autorisée');
    const successful = String(data.payment.message || '').toLowerCase() === 'successful';
    if (successful) {
      await Promise.all(orders.map((order) => db.collection('Order').doc(order.id).set({ payment_status: 'paid', payment_transaction_id: String(data.payment.transaction_id || transactionId), paid_at: admin.firestore.FieldValue.serverTimestamp(), updated_date: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })));
    }
    return res.json({ success: true, status: successful ? 'success' : 'pending', amount: numberValue(data.payment.cost), transactionId: String(data.payment.transaction_id || transactionId) });
  } catch (error) {
    console.error('verifyMonCashPayment', error.message);
    return jsonError(res, error.status || 500, error.message || 'Vérification MonCash indisponible');
  }
});

exports.createSquarePayment = onRequest(paymentOptions, async (req, res) => {
  try {
    requirePost(req);
    const decoded = await requireUser(req);
    const sourceId = String(req.body?.sourceId || '').trim();
    if (!sourceId || sourceId.length > 500) return jsonError(res, 400, 'Source de paiement Square invalide');
    const orders = await findOrders(req.body?.orderIds || req.body?.orderId, decoded.uid);
    const htgAmount = expectedHtgTotal(orders, 'full');
    const currency = secretValue(SQUARE_CURRENCY) || 'USD';
    const rate = numberValue(secretValue(SQUARE_HTG_TO_CURRENCY_RATE));
    if (!rate || rate <= 0) return jsonError(res, 503, 'Le taux de conversion Square n’est pas configuré');
    const minorAmount = Math.round(htgAmount * rate * 100);
    if (!minorAmount || minorAmount > 999999999) return jsonError(res, 400, 'Montant Square invalide');
    const accessToken = secretValue(SQUARE_ACCESS_TOKEN);
    const locationId = secretValue(SQUARE_LOCATION_ID);
    if (!accessToken || !locationId) return jsonError(res, 503, 'Square n’est pas encore configuré côté serveur');
    const idempotencyKey = crypto.createHash('sha256').update(`kairos:${orders.map((order) => order.id).sort().join(',')}:${minorAmount}`).digest('hex');
    const response = await fetch(`${secretValue(SQUARE_ENVIRONMENT).toLowerCase() === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com'}/v2/payments`, {
      method: 'POST', headers: { 'Square-Version': '2025-10-16', Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_id: sourceId, idempotency_key: idempotencyKey, amount_money: { amount: minorAmount, currency }, location_id: locationId, customer_details: { customer_initiated: true, seller_keyed_in: false }, reference_id: orders[0].order_number || orders[0].id, note: 'Kairos — makariosbridal.shop' }),
    });
    const data = await response.json().catch(() => ({}));
    const payment = data?.payment;
    if (!response.ok || !payment || !['APPROVED', 'COMPLETED'].includes(payment.status)) return jsonError(res, 402, data?.errors?.[0]?.detail || 'Paiement Square refusé');
    await Promise.all(orders.map((order) => db.collection('Order').doc(order.id).set({ payment_provider: 'square', payment_status: payment.status === 'COMPLETED' ? 'paid' : 'authorized', payment_transaction_id: payment.id, paid_at: payment.status === 'COMPLETED' ? admin.firestore.FieldValue.serverTimestamp() : null, updated_date: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })));
    return res.json({ success: true, status: payment.status, paymentId: payment.id, amount: htgAmount, currency });
  } catch (error) {
    console.error('createSquarePayment', error.message);
    return jsonError(res, error.status || 500, error.message || 'Paiement Square indisponible');
  }
});

exports.squareWebhook = onRequest({ cors: false, secrets: allSecrets, maxInstances: 10 }, async (req, res) => {
  if (req.method !== 'POST') return res.status(405).send('POST required');
  const signature = req.get('x-square-hmacsha256-signature') || '';
  const key = secretValue(SQUARE_WEBHOOK_SIGNATURE_KEY);
  const notificationUrl = `${FUNCTIONS_ORIGIN}/squareWebhook`;
  const rawBody = req.rawBody ? req.rawBody.toString('utf8') : JSON.stringify(req.body || {});
  const expected = crypto.createHmac('sha256', key).update(notificationUrl + rawBody).digest('base64');
  const valid = Boolean(key && signature && Buffer.byteLength(signature) === Buffer.byteLength(expected) && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected)));
  if (!valid) return res.status(403).send('Invalid signature');
  try {
    const event = req.body || {};
    const payment = event.data?.object?.payment || event.data?.object?.refund || {};
    const paymentId = payment.id;
    if (paymentId && ['PAYMENT_UPDATED', 'PAYMENT_COMPLETED', 'PAYMENT_CREATED'].includes(event.type)) {
      const snapshot = await db.collection('Order').where('payment_transaction_id', '==', paymentId).limit(50).get();
      const status = String(payment.status || '').toUpperCase();
      if (status === 'COMPLETED') await Promise.all(snapshot.docs.map((doc) => doc.ref.set({ payment_status: 'paid', paid_at: admin.firestore.FieldValue.serverTimestamp(), updated_date: admin.firestore.FieldValue.serverTimestamp() }, { merge: true })));
    }
    return res.status(200).send('ok');
  } catch (error) {
    console.error('squareWebhook', error.message);
    return res.status(500).send('Webhook processing failed');
  }
});

// Alias de compatibilité avec les écrans Kairos existants.
exports.moncashCreatePayment = exports.createMonCashPayment;
exports.moncashVerifyPayment = exports.verifyMonCashPayment;
exports.squarePayment = exports.createSquarePayment;

exports.paymentSecretNames = [
  'MONCASH_CLIENT_ID', 'MONCASH_CLIENT_SECRET', 'MONCASH_REST_BASE_URL',
  'MONCASH_GATEWAY_BASE_URL', 'MONCASH_MODE', 'SQUARE_ACCESS_TOKEN',
  'SQUARE_APPLICATION_ID', 'SQUARE_LOCATION_ID', 'SQUARE_WEBHOOK_SIGNATURE_KEY',
  'SQUARE_ENVIRONMENT', 'SQUARE_CURRENCY', 'SQUARE_HTG_TO_CURRENCY_RATE',
];
