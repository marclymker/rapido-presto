'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');

const db = admin.firestore();
const options = { cors: false, maxInstances: 20 };
const MAX_MESSAGE_LENGTH = 2000;

async function requireUser(req) {
  const header = req.get('authorization') || '';
  if (!header.startsWith('Bearer ')) throw Object.assign(new Error('Connexion requise'), { status: 401 });
  try {
    return await admin.auth().verifyIdToken(header.slice(7));
  } catch (_) {
    throw Object.assign(new Error('Session Firebase invalide'), { status: 401 });
  }
}

function cleanText(value, fallback = '') {
  return String(value ?? fallback).replace(/[<>]/g, '').trim().slice(0, MAX_MESSAGE_LENGTH);
}

function serialize(snapshot) {
  return { id: snapshot.id, ...snapshot.data() };
}

async function getConversationForUser(userId, conversationId) {
  const snapshot = await db.collection('Conversation').doc(String(conversationId)).get();
  if (!snapshot.exists) throw Object.assign(new Error('Conversation introuvable'), { status: 404 });
  const conversation = serialize(snapshot);
  if (conversation.customer_id !== userId && conversation.vendor_id !== userId) {
    throw Object.assign(new Error('Accès refusé à cette conversation'), { status: 403 });
  }
  return conversation;
}

function sendError(res, error) {
  console.error('chatService:', error.message);
  return res.status(error.status || 500).json({ success: false, error: error.message || 'Erreur de messagerie' });
}

