import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { lat, lng, type, radius = 3000 } = await req.json();

        if (!lat || !lng || !type) {
            return Response.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY');
        if (!apiKey) {
            return Response.json({ error: 'API key not configured' }, { status: 500 });
        }

        // Appel à Google Places API
        const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${apiKey}`;
        
        const response = await fetch(url);
        const data = await response.json();

        if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
            return Response.json({ 
                error: 'Google Places API error', 
                details: data.status 
            }, { status: 500 });
        }

        // Formater les résultats pour correspondre à notre structure Shop
        const places = (data.results || []).map(place => ({
            id: place.place_id,
            company_name: place.name,
            company_category: type,
            company_logo_url: place.photos && place.photos[0] 
                ? `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${place.photos[0].photo_reference}&key=${apiKey}`
                : null,
            rating: place.rating || 4.5,
            vicinity: place.vicinity,
            location: place.geometry?.location,
            is_google_place: true,
            is_active: place.business_status === 'OPERATIONAL'
        }));

        return Response.json({ places, status: data.status });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});