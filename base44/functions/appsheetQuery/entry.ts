import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Rate limiter simple : max 10 requêtes par IP sur 60 secondes
const rateLimitMap = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const windowStart = now - 60000;
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  const timestamps = rateLimitMap.get(ip).filter(t => t > windowStart);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  return timestamps.length <= 10;
}

function validateAccessCode(code) {
  if (!code || typeof code !== 'string') return false;
  const trimmed = code.trim();
  if (trimmed.length < 3 || trimmed.length > 50) return false;
  // Bloque les caractères dangereux pour éviter injection
  if (/[<>{}()[\];]/.test(trimmed)) return false;
  return trimmed;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Rate limiting par IP
    const ip = req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip)) {
      return Response.json({ error: 'Trop de requêtes. Veuillez réessayer dans une minute.' }, { status: 429 });
    }

    const { tableName, accessCode } = await req.json();

    if (!tableName || !accessCode) {
      return Response.json({ error: 'tableName et accessCode sont requis' }, { status: 400 });
    }

    // Validation stricte
    const allowedTables = ['Commandes', 'Inventaire', 'Clients', 'Contacts', 'Dossiers'];
    if (!allowedTables.includes(tableName)) {
      return Response.json({ error: 'Table non autorisée' }, { status: 400 });
    }

    const code = validateAccessCode(accessCode);
    if (!code) {
      return Response.json({ error: 'Code d\'accès invalide' }, { status: 400 });
    }

    const APP_ID = Deno.env.get('APPSHEET_APP_ID');
    const API_KEY = Deno.env.get('APPSHEET_API_KEY');

    if (!APP_ID || !API_KEY) {
      return Response.json({ error: 'Configuration API manquante' }, { status: 500 });
    }

    // AppSheet REST API v2
    const apiUrl = `https://api.appsheet.com/api/v2/apps/${APP_ID}/tables/${encodeURIComponent(tableName)}/Action`;

    // La colonne "CodeAcces" ou "Dossier" contient le code d'accès dans AppSheet
    // On essaie plusieurs noms de colonnes courants
    const filterExpression = `OR([CodeAcces]="${code}", [Code_Acces]="${code}", [Dossier]="${code}", [CodeDossier]="${code}", [Numero_Dossier]="${code}")`;

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'ApplicationAccessKey': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        Action: 'Find',
        Properties: {
          Selector: `FILTER("${tableName}", ${filterExpression})`
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('AppSheet API error:', response.status, errorText);
      return Response.json({ error: 'Erreur de communication avec AppSheet' }, { status: 502 });
    }

    const data = await response.json();

    if (!data || !data.length || data.length === 0) {
      return Response.json({ error: 'Aucun dossier trouvé avec ce code d\'accès' }, { status: 404 });
    }

    // Ne retourne que le premier résultat (le code d'accès doit être unique)
    return Response.json({ success: true, data: data[0], table: tableName });

  } catch (error) {
    console.error('AppSheet Query Error:', error);
    return Response.json({ error: 'Erreur interne' }, { status: 500 });
  }
});