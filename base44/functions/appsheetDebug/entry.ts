import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const raw = await req.text();
    const base44 = createClientFromRequest(req);

    const APP_ID = Deno.env.get('APPSHEET_APP_ID');
    const API_KEY = Deno.env.get('APPSHEET_API_KEY');

    const results = [];

    // Test 1: Find sans Selector -> retourne toutes les lignes ?
    const r1 = await fetch(
      `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/WORK%20ORDER/Action`,
      {
        method: 'POST',
        headers: { 'ApplicationAccessKey': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Action: 'Find', Rows: [] })
      }
    );
    const t1 = await r1.text();
    results.push({ step: 'Find sans Selector', status: r1.status, ok: r1.ok, bodyLen: t1.length, preview: t1.substring(0, 500) });

    // Test 2: Find avec Selector vide
    const r2 = await fetch(
      `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/WORK%20ORDER/Action`,
      {
        method: 'POST',
        headers: { 'ApplicationAccessKey': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Action: 'Find', Properties: { Selector: '' }, Rows: [] })
      }
    );
    const t2 = await r2.text();
    results.push({ step: 'Find Selector vide', status: r2.status, ok: r2.ok, bodyLen: t2.length, preview: t2.substring(0, 500) });

    // Test 3: Essayer "10425" sans guillemets dans le FILTER (peut-être stocké comme nombre)
    const r3 = await fetch(
      `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/WORK%20ORDER/Action`,
      {
        method: 'POST',
        headers: { 'ApplicationAccessKey': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Action: 'Find', Properties: { Selector: 'FILTER("WORK ORDER", [INVOICE NUMBER]=10425)' }, Rows: [] })
      }
    );
    const t3 = await r3.text();
    results.push({ step: 'Find INVOICE NUMBER sans quotes', status: r3.status, ok: r3.ok, bodyLen: t3.length, preview: t3.substring(0, 500) });

    // Test 4: Essayer avec "10425" en tant que string mais column sans espace
    const r4 = await fetch(
      `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/WORK%20ORDER/Action`,
      {
        method: 'POST',
        headers: { 'ApplicationAccessKey': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Action: 'Find', Properties: { Selector: 'FILTER("WORK ORDER", [INVOICE NUMBER]="10425")' }, Rows: [] })
      }
    );
    const t4 = await r4.text();
    results.push({ step: 'Find INVOICE NUMBER quoted (repeat)', status: r4.status, ok: r4.ok, bodyLen: t4.length, preview: t4.substring(0, 500) });

    // Test 5: Read avec Properties Selector vide
    const r5 = await fetch(
      `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/WORK%20ORDER/Action`,
      {
        method: 'POST',
        headers: { 'ApplicationAccessKey': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ Action: 'Read', Properties: { Locale: 'fr-FR' }, Rows: [] })
      }
    );
    const t5 = await r5.text();
    results.push({ step: 'Read avec Locale', status: r5.status, ok: r5.ok, bodyLen: t5.length, preview: t5.substring(0, 500) });

    return Response.json({ appId: APP_ID.substring(0, 6) + '...', results });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});