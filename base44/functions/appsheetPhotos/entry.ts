import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const APP_ID = Deno.env.get('APPSHEET_APP_ID');
    const API_KEY = Deno.env.get('APPSHEET_API_KEY');
    const headers = { 'ApplicationAccessKey': API_KEY, 'Content-Type': 'application/json' };

    // Find sans filtre MAIS avec ImageSize FULL
    const r = await fetch(
      `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/WORK%20ORDER/Action`,
      { method: 'POST', headers, body: JSON.stringify({ Action: 'Find', Properties: { Locale: 'fr-FR', ImageSize: 'FULL' }, Rows: [] }) }
    );
    const text = await r.text();
    const all = JSON.parse(text);

    // Trouver le record avec photos
    const rec = all.find(row => row['INVOICE NUMBER'] === '111222333444555');
    
    if (!rec) return Response.json({ error: 'Not found', total: all.length }, { status: 404 });

    return Response.json({
      invoice: rec['INVOICE NUMBER'],
      rowId: rec['Row ID'],
      totalRecords: all.length,
      responseLength: text.length,
      hasPhoto: !!rec['PHOTO'],
      photoPreview: rec['PHOTO'] ? rec['PHOTO'].substring(0, 80) : null,
      // Check if image data is included in the record
      hasFilesArray: Array.isArray(rec._Files),
      filesCount: rec._Files?.length || 0,
      firstFile: rec._Files?.[0] ? { name: rec._Files[0].Name, hasData: !!rec._Files[0].Data, dataLen: rec._Files[0].Data?.length } : null,
      allKeys: Object.keys(rec).slice(0, 25)
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});