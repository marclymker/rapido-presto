import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const raw = await req.text();
    let body;
    try {
      body = JSON.parse(raw);
    } catch (_) {
      return Response.json({ error: 'JSON invalide' }, { status: 400 });
    }

    const { tableName, accessCode } = body || {};

    if (!tableName || !accessCode) {
      return Response.json({ error: 'tableName et accessCode requis' }, { status: 400 });
    }

    const code = (accessCode || '').trim();
    if (code.length < 3 || code.length > 50 || /[<>{}()\[\]\\;]/.test(code)) {
      return Response.json({ error: 'Code d\'accès invalide' }, { status: 400 });
    }

    const allowedTables = ['Commandes', 'Inventaire', 'Clients', 'Contacts', 'Dossiers'];
    if (!allowedTables.includes(tableName)) {
      return Response.json({ error: 'Type non autorisé' }, { status: 400 });
    }

    const APP_ID = Deno.env.get('APPSHEET_APP_ID');
    const API_KEY = Deno.env.get('APPSHEET_API_KEY');

    if (!APP_ID || !API_KEY) {
      return Response.json({ error: 'Configuration manquante' }, { status: 500 });
    }

    const apiUrl = `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${encodeURIComponent(tableName)}/Action`;
    const filterExpression = `OR([CodeAcces]="${code}", [Code_Acces]="${code}", [Dossier]="${code}", [CodeDossier]="${code}", [Numero_Dossier]="${code}")`;

    const appResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Action: 'Find',
        Properties: {
          Selector: `FILTER("${tableName}", ${filterExpression})`,
          Options: { Skip: 0, Top: 1 }
        }
      })
    });

    if (!appResponse.ok) {
      return Response.json({ error: 'Erreur AppSheet ' + appResponse.status }, { status: 502 });
    }

    const apiData = await appResponse.json();
    const rows = Array.isArray(apiData) ? apiData : (apiData.Rows || []);

    if (!rows || rows.length === 0) {
      return Response.json({ error: 'Aucun dossier trouvé' }, { status: 404 });
    }

    return Response.json({ success: true, data: rows[0], table: tableName });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});