import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify user is authenticated
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const appId = Deno.env.get("ONESIGNAL_APP_ID");
    
    if (!appId) {
      return Response.json({ error: 'OneSignal App ID not configured' }, { status: 500 });
    }

    return Response.json({ appId });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});