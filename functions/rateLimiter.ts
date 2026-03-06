/**
 * SÉCURITÉ: Rate Limiting pour prévenir les attaques par force brute
 * Limite les requêtes par IP et par utilisateur
 */

const requestLog = new Map();
const WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS = 30; // 30 requêtes par minute par IP
const PAYMENT_MAX_REQUESTS = 5; // 5 tentatives de paiement par minute

function cleanOldEntries() {
  const now = Date.now();
  for (const [key, data] of requestLog.entries()) {
    if (now - data.resetTime > WINDOW_MS) {
      requestLog.delete(key);
    }
  }
}

function getRateLimitKey(req, identifier) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || 
             req.headers.get('x-real-ip') || 
             'unknown';
  return `${ip}:${identifier}`;
}

export function checkRateLimit(req, identifier, maxRequests = MAX_REQUESTS) {
  cleanOldEntries();
  
  const key = getRateLimitKey(req, identifier);
  const now = Date.now();
  
  let record = requestLog.get(key);
  
  if (!record) {
    record = {
      count: 1,
      resetTime: now
    };
    requestLog.set(key, record);
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  if (now - record.resetTime > WINDOW_MS) {
    record.count = 1;
    record.resetTime = now;
    requestLog.set(key, record);
    return { allowed: true, remaining: maxRequests - 1 };
  }
  
  record.count++;
  requestLog.set(key, record);
  
  if (record.count > maxRequests) {
    return { 
      allowed: false, 
      remaining: 0,
      retryAfter: Math.ceil((record.resetTime + WINDOW_MS - now) / 1000)
    };
  }
  
  return { allowed: true, remaining: maxRequests - record.count };
}

export function rateLimitResponse(retryAfter) {
  return Response.json(
    { 
      error: 'Trop de requêtes. Veuillez réessayer plus tard.',
      retryAfter 
    },
    { 
      status: 429,
      headers: {
        'Retry-After': retryAfter.toString(),
        'X-RateLimit-Limit': MAX_REQUESTS.toString(),
        'X-RateLimit-Remaining': '0'
      }
    }
  );
}

export { MAX_REQUESTS, PAYMENT_MAX_REQUESTS };