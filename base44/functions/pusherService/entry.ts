import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import Pusher from 'npm:pusher@5.2.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, channel, event, data } = await req.json();

    if (action === 'send') {
      if (!channel || !event || !data) {
        return Response.json({ error: 'Missing required fields: channel, event, data' }, { status: 400 });
      }

      // Initialiser Pusher dans le handler
      const pusher = new Pusher({
        appId: Deno.env.get('PUSHER_APP_ID'),
        key: Deno.env.get('PUSHER_KEY'),
        secret: Deno.env.get('PUSHER_SECRET'),
        cluster: Deno.env.get('PUSHER_CLUSTER'),
        useTLS: true
      });

      try {
        await pusher.trigger(channel, event, data);
        console.log(`Pusher notification sent to ${channel}:${event}`);
        return Response.json({ success: true, message: 'Notification sent' });
      } catch (error) {
        console.error('Pusher error:', error.message);
        return Response.json({ success: false, message: 'Failed to send notification' });
      }
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Service error:', error);
    return Response.json({ error: 'Internal server error', message: error.message }, { status: 500 });
  }
});