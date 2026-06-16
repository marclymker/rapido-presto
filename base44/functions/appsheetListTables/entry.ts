import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Lister les tables disponibles dans l'app AppSheet
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ error: 'Accès refusé — réservé administrateurs' }, { status: 403 });
    }

    const appId = Deno.env.get('APPSHEET_APP_ID');
    const apiKey = Deno.env.get('APPSHEET_API_KEY');

    if (!appId || !apiKey) {
      return Response.json({ error: 'Configuration AppSheet incomplète' }, { status: 500 });
    }

    // AppSheet n'a pas d'endpoint pour lister les tables directement via l'API REST.
    // On utilise l'endpoint d'application metadata
    const response = await fetch(
      `https://api.appsheet.com/api/v2/apps/${appId}/application/Definition`,
      {
        method: 'POST',
        headers: {
          'ApplicationAccessKey': apiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          Action: 'Read',
          Properties: { Locale: 'fr-FR' },
          Rows: []
        })
      }
    );

    if (!response.ok) {
      // Fallback : on retourne les tables connues en demandant un describe
      const errorText = await response.text();
      return Response.json({
        success: false,
        error: `Impossible de lister les tables: ${response.status}`,
        hint: 'Spécifiez le nom de table manuellement avec appsheetBridge',
        details: errorText.substring(0, 300)
      }, { status: 500 });
    }

    const data = await response.json();

    // Extraire les noms de tables de la définition
    const tables = data?.TableDefs || data?.Tables || [];
    const tableNames = tables.map(t => t.name || t.Name || t.tableName || t.TableName);

    return Response.json({ success: true, tables: tableNames, raw: data });

  } catch (error) {
    console.error('AppSheet List Tables Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});