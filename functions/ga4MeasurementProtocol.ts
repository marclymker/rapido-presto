import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const { eventName, params, clientId } = await req.json();

        const measurementId = Deno.env.get('GA4_MEASUREMENT_ID');
        const apiSecret = Deno.env.get('GA4_API_SECRET');

        if (!measurementId || !apiSecret) {
            return Response.json({ 
                error: 'GA4 credentials not configured' 
            }, { status: 500 });
        }

        // Send event to GA4 Measurement Protocol
        const response = await fetch(
            `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client_id: clientId || 'anonymous',
                    events: [{
                        name: eventName,
                        params: {
                            ...params,
                            engagement_time_msec: '100'
                        }
                    }]
                })
            }
        );

        if (!response.ok) {
            throw new Error(`GA4 API error: ${response.statusText}`);
        }

        return Response.json({ success: true });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});