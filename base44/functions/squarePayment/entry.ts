import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { Client, Environment } from 'npm:square@34.0.0';

// --- Rate Limiting simplifié (in-memory) ---
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 60_000; // 1 minute
const PAYMENT_MAX_REQUESTS = 5;

function checkRateLimit(ip, key, maxRequests) {
  const now = Date.now();
  const entry = rateLimitMap.get(key) || { count: 0, resetAt: now + RATE_LIMIT_WINDOW };
  if (now > entry.resetAt) { entry.count = 0; entry.resetAt = now + RATE_LIMIT_WINDOW; }
  entry.count++;
  rateLimitMap.set(key, entry);
  return entry.count <= maxRequests;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}, 60_000);

// --- Validation simplifiée ---
function validatePaymentInput(body) {
  if (!body.sourceId) return { valid: false, error: 'sourceId requis' };
  if (!body.amount || isNaN(body.amount) || parseFloat(body.amount) <= 0) return { valid: false, error: 'Montant invalide' };
  if (!body.orderId) return { valid: false, error: 'orderId requis' };
  return { valid: true, data: body };
}

Deno.serve(async (req) => {
  const allowedOrigin = Deno.env.get('APP_URL') || 'https://rapido-presto.base44.app';
  const headers = {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Credentials': 'true'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers });
  }

  try {
    // Rate limiting
    const ip = req.headers.get('x-forwarded-for') || 'unknown';
    if (!checkRateLimit(ip, `square-${ip}`, PAYMENT_MAX_REQUESTS)) {
      return Response.json({ error: 'Trop de requêtes, veuillez patienter' }, { status: 429, headers });
    }

    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401, headers });
    }

    const body = await req.json();
    const validation = validatePaymentInput(body);
    if (!validation.valid) {
      return Response.json({ error: validation.error }, { status: 400, headers });
    }

    const { sourceId, amount, orderId } = validation.data;
    const cleanAmount = Math.round(parseFloat(String(amount)) * 100);

    // Initialiser Square dans le handler
    const client = new Client({
      accessToken: Deno.env.get('SQUARE_ACCESS_TOKEN'),
      environment: Environment.Production
    });

    const { result } = await client.paymentsApi.createPayment({
      sourceId: sourceId,
      idempotencyKey: `${orderId}-${Date.now()}`,
      amountMoney: {
        amount: BigInt(cleanAmount),
        currency: 'HTG'
      },
      orderId: orderId
    });

    return Response.json({
      success: true,
      payment: result.payment
    }, { headers });

  } catch (error) {
    console.error('Square payment error:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500, headers });
  }
});