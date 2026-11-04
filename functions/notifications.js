const admin = require('firebase-admin');
const { onDocumentCreated, onDocumentUpdated } = require('firebase-functions/v2/firestore');

const db = admin.firestore();
const messaging = admin.messaging();

const STATUS_COPY = {
  pending: ['Nouvelle commande', 'Une nouvelle commande attend votre traitement.'],
  accepted: ['Commande acceptée', 'Le vendeur a accepté votre commande.'],
  confirmed: ['Commande confirmée', 'Votre commande est confirmée.'],
  rejected: ['Commande refusée', 'Le vendeur ne peut pas traiter votre commande.'],
  refused: ['Commande refusée', 'Le vendeur ne peut pas traiter votre commande.'],
  preparing: ['Commande en préparation', 'Votre commande est en cours de préparation.'],
  ready: ['Commande prête', 'Votre commande est prête.'],
  in_delivery: ['Commande en livraison', 'Votre commande est en cours de livraison.'],
  delivered: ['Commande livrée', 'Votre commande a été livrée.'],
  cancelled: ['Commande annulée', 'La commande a été annulée.'],
};

function asString(value) {
  return value === undefined || value === null ? '' : String(value);
}

function uniqueIds(values) {
  return [...new Set(values.flatMap((value) => Array.isArray(value) ? value : [value]).map(asString).filter(Boolean))];
}

function statusKey(value) {
  return asString(value).trim().toLowerCase().replace(/[ -]+/g, '_').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

async function claimEvent(eventId) {
  const ref = db.collection('NotificationEvent').doc(eventId.slice(0, 150));
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(ref);
    if (snapshot.exists) return false;
    transaction.create(ref, { created_at: admin.firestore.FieldValue.serverTimestamp() });
    return true;
  });
}

async function shopOwnerIds(order) {
  const ids = uniqueIds([
    order.shop_owner_id,
    order.shop_owner_uid,
    order.vendor_id,
    order.seller_id,
    order.owner_id,
    order.merchant_id,
    order.restaurant_owner_id,
    order.hotel_owner_id,
    order.organizer_id,
  ]);
  if (order.shop_id) {
    const shop = await db.collection('Shop').doc(asString(order.shop_id)).get();
    if (shop.exists) {
      const data = shop.data() || {};
      ids.push(...uniqueIds([
        data.user_id,
        data.owner_id,
        data.owner_uid,
        data.vendor_id,
        data.merchant_id,
        data.restaurant_owner_id,
        data.hotel_owner_id,
        data.organizer_id,
      ]));
    }
  }
  return uniqueIds(ids);
}

async function sendToUsers(userIds, { title, body, url = '/Dashboard', tag, preference = 'order_updates' }) {
  const ids = uniqueIds(userIds);
  if (!ids.length) return { sent: 0, skipped: 0 };
  const users = await Promise.all(ids.map((id) => db.collection('User').doc(id).get()));
  const tokenOwners = [];
  users.forEach((snapshot) => {
    if (!snapshot.exists) return;
    const data = snapshot.data() || {};
    if (data.notification_preferences?.[preference] === false) return;
    const tokens = Array.isArray(data.web_push_tokens) ? data.web_push_tokens.filter(Boolean) : [];
    tokens.forEach((token) => tokenOwners.push({ token, uid: snapshot.id }));
  });
  const tokens = [...new Set(tokenOwners.map((item) => item.token))];
  if (!tokens.length) return { sent: 0, skipped: ids.length };

  const response = await messaging.sendEachForMulticast({
    tokens: tokens.slice(0, 500),
    notification: { title, body },
    data: { title, body, url, tag: tag || `kairos-${Date.now()}` },
    webpush: { fcmOptions: { link: url } },
  });

  const invalidByUser = new Map();
  response.responses.forEach((result, index) => {
    const code = result.error?.code || '';
    if (code.includes('registration-token-not-registered') || code.includes('invalid-registration-token')) {
      const owner = tokenOwners.find((item) => item.token === tokens[index]);
      if (owner) invalidByUser.set(owner.uid, [...(invalidByUser.get(owner.uid) || []), owner.token]);
    }
  });
  await Promise.all([...invalidByUser.entries()].map(([uid, invalidTokens]) => db.collection('User').doc(uid).update({
    web_push_tokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
  }).catch(() => {})));
  return { sent: response.successCount, failed: response.failureCount };
}

async function notifyNewOrder(order, eventId) {
  if (!(await claimEvent(eventId))) return null;
  const merchantIds = await shopOwnerIds(order);
  const driverIds = uniqueIds([order.driver_id, order.assigned_driver_id, order.livreur_id]);
  const result = await sendToUsers(merchantIds, {
    title: 'Nouvelle commande',
    body: `Commande #${order.order_number || order.id || 'à traiter'} reçue dans votre espace professionnel Kairos.`,
    url: '/Dashboard',
    tag: `order-new-${order.id || eventId}`,
  });
  const driverResult = await sendToUsers(driverIds, {
    title: 'Nouvelle livraison',
    body: `Une commande #${order.order_number || order.id || 'à traiter'} vous est assignée.`,
    url: '/DriverDashboard',
    tag: `delivery-new-${order.id || eventId}`,
  });
  return { merchant: result, driver: driverResult };
}

