import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { type, orderData, shopData, clientData } = await req.json();

    if (type === 'new_order') {
      // Email au vendeur pour nouvelle commande
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Rapido Presto',
        to: shopData.email,
        subject: `🎉 Nouvelle commande #${orderData.order_number}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF9900;">Nouvelle commande reçue !</h2>
            <p>Bonjour <strong>${shopData.company_name}</strong>,</p>
            <p>Vous avez reçu une nouvelle commande :</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Numéro de commande :</strong> ${orderData.order_number}</p>
              <p><strong>Client :</strong> ${clientData.name}</p>
              <p><strong>Téléphone :</strong> ${clientData.phone}</p>
              <p><strong>Adresse :</strong> ${clientData.address}</p>
              <p><strong>Montant total :</strong> ${orderData.total} HTG</p>
            </div>
            
            <h3>Articles commandés :</h3>
            <ul>
              ${orderData.items.map(item => `
                <li>${item.name} - Quantité: ${item.quantity} - ${item.total} HTG</li>
              `).join('')}
            </ul>
            
            <p style="margin-top: 30px;">
              <a href="https://rapido-presto.base44.app/EnterpriseDashboard" 
                 style="background: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                Voir la commande
              </a>
            </p>
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Ceci est un email automatique de Rapido Presto
            </p>
          </div>
        `
      });

      return Response.json({ success: true, message: 'Email vendeur envoyé' });
    }

    if (type === 'status_update') {
      // Email au client pour changement de statut
      const statusMessages = {
        accepted: { title: '✅ Commande acceptée', message: 'Votre commande a été acceptée et est en cours de préparation.' },
        preparing: { title: '👨‍🍳 En préparation', message: 'Votre commande est en cours de préparation.' },
        ready: { title: '📦 Commande prête', message: 'Votre commande est prête et attend la livraison.' },
        driver_assigned: { title: '🚗 Livreur assigné', message: 'Un livreur a été assigné à votre commande.' },
        in_delivery: { title: '🛵 En livraison', message: 'Votre commande est en cours de livraison.' },
        delivered: { title: '🎉 Commande livrée', message: 'Votre commande a été livrée avec succès !' },
        cancelled: { title: '❌ Commande annulée', message: 'Votre commande a été annulée.' }
      };

      const statusInfo = statusMessages[orderData.status] || { title: 'Mise à jour', message: 'Statut de votre commande mis à jour.' };

      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'Rapido Presto',
        to: clientData.email || clientData.phone + '@temp.com', // Fallback si pas d'email
        subject: `${statusInfo.title} - Commande #${orderData.order_number}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #FF9900;">${statusInfo.title}</h2>
            <p>Bonjour <strong>${clientData.name}</strong>,</p>
            <p>${statusInfo.message}</p>
            
            <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Numéro de commande :</strong> ${orderData.order_number}</p>
              <p><strong>Boutique :</strong> ${shopData.company_name}</p>
              <p><strong>Montant total :</strong> ${orderData.total} HTG</p>
              <p><strong>Statut actuel :</strong> ${statusInfo.title}</p>
            </div>
            
            ${orderData.status === 'delivered' ? `
              <p style="margin-top: 20px;">
                <a href="https://rapido-presto.base44.app/Orders" 
                   style="background: #FF9900; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  Laisser un avis
                </a>
              </p>
            ` : ''}
            
            <p style="color: #666; font-size: 12px; margin-top: 30px;">
              Merci d'avoir choisi Rapido Presto !
            </p>
          </div>
        `
      });

      return Response.json({ success: true, message: 'Email client envoyé' });
    }

    return Response.json({ error: 'Type invalide' }, { status: 400 });

  } catch (error) {
    console.error('Erreur sendOrderEmail:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});