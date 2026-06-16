import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const raw = await req.text();
    let body;
    try { body = JSON.parse(raw); } catch (_) {
      return Response.json({ error: 'JSON invalide' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    const { accessCode } = body || {};

    if (!accessCode) {
      return Response.json({ error: 'Numéro de facture requis' }, { status: 400 });
    }

    const code = String(accessCode).trim();
    if (code.length < 1 || code.length > 50) {
      return Response.json({ error: 'Numéro de facture invalide' }, { status: 400 });
    }

    const APP_ID = Deno.env.get('APPSHEET_APP_ID');
    const API_KEY = Deno.env.get('APPSHEET_API_KEY');
    if (!APP_ID || !API_KEY) {
      return Response.json({ error: 'Configuration manquante' }, { status: 500 });
    }

    const apiUrl = `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/WORK%20ORDER/Action`;

    const appResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Action: 'Find',
        Properties: {
          Locale: 'fr-FR',
          Selector: `FILTER("WORK ORDER", [INVOICE NUMBER]="${code}")`
        },
        Rows: []
      })
    });

    const responseText = await appResponse.text();

    if (!appResponse.ok) {
      return Response.json({
        error: 'Erreur AppSheet ' + appResponse.status,
        detail: responseText.substring(0, 300)
      }, { status: 502 });
    }

    if (!responseText || responseText.trim() === '' || responseText.trim() === '[]') {
      return Response.json({ error: 'Aucune commande trouvée avec ce numéro de facture' }, { status: 404 });
    }

    let rows;
    try { rows = JSON.parse(responseText); } catch (_) {
      return Response.json({ error: 'Réponse AppSheet invalide' }, { status: 502 });
    }

    if (!Array.isArray(rows) || rows.length === 0) {
      return Response.json({ error: 'Aucune commande trouvée avec ce numéro de facture' }, { status: 404 });
    }

    return Response.json({ success: true, data: rows[0], table: 'WORK ORDER' });

  } catch (error) {
    return Response.json({ error: 'Erreur interne', detail: error.message }, { status: 500 });
  }
});