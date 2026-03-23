import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  
  try {
    const body = await req.json();
    const { transaction_id, order_id, status } = body;

    console.log('Premium webhook received:', { transaction_id, order_id, status });

    // Vérifier que le paiement est réussi
    if (status !== 'successful' && status !== 'completed') {
      return Response.json({ error: 'Paiement non validé' }, { status: 400 });
    }

    // Extraire l'ID de la boutique depuis l'order_id (format: SUB_SHOPID_timestamp)
    const orderParts = order_id.split('_');
    if (orderParts.length < 2 || orderParts[0] !== 'SUB') {
      return Response.json({ error: 'Format order_id invalide' }, { status: 400 });
    }
    
    const shopId = orderParts[1];

    // Calculer la date d'expiration (30 jours)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

    // Mettre à jour la boutique avec le statut Premium
    await base44.asServiceRole.entities.Shop.update(shopId, {
      is_premium: true,
      premium_until: expirationDate.toISOString(),
      last_payment_id: transaction_id,
      boost_enabled: true // Activer automatiquement le boost
    });

    console.log('Premium activé pour shop:', shopId, 'jusqu\'au', expirationDate);

    return Response.json({ 
      success: true,
      message: 'Premium activé avec succès',
      premium_until: expirationDate
    });

  } catch (error) {
    console.error('Erreur webhook Premium:', error);
    return Response.json({ 
      error: 'Erreur interne',
      details: error.message 
    }, { status: 500 });
  }
});