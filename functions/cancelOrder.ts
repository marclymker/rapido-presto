import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { checkRateLimit, rateLimitResponse } from './rateLimiter.js';
import { validateInput, cancelOrderSchema } from './validationSchemas.js';

Deno.serve(async (req) => {
  try {
    // SÉCURITÉ: Rate limiting
    const rateLimit = checkRateLimit(req, 'cancel-order', 10);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfter);
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    const body = await req.json();
    
    // SÉCURITÉ: Validation Zod des entrées (champs de base)
    const basicValidation = validateInput(cancelOrderSchema, {
      orderId: body.orderId,
      reasonId: body.reason_id,
      reasonLabel: body.reason_label,
      reasonDetails: body.reason_details
    });
    
    if (!basicValidation.success) {
      return Response.json({ error: basicValidation.error, details: basicValidation.details }, { status: 400 });
    }

    const {
      orderId,
      reason_id,
      reason_label,
      reason_details
    } = body;
    
    // SÉCURITÉ: Ne JAMAIS faire confiance aux montants du client - toujours recalculer côté serveur

    // SÉCURITÉ: Utiliser entities normal (pas asServiceRole) pour vérifier propriété
    const order = await base44.entities.Order.filter({ id: orderId });
    if (!order || order.length === 0) {
      return Response.json({ error: 'Commande introuvable' }, { status: 404 });
    }

    const orderData = order[0];

    // SÉCURITÉ: Vérification stricte de propriété
    if (orderData.client_id !== user.id) {
      console.error(`Unauthorized cancellation attempt: User ${user.id} tried to cancel order ${orderId} owned by ${orderData.client_id}`);
      return Response.json({ error: 'Non autorisé' }, { status: 403 });
    }

    // Check if order can be cancelled
    if (['delivered', 'cancelled'].includes(orderData.status)) {
      return Response.json({ error: 'Cette commande ne peut pas être annulée' }, { status: 400 });
    }

    // Create cancellation log
    await base44.asServiceRole.entities.CancellationLog.create({
      order_id: orderId,
      order_number: orderData.order_number,
      client_id: user.id,
      client_name: user.full_name,
      shop_id: orderData.shop_id,
      shop_name: orderData.shop_name,
      cancelled_by: 'client',
      reason_id,
      reason_label,
      reason_details: reason_details || '',
      order_status_at_cancellation: orderData.status,
      order_total: orderData.total,
      cancellation_fee: fee,
      refund_amount: refund,
      fee_percentage: percent,
      payment_method: orderData.payment_method,
      refund_status: orderData.payment_method === 'CASH' && fee > 0 ? 'added_to_balance' : 'pending'
    });

    // Update order status
    await base44.asServiceRole.entities.Order.update(orderId, {
      status: 'cancelled'
    });

    // Handle refund based on payment method
    if (orderData.payment_method === 'CASH' && fee > 0) {
      // SÉCURITÉ: Utiliser asServiceRole uniquement pour MAJ de balance (cas légitime)
      const freshUser = await base44.asServiceRole.entities.User.filter({ id: user.id });
      const currentBalance = freshUser[0]?.pending_balance || 0;
      await base44.asServiceRole.entities.User.update(user.id, {
        pending_balance: currentBalance + fee
      });
    } else if (orderData.payment_method !== 'CASH' && refund > 0) {
      // For digital payments, initiate refund process
      // This would integrate with Moncash/NatCash APIs
      // For now, we just log it
      console.log(`Refund of ${refund} HTG should be processed for order ${orderData.order_number}`);
    }

    // Send notifications to shop and driver
    try {
      await base44.asServiceRole.functions.invoke('sendOrderNotification', {
        orderId,
        type: 'cancelled',
        message: `La commande ${orderData.order_number} a été annulée par le client.`
      });
    } catch (e) {
      console.error('Failed to send notification:', e);
    }

    return Response.json({
      success: true,
      message: 'Commande annulée avec succès',
      refund_amount: refund,
      cancellation_fee: fee,
      balance_updated: orderData.payment_method === 'CASH' && fee > 0
    });

  } catch (error) {
    console.error('Error cancelling order:', error);
    return Response.json({ error: error.message || 'Erreur serveur' }, { status: 500 });
  }
});