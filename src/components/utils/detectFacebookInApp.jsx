/**
 * Détecte si l'utilisateur accède via Facebook In-App Browser
 */
export function isFacebookInAppBrowser() {
  const userAgent = navigator.userAgent.toLowerCase();
  return /fbav|fban|facebook|messenger/.test(userAgent);
}

/**
 * Détecte le type de navigateur/source d'accès
 * @returns {string} 'facebook_inapp' | 'instagram_inapp' | 'browser' | 'mobile_app'
 */
export function getAccessSource() {
  const userAgent = navigator.userAgent.toLowerCase();
  
  if (/fbav|fban|facebook/.test(userAgent)) {
    return 'facebook_inapp';
  }
  if (/instagram/.test(userAgent)) {
    return 'instagram_inapp';
  }
  if (/messenger/.test(userAgent)) {
    return 'messenger_inapp';
  }
  if (/mobile|android|iphone|ipad/.test(userAgent)) {
    return 'mobile_browser';
  }
  return 'browser';
}

/**
 * Log l'accès utilisateur (optionnel - pour tracking)
 */
export function logAccessSource(userId) {
  const source = getAccessSource();
  console.log(`User ${userId} accessed via: ${source}`);
  
  // Optionnel: envoyer à une base de données pour tracking
  if (window.fbq) {
    window.fbq('track', 'CustomEvent', {
      access_source: source
    });
  }
}