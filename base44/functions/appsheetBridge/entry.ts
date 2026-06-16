import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Rate limiter simple intégré
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }
  if (entry.count >= MAX_REQUESTS_PER_WINDOW) {
    return false;
  }
  entry.count++;
  return true;
}

// Nettoyer les entrées expirées périodiquement
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now - entry.windowStart > RATE_LIMIT_WINDOW) {
      rateLimitMap.delete(key);
    }
  }
}, 120_000);

// Construire l'URL de l'API AppSheet
function getAppSheetUrl(tableName, action) {
  const appId = Deno.env.get('APPSHEET_APP_ID');
  if (!appId) throw new Error('APPSHEET_APP_ID non configuré');
  return `https://api.appsheet.com/api/v2/apps/${appId}/tables/${encodeURIComponent(tableName)}/Action`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Sécurité : authentification obligatoire
    if (!user) {
      return Response.json({ error: 'Non autorisé' }, { status: 401 });
    }

    // Sécurité : admin uniquement
    if (user.role !== 'admin') {
      return Response.json({ error: 'Accès refusé — réservé administrateurs' }, { status: 403 });
    }

    // Rate limiting
    if (!checkRateLimit(user.id)) {
      return Response.json({ error: 'Trop de requêtes. Réessayez dans une minute.' }, { status: 429 });
    }

    const apiKey = Deno.env.get('APPSHEET_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'Clé API AppSheet non configurée' }, { status: 500 });
    }

    const { tableName, action, rows, properties } = await req.json();

    // Validation des entrées
    if (!tableName || typeof tableName !== 'string') {
      return Response.json({ error: 'Nom de table requis' }, { status: 400 });
    }

    const allowedActions = ['Find', 'Read', 'Add', 'Edit', 'Delete'];
    const requestedAction = action || 'Find';
    if (!allowedActions.includes(requestedAction)) {
      return Response.json({ error: `Action non supportée: ${requestedAction}` }, { status: 400 });
    }

    // Limiter la pagination
    const props = {
      Locale: 'fr-FR',
      ...(properties || {})
    };

    // Protection : limite maximale de lignes retournées
    if (!props.Selector) {
      props.Selector = `TOP(ROWS(), 500)`;
    }

    const body = {
      Action: requestedAction,
      Properties: props,
      Rows: rows || []
    };

    const response = await fetch(getAppSheetUrl(tableName, requestedAction), {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AppSheet API error:', response.status, errorText);
      return Response.json({
        error: `Erreur AppSheet API: ${response.status}`,
        details: errorText.substring(0, 500)
      }, { status: response.status });
    }

    const data = await response.json();
    return Response.json({ success: true, tableName, data });

  } catch (error) {
    console.error('AppSheet Bridge Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});