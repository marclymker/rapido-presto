import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Pusher from 'npm:pusher@5.2.0';

// Initialize Pusher
const pusher = new Pusher({
  appId: Deno.env.get('PUSHER_APP_ID'),
  key: Deno.env.get('PUSHER_KEY'),
  secret: Deno.env.get('PUSHER_SECRET'),
  cluster: Deno.env.get('PUSHER_CLUSTER'),
  useTLS: true
});

/**
 * Send a notification via Pusher
 * @param {string} channel - The channel to send to
 * @param {string} event - The event name
 * @param {object} data - The data to send
 * @returns {Promise<boolean>} - Success status
 */
async function sendNotification(channel, event, data) {
  try {
    await pusher.trigger(channel, event, data);
    console.log(`Pusher notification sent to ${channel}:${event}`);
    return true;
  } catch (error) {
    console.error('Pusher error:', error.message);
    // Don't throw - just log and return false to prevent app crashes
    return false;
  }
}

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
        return Response.json({ 
          error: 'Missing required fields: channel, event, data' 
        }, { status: 400 });
      }

      const success = await sendNotification(channel, event, data);
      
      return Response.json({ 
        success,
        message: success ? 'Notification sent' : 'Failed to send notification'
      });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Service error:', error);
    return Response.json({ 
      error: 'Internal server error',
      message: error.message 
    }, { status: 500 });
  }
});

export { sendNotification };