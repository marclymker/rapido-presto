/**
 * SÉCURITÉ: Protection CSRF basique via vérification Origin/Referer
 * Pour les opérations sensibles (paiement, annulation, mise à jour profil)
 */

export function verifyCSRF(req) {
  const origin = req.headers.get('origin');
  const referer = req.headers.get('referer');
  const allowedOrigin = Deno.env.get('APP_URL') || '';

  // Vérifier que la requête provient de l'app
  if (origin && origin !== allowedOrigin && !origin.includes('base44.app')) {
    return { valid: false, error: 'Invalid origin' };
  }

  if (referer && !referer.startsWith(allowedOrigin) && !referer.includes('base44.app')) {
    return { valid: false, error: 'Invalid referer' };
  }

  // Bloquer les requêtes sans origin ni referer (sauf GET)
  if (req.method !== 'GET' && !origin && !referer) {
    return { valid: false, error: 'Missing origin/referer headers' };
  }

  return { valid: true };
}