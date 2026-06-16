import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const raw = await req.text();
    const body = raw ? JSON.parse(raw) : {};

    const base44 = createClientFromRequest(req);

    const appId = Deno.env.get('APPSHEET_APP_ID');
    const apiKey = Deno.env.get('APPSHEET_API_KEY');

    if (!appId || !apiKey) {
      return Response.json({ error: 'Configuration incomplète' }, { status: 500 });
    }

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

    const text = await response.text();

    return Response.json({
      status: response.status,
      ok: response.ok,
      bodyLen: text.length,
      preview: text.substring(0, 1000)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});