exports.chatService = onRequest(options, async (req, res) => {
  try {
    if (req.method !== 'POST') throw Object.assign(new Error('POST required'), { status: 405 });
    const decoded = await requireUser(req);
    const userId = decoded.uid;
    const action = String(req.body?.action || '');

    if (action === 'init') {
      const vendorId = cleanText(req.body?.vendor_id);
      const shopId = cleanText(req.body?.shop_id);
      const productId = cleanText(req.body?.product_id);
      if (!vendorId || !shopId || !productId) throw Object.assign(new Error('Vendeur, boutique et produit requis'), { status: 400 });
      if (vendorId === userId) throw Object.assign(new Error('Vous ne pouvez pas contacter votre propre boutique'), { status: 400 });

      const [shopSnapshot, productSnapshot] = await Promise.all([
        db.collection('Shop').doc(shopId).get(),
        db.collection('Product').doc(productId).get(),
      ]);
      if (!shopSnapshot.exists || shopSnapshot.data().user_id !== vendorId) throw Object.assign(new Error('Boutique invalide'), { status: 400 });
      if (!productSnapshot.exists || productSnapshot.data().shop_id !== shopId) throw Object.assign(new Error('Article invalide'), { status: 400 });

      const existingSnapshot = await db.collection('Conversation')
        .where('customer_id', '==', userId)
        .where('shop_id', '==', shopId)
        .limit(1)
        .get();

      let conversationRef;
      let conversation;
      let shouldSendInitial = true;
      if (!existingSnapshot.empty) {
        conversationRef = existingSnapshot.docs[0].ref;
        conversation = serialize(existingSnapshot.docs[0]);
        shouldSendInitial = conversation.product_context_id !== productId;
        await conversationRef.set({
          product_context_id: productId,
          product_context_name: cleanText(productSnapshot.data().name, 'Article'),
          product_context_image: cleanText(productSnapshot.data().image_url),
          updated_date: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      } else {
        conversationRef = db.collection('Conversation').doc();
        const customerSnapshot = await db.collection('User').doc(userId).get();
        const customer = customerSnapshot.exists ? customerSnapshot.data() : {};
        conversation = {
          id: conversationRef.id,
          customer_id: userId,
          customer_name: cleanText(customer.full_name || decoded.name || decoded.email?.split('@')[0], 'Client'),
          vendor_id: vendorId,
          shop_id: shopId,
          shop_name: cleanText(shopSnapshot.data().company_name, 'Boutique'),
          shop_logo: cleanText(shopSnapshot.data().company_logo_url),
          product_context_id: productId,
          product_context_name: cleanText(productSnapshot.data().name, 'Article'),
          product_context_image: cleanText(productSnapshot.data().image_url),
          last_message: '',
          last_message_date: admin.firestore.FieldValue.serverTimestamp(),
          created_date: admin.firestore.FieldValue.serverTimestamp(),
        };
        await conversationRef.set(conversation);
      }

      if (shouldSendInitial) {
        const content = 'Bonjour, cet article est-il disponible ?';
        const messageRef = db.collection('ConversationMessage').doc();
        await messageRef.set({
          conversation_id: conversationRef.id,
          sender_id: userId,
          sender_name: conversation.customer_name || decoded.name || 'Client',
          recipient_id: vendorId,
          content,
          type: 'text',
          is_read: false,
          metadata: {
            productId,
            productName: cleanText(productSnapshot.data().name, 'Article'),
            productImage: cleanText(productSnapshot.data().image_url),
            productPrice: Number(productSnapshot.data().promo_price || productSnapshot.data().price || 0),
            productSlug: cleanText(productSnapshot.data().slug),
          },
          created_date: admin.firestore.FieldValue.serverTimestamp(),
        });
        await conversationRef.set({
          last_message: content,
          last_message_date: admin.firestore.FieldValue.serverTimestamp(),
          unread_count_vendor: admin.firestore.FieldValue.increment(1),
        }, { merge: true });
      }
      return res.json({ success: true, id: conversationRef.id, conversation: { id: conversationRef.id, customer_id: userId, vendor_id: vendorId, shop_id: shopId, product_context_id: productId } });
    }

    if (action === 'list') {
      const [customerSnapshot, vendorSnapshot] = await Promise.all([
        db.collection('Conversation').where('customer_id', '==', userId).limit(100).get(),
        db.collection('Conversation').where('vendor_id', '==', userId).limit(100).get(),
      ]);
      const map = new Map();
      [...customerSnapshot.docs, ...vendorSnapshot.docs].forEach((doc) => map.set(doc.id, serialize(doc)));
      const conversations = [...map.values()].sort((a, b) => new Date(b.last_message_date || b.created_date || 0) - new Date(a.last_message_date || a.created_date || 0));
      return res.json({ success: true, data: conversations });
    }

    if (action === 'messages') {
      const conversation = await getConversationForUser(userId, req.body?.convId || req.body?.conversation_id);
      const snapshot = await db.collection('ConversationMessage').where('conversation_id', '==', conversation.id).limit(200).get();
      const messages = snapshot.docs.map(serialize).sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0));
      return res.json({ success: true, data: messages.slice(-100) });
    }

    if (action === 'send') {
      const conversation = await getConversationForUser(userId, req.body?.conversation_id);
      const content = cleanText(req.body?.content);
      if (!content) throw Object.assign(new Error('Message vide'), { status: 400 });
      const recipientId = conversation.customer_id === userId ? conversation.vendor_id : conversation.customer_id;
      const messageRef = db.collection('ConversationMessage').doc();
      await messageRef.set({
        conversation_id: conversation.id,
        sender_id: userId,
        sender_name: cleanText(decoded.name || decoded.email?.split('@')[0], 'Utilisateur'),
        recipient_id: recipientId,
        content,
        type: cleanText(req.body?.type, 'text') === 'image' ? 'image' : cleanText(req.body?.type, 'text') === 'product' ? 'product' : 'text',
        metadata: req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {},
        is_read: false,
        created_date: admin.firestore.FieldValue.serverTimestamp(),
      });
      await db.collection('Conversation').doc(conversation.id).set({
        last_message: content,
        last_message_date: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return res.json({ success: true, message: { id: messageRef.id, conversation_id: conversation.id, sender_id: userId, content } });
    }

    if (action === 'vendor_products') {
      const conversation = await getConversationForUser(userId, req.body?.convId || req.body?.conversation_id);
      if (conversation.vendor_id !== userId) throw Object.assign(new Error('Réservé à la boutique'), { status: 403 });
      const snapshot = await db.collection('Product').where('shop_id', '==', conversation.shop_id).limit(100).get();
      return res.json({ success: true, data: snapshot.docs.map(serialize) });
    }

    throw Object.assign(new Error('Action de chat inconnue'), { status: 400 });
  } catch (error) {
    return sendError(res, error);
  }
});
