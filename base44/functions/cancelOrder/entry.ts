import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// --- Rate Limiting simplifié (in-memory) ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const RATE_LIMIT_MAX = 10;

function checkRateLimit(ip, key, maxRequests) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + RATE_LIMIT_WINDOW; }
  entry.count++;
  rateLimitMap.set(key, entry);
  return entry.count <= maxRequests;
}

// Nettoyage périodique
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);

// --- Validation simplifiée ---
function validateCancelInput(body) {
  if (!body.orderId) return { valid: false, error: 'orderId requis' };
  if (!body.reason_id) return { valid: false, error: 'reason_id requis' };
  return { valid: true };
}

Deno.serve(async (req) => {
  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip, `cancel-${ip}`, RATE_LIMIT_MAX)) {
      return Response.json({ error: 'Trop de requêtes, veuillez patienter' }, { status: 429 });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    const validation = validateCancelInput(body);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const { orderId, reason_id, reason_label, reason_details } = body;

    // Vérifier la commande avec les permissions utilisateur
    const orders = await base44.entities.Order.filter({ id: orderId });
    if (!orders || orders.length === 0) {
      return Response.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    const orderData = orders[0];

    // Vérification propriété
    if (orderData.client_id !== user.id) {
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Vérifier si la commande peut être annulée
    if (['delivered', 'cancelled'].includes(orderData.status)) {
      return Response.json({ error: 'Cette commande ne peut pas être annulée' }, { status: 400 });
    }

    // Calcul des frais d'annulation côté serveur
    const statusFeeMap = {
      'pending': 0,
      'accepted': 0.10,
      'preparing': 0.20,
      'ready': 0.30,
      'searching_driver': 0.30,
      'driver_assigned': 0.50,
      'in_delivery': 1.0
    };

    const feePercent = statusFeeMap[orderData.status] || 0;
    const cancelFee = Math.round(orderData.total * feePercent);
    const refundAmount = orderData.total - cancelFee;

    // Créer le log d'annulation
    await base44.asServiceRole.entities.CancellationLog.create({
      order_id: orderId,
      order_number: orderData.order_number,
      client_id: user.id,
      client_name: user.full_name,
      shop_id: orderData.shop_id,
      shop_name: orderData.shop_name,
      cancelled_by: 'client',
      reason_id,
      reason_label: reason_label || '',
      reason_details: reason_details || '',
      order_status_at_cancellation: orderData.status,
      order_total: orderData.total,
      cancellation_fee: cancelFee,
      refund_amount: refundAmount,
      fee_percentage: feePercent,
      payment_method: orderData.payment_method,
      refund_status: orderData.payment_method === 'CASH' && cancelFee > 0 ? 'added_to_balance' : 'pending'
    });

    // Mettre à jour le statut de la commande
    await base44.asServiceRole.entities.Order.update(orderId, {
      status: 'cancelled'
    });

    // Gestion du remboursement
    if (orderData.payment_method === 'CASH' && cancelFee > 0) {
      const freshUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
      const currentBalance = freshUsers[0]?.pending_balance || 0;
      await base44.asServiceRole.entities.User.update(user.id, {
        pending_balance: currentBalance + cancelFee
      });
    } else if (orderData.payment_method !== 'CASH' && refundAmount > 0) {
      console.log(`Refund of ${refundAmount} HTG should be processed for order ${orderData.order_number}`);
    }

    // Notifications
    try {
      await base44.asServiceRole.functions.invoke('sendOrderNotification', {
        orderId,
        status: 'cancelled',
        message: `La commande ${orderData.order_number} a été annulée par le client.`
      });
    } catch (e) {
      console.error('Failed to send notification:', e);
    }

    return Response.json({
      success: true,
      message: 'Commande annulée avec succès',
      refund_amount: refundAmount,
      cancellation_fee: cancelFee,
      balance_updated: orderData.payment_method === 'CASH' && cancelFee > 0
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    return Response.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
});