'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const db = admin.firestore();
const ADMIN_EMAIL = 'makariosentreprises@gmail.com';

async function requireAdmin(req) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) throw Object.assign(new Error('Connexion requise'), { status: 401 });
  let decoded;
  try {
    decoded = await admin.auth().verifyIdToken(header.slice(7));
  } catch (_) {
    throw Object.assign(new Error('Session Firebase invalide'), { status: 401 });
  }
  const email = String(decoded.email || '').trim().toLowerCase();
  if (email !== ADMIN_EMAIL || decoded.email_verified !== true) {
    throw Object.assign(new Error('Accès administrateur refusé'), { status: 403 });
  }
  return decoded;
}

function methodPost(req) {
  if (req.method !== 'POST') throw Object.assign(new Error('POST required'), { status: 405 });
}

function cleanData(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const blocked = new Set(['id', 'created_date', 'updated_date']);
  return Object.fromEntries(Object.entries(value).filter(([key, val]) => !blocked.has(key) && val !== undefined));
}

function respondError(res, error) {
  console.error('admin function:', error.message);
  return res.status(error.status || 500).json({ success: false, error: error.message || 'Erreur administrateur' });
}

const options = { cors: false, maxInstances: 5 };

exports.adminProducts = onRequest(options, async (req, res) => {
  try {
    methodPost(req);
    await requireAdmin(req);
    const action = String(req.body?.action || '');
    if (action === 'list') {
      const shopId = String(req.body?.shopId || '').trim();
      if (!shopId) return res.status(400).json({ success: false, error: 'Boutique manquante' });
      const snapshot = await db.collection('Product').where('shop_id', '==', shopId).limit(1000).get();
      return res.json({ success: true, products: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
    }
    if (action === 'delete') {
      const productId = String(req.body?.productId || '').trim();
      if (!productId) return res.status(400).json({ success: false, error: 'Produit manquant' });
      const ref = db.collection('Product').doc(productId);
      const snapshot = await ref.get();
      if (!snapshot.exists) return res.status(404).json({ success: false, error: 'Produit introuvable' });
      await ref.delete();
      return res.json({ success: true, productId });
    }
    return res.status(400).json({ success: false, error: 'Action produit inconnue' });
  } catch (error) {
    return respondError(res, error);
  }
});

exports.adminShops = onRequest(options, async (req, res) => {
  try {
    methodPost(req);
    await requireAdmin(req);
    const action = String(req.body?.action || '');
    if (action === 'list') {
      const snapshot = await db.collection('Shop').limit(1000).get();
      return res.json({ success: true, shops: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
    }
    if (action === 'listEnterpriseUsers') {
      const snapshot = await db.collection('User').where('role', 'in', ['merchant', 'restaurant', 'hotel', 'ticket', 'owner', 'admin']).limit(1000).get();
      return res.json({ success: true, users: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })) });
    }
    if (action === 'delete') {
      const shopId = String(req.body?.shopId || '').trim();
      if (!shopId) return res.status(400).json({ success: false, error: 'Boutique manquante' });
      const ref = db.collection('Shop').doc(shopId);
      const snapshot = await ref.get();
      if (!snapshot.exists) return res.status(404).json({ success: false, error: 'Boutique introuvable' });
      await ref.delete();
      return res.json({ success: true, shopId });
    }
    if (action === 'create') {
      const data = cleanData(req.body?.data);
      if (!data.company_name || !data.company_category || !data.region) return res.status(400).json({ success: false, error: 'Champs boutique obligatoires manquants' });
      const ref = await db.collection('Shop').add({ ...data, created_date: admin.firestore.FieldValue.serverTimestamp(), updated_date: admin.firestore.FieldValue.serverTimestamp() });
      return res.json({ success: true, shop: { id: ref.id, ...data } });
    }
    if (action === 'update') {
      const shopId = String(req.body?.shopId || '').trim();
      if (!shopId) return res.status(400).json({ success: false, error: 'Boutique manquante' });
      const ref = db.collection('Shop').doc(shopId);
      if (!(await ref.get()).exists) return res.status(404).json({ success: false, error: 'Boutique introuvable' });
      const data = cleanData(req.body?.data);
      await ref.set({ ...data, updated_date: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
      return res.json({ success: true, shop: { id: shopId, ...data } });
    }
    return res.status(400).json({ success: false, error: 'Action boutique inconnue' });
  } catch (error) {
    return respondError(res, error);
  }
});
