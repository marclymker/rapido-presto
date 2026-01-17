import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Vérifier que l'utilisateur est admin
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Timestamp de déconnexion forcée
    const forceLogoutTimestamp = new Date().toISOString();

    // Récupérer tous les utilisateurs
    const users = await base44.asServiceRole.entities.User.list();
    
    // Mettre à jour tous les utilisateurs avec le timestamp
    const updatePromises = users.map(u => 
      base44.asServiceRole.entities.User.update(u.id, {
        force_logout_at: forceLogoutTimestamp
      })
    );

    await Promise.all(updatePromises);
    
    // Envoyer une notification push
    try {
      await base44.asServiceRole.functions.invoke('sendPushNotification', {
        user_ids: users.map(u => u.id),
        title: 'Maintenance système',
        message: 'Veuillez vous reconnecter à l\'application.',
        data: { action: 'force_logout' }
      });
    } catch (notifError) {
      console.log('Notification error:', notifError);
    }

    return Response.json({ 
      success: true, 
      message: `${users.length} utilisateurs déconnectés avec succès`,
      count: users.length
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});