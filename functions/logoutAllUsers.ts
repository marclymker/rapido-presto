import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Vérifier que l'utilisateur est admin
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Récupérer tous les utilisateurs
    const users = await base44.asServiceRole.entities.User.list();
    
    // Forcer la déconnexion en invalidant les sessions
    // Note: Base44 ne permet pas de révoquer les tokens directement
    // Cette fonction sert principalement à envoyer une notification push
    // demandant aux utilisateurs de se reconnecter
    
    const loggedOutCount = users.length;

    // Optionnel: Envoyer une notification push à tous les utilisateurs
    // pour leur demander de se reconnecter
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
      message: `${loggedOutCount} utilisateurs notifiés pour reconnexion`,
      count: loggedOutCount
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});