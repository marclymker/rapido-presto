import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);

        // Fetch analytics data from UserActivity entity
        const activities = await base44.asServiceRole.entities.UserActivity.list('-created_date', 1000);
        const orders = await base44.asServiceRole.entities.Order.list('-created_date', 500);

        // CSV headers for GA4 import
        const headers = [
            'event_date',
            'event_name',
            'user_id',
            'product_id',
            'product_name',
            'category',
            'shop_id',
            'value',
            'currency'
        ].join(',');

        // Map activities to CSV rows
        const activityRows = activities.map(activity => {
            const eventDate = new Date(activity.created_date).toISOString().split('T')[0].replace(/-/g, '');
            const eventName = activity.activity_type;
            
            return [
                eventDate,
                eventName,
                activity.user_id || '',
                activity.product_id || '',
                `"${(activity.product_name || '').replace(/"/g, '""')}"`,
                activity.category || '',
                activity.shop_id || '',
                '',
                'HTG'
            ].join(',');
        });

        // Map orders to purchase events
        const orderRows = orders.map(order => {
            const eventDate = new Date(order.created_date).toISOString().split('T')[0].replace(/-/g, '');
            
            return [
                eventDate,
                'purchase',
                order.client_id,
                order.items?.[0]?.product_id || '',
                `"${(order.items?.[0]?.name || '').replace(/"/g, '""')}"`,
                '',
                order.shop_id,
                order.total,
                'HTG'
            ].join(',');
        });

        const csv = [headers, ...activityRows, ...orderRows].join('\n');

        return new Response(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': 'attachment; filename=ga4-events.csv',
                'Cache-Control': 'public, max-age=1800',
            },
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});