async function notifyOrderStatus(before, after, eventId) {
  const beforeStatus = statusKey(before.status || before.order_status || before.state);
  const afterStatus = statusKey(after.status || after.order_status || after.state);
  const previousDrivers = uniqueIds([before.driver_id, before.assigned_driver_id, before.livreur_id]);
  const currentDrivers = uniqueIds([after.driver_id, after.assigned_driver_id, after.livreur_id]);
  const newlyAssignedDrivers = currentDrivers.filter((id) => !previousDrivers.includes(id));
  if ((!afterStatus || beforeStatus === afterStatus) && !newlyAssignedDrivers.length) return null;
  if (!(await claimEvent(eventId))) return null;
  if (beforeStatus === afterStatus && newlyAssignedDrivers.length) {
    return sendToUsers(newlyAssignedDrivers, {
      title: 'Nouvelle livraison',
      body: `La commande #${after.order_number || after.id || ''} vous a été assignée.`.trim(),
      url: '/DriverDashboard',
      tag: `delivery-assigned-${after.id || eventId}`,
    });
  }
  const [title, body] = STATUS_COPY[afterStatus];
  const clientIds = uniqueIds([after.client_id, after.customer_id, after.user_id]);
  const merchantIds = await shopOwnerIds(after);
  const driverIds = uniqueIds([after.driver_id, after.assigned_driver_id, after.livreur_id]);
  const recipients = uniqueIds([...clientIds, ...merchantIds, ...driverIds]);
  const result = await sendToUsers(recipients, {
    title,
    body: `${body} Commande #${after.order_number || after.id || ''}`.trim(),
    url: clientIds.length ? '/Orders' : '/Dashboard',
    tag: `order-status-${after.id || eventId}-${afterStatus}`,
  });
  return { recipients: recipients.length, result };
}

async function notifyMessage(message, eventId) {
  const recipientIds = uniqueIds([message.recipient_id, message.receiver_id, message.to_user_id, message.recipient_ids]);
  const senderId = asString(message.sender_id || message.from_user_id);
  const ids = recipientIds.filter((id) => id !== senderId);
  if (!ids.length || !(await claimEvent(eventId))) return null;
  return sendToUsers(ids, {
    title: message.sender_name ? `Message de ${message.sender_name}` : 'Nouveau message',
    body: asString(message.content || message.text || 'Vous avez reçu un nouveau message.').slice(0, 140),
    url: message.conversation_id ? `/Chat?id=${encodeURIComponent(message.conversation_id)}` : '/Chat',
    tag: `message-${message.conversation_id || eventId}`,
    preference: 'order_updates',
  });
}

async function notifyTicketConfirmed(before, after, eventId) {
  const beforeStatus = statusKey(before.status || before.payment_status);
  const afterStatus = statusKey(after.status || after.payment_status);
  if (!['confirmed', 'paid', 'approved', 'valid'].includes(afterStatus) || beforeStatus === afterStatus) return null;
  if (!(await claimEvent(eventId))) return null;
  return sendToUsers(uniqueIds([after.user_id, after.client_id, after.buyer_id, after.customer_id]), {
    title: 'Billet confirmé',
    body: `Votre billet${after.event_name ? ` pour ${after.event_name}` : ''} est confirmé.`,
    url: '/Dashboard',
    tag: `ticket-${after.id || eventId}`,
    preference: 'order_updates',
  });
}

exports.onOrderCreated = onDocumentCreated('Order/{orderId}', async (event) => {
  const order = event.data?.data();
  if (!order) return null;
  return notifyNewOrder({ ...order, id: event.params.orderId }, `order-created-${event.params.orderId}`);
});

exports.onOrderStatusChanged = onDocumentUpdated('Order/{orderId}', async (event) => {
  const before = event.data?.before.data() || {};
  const after = { ...event.data?.after.data(), id: event.params.orderId };
  const updateKey = event.data?.after.updateTime?.toMillis?.() || Date.now();
  return notifyOrderStatus(before, after, `order-status-${event.params.orderId}-${updateKey}`);
});

exports.onMessageCreated = onDocumentCreated('Message/{messageId}', async (event) => {
  const message = { ...event.data?.data(), id: event.params.messageId };
  return message ? notifyMessage(message, `message-${event.params.messageId}`) : null;
});

exports.onConversationMessageCreated = onDocumentCreated('ConversationMessage/{messageId}', async (event) => {
  const message = { ...event.data?.data(), id: event.params.messageId };
  return message ? notifyMessage(message, `conversation-message-${event.params.messageId}`) : null;
});

async function ticketHandler(event) {
  const before = event.data?.before.data() || {};
  const after = { ...event.data?.after.data(), id: event.params.ticketId };
  return notifyTicketConfirmed(before, after, `ticket-${event.params.ticketId}-${statusKey(after.status || after.payment_status)}`);
}

exports.onTicketConfirmed = onDocumentUpdated('Ticket/{ticketId}', ticketHandler);
exports.onTicketOrderConfirmed = onDocumentUpdated('TicketOrder/{ticketId}', ticketHandler);
exports.onTicketPurchaseConfirmed = onDocumentUpdated('TicketPurchase/{ticketId}', ticketHandler);
