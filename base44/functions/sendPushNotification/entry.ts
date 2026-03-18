import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Pusher from 'npm:pusher'; // On importe directement la bibliothèque

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, title, message, data, notification_type } = await req.json();
    
    if (!userId || !title || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Check user notification preferences
    if (notification_type) {
      try {
        const user = await base44.asServiceRole.entities.User.get(userId);
        const preferences = user?.notification_preferences || {};
        
        // If user has disabled this type, skip notification
        if (preferences[notification_type] === false) {
          console.log(`Notification skipped: User ${userId} disabled ${notification_type}`);
          return Response.json({ 
            success: true, 
            skipped: true,
            reason: 'User preference disabled'
          });
        }
      } catch (error) {
        console.warn('Could not check preferences:', error);
        // Continue if we can't check preferences
      }
    }

    // Récupération des clés directement depuis les variables d'environnement de Base44
    const pusher = new Pusher({
      appId: Deno.env.get('PUSHER_APP_ID'),
      key: Deno.env.get('PUSHER_KEY'),
      secret: Deno.env.get('PUSHER_SECRET'),
      cluster: Deno.env.get('PUSHER_CLUSTER'),
      useTLS: true
    });

    // Envoi de la notification
    await pusher.trigger(`user-${userId}`, 'new-notification', {
      title: title,
      message: message,
      data: data || {}
    });

    return Response.json({ success: true, method: 'direct-pusher' });

  } catch (error) {
    console.error('Erreur lors de l\'envoi Pusher:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});