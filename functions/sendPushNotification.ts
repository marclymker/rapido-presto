import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Pusher from 'npm:pusher'; // On importe directement la bibliothèque

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, title, message, data } = await req.json();
    
    if (!userId || !title || !message) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
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