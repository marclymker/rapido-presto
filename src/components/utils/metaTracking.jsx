/**
 * Génère un event_id unique pour le dédoublonnage Meta Pixel + CAPI
 */
export function generateEventId() {
  return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Récupère les cookies Facebook pour le tracking
 */
export function getMetaCookies() {
  const cookies = document.cookie.split(';').reduce((acc, cookie) => {
    const [key, value] = cookie.trim().split('=');
    acc[key] = value;
    return acc;
  }, {});

  return {
    fbp: cookies._fbp || null,
    fbc: cookies._fbc || null,
  };
}

/**
 * Récupère l'IP du client (approximative via header)
 */
export function getClientInfo() {
  return {
    client_user_agent: navigator.userAgent,
    event_source_url: window.location.href,
  };
}

/**
 * Envoie un événement via Meta Pixel (frontend)
 */
export function trackMetaPixelEvent(eventName, data = {}, eventId) {
  if (window.fbq) {
    window.fbq('track', eventName, data, { eventID: eventId });
  }
}

/**
 * Envoie un événement via Meta Conversions API (backend)
 */
export async function trackMetaConversionEvent(eventName, customData = {}, userData = {}, eventId) {
  try {
    const { firebase } = await import('@/api/firebaseClient');

    const metaCookies = getMetaCookies();
    const clientInfo = getClientInfo();

    const response = await firebase.functions.invoke('metaConversionsAPI', {
      event_name: eventName,
      event_id: eventId,
      custom_data: {
        ...customData,
        ...clientInfo,
      },
      user_data: {
        ...userData,
        ...metaCookies,
        ...clientInfo,
      },
    });

    return response.data;
  } catch (error) {
    console.error('Meta CAPI Error:', error);
  }
}

/**
 * Track combiné : Pixel + CAPI
 */
export async function trackMetaEvent(eventName, data = {}, userData = {}) {
  const eventId = generateEventId();

  // 1. Pixel (synchrone, frontend)
  trackMetaPixelEvent(eventName, data, eventId);

  // 2. CAPI (asynchrone, backend)
  await trackMetaConversionEvent(eventName, data, userData, eventId);
}