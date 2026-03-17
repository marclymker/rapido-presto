/**
 * Utilitaire pour gérer les meta tags Open Graph pour WhatsApp preview
 * Injecte dynamiquement les balises dans le DOM pour la partage social
 */

export function injectOGMetaTags(product, shop) {
  if (!product || !shop) return;

  const price = product.promo_price || product.price;
  const imageUrl = product.image_url;
  const productName = product.name;
  const description = product.description || `${productName} - ${shop.company_name}`;
  
  // Assurer que l'URL de l'image est compressée et accessoire en HTTPS
  const optimizedImageUrl = imageUrl 
    ? ensureHttpsAndCompress(imageUrl)
    : null;

  // Fonction helper pour créer/mettre à jour une meta tag
  const setMetaTag = (property, content) => {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', property);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  const setNameTag = (name, content) => {
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  // Meta tags Open Graph (CRITIQUES pour WhatsApp)
  setMetaTag('og:title', productName);
  setMetaTag('og:description', truncate(description, 160));
  setMetaTag('og:type', 'product');
  setMetaTag('og:site_name', 'Rapido Presto');
  setMetaTag('og:locale', 'fr_HT');
  
  if (optimizedImageUrl) {
    setMetaTag('og:image', optimizedImageUrl);
    setMetaTag('og:image:width', '1200');
    setMetaTag('og:image:height', '630');
    setMetaTag('og:image:alt', productName);
  }

  // Meta tags Produit (recommandés)
  setMetaTag('product:price:amount', price.toString());
  setMetaTag('product:price:currency', 'HTG');
  setMetaTag('product:brand', shop.company_name);
  setMetaTag('product:availability', product.is_available ? 'in stock' : 'out of stock');

  // Meta tags Twitter Card
  setNameTag('twitter:card', 'summary_large_image');
  setNameTag('twitter:site', '@RapidoPrestoHT');
  setNameTag('twitter:title', productName);
  setNameTag('twitter:description', truncate(description, 160));
  if (optimizedImageUrl) {
    setNameTag('twitter:image', optimizedImageUrl);
  }

  // Meta tag standard
  setNameTag('description', truncate(description, 160));
}

/**
 * Assure que l'URL de l'image est en HTTPS et compressée
 * @param {string} imageUrl - URL de l'image
 * @returns {string} - URL optimisée
 */
export function ensureHttpsAndCompress(imageUrl) {
  if (!imageUrl) return '';

  // Convertir en HTTPS si nécessaire
  let url = imageUrl.startsWith('http')
    ? imageUrl
    : `https://${imageUrl}`;

  url = url.replace(/^http:\/\//i, 'https://');

  // Ajouter les paramètres de compression si ce n'est pas fait
  const separator = url.includes('?') ? '&' : '?';
  if (!url.includes('w=') && !url.includes('compress')) {
    url = `${url}${separator}w=1200&h=630&fit=crop&q=75`;
  }

  return url;
}

/**
 * Génère un lien partageable avec cache-bust pour forcer WhatsApp à rafraîchir
 * @param {string} baseUrl - URL de base (ex: /functions/ogMetaTags?slug=...)
 * @returns {string} - URL avec cache-bust
 */
export function generateShareLinkWithCacheBust(baseUrl) {
  if (!baseUrl) return '';

  // Ajouter un paramètre de cache-bust (timestamp ou random)
  const separator = baseUrl.includes('?') ? '&' : '?';
  const cacheBust = `v=${Date.now().toString(36)}`;
  
  return `${baseUrl}${separator}${cacheBust}`;
}

/**
 * Tronque un texte à X caractères
 * @param {string} text - Texte à tronquer
 * @param {number} length - Longueur max
 * @returns {string} - Texte tronqué
 */
function truncate(text, length = 160) {
  if (!text) return '';
  return text.length > length ? text.substring(0, length - 3) + '...' : text;
}

/**
 * Valide que l'image est accessible et pas trop lourde
 * @param {string} imageUrl - URL de l'image
 * @returns {Promise<boolean>} - True si OK
 */
export async function validateOGImage(imageUrl) {
  if (!imageUrl) return false;

  try {
    const response = await fetch(imageUrl, { method: 'HEAD' });
    
    // Vérifier le Content-Length
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > 300000) {
      console.warn('⚠️ Image trop lourde (> 300KB) pour WhatsApp');
      return false;
    }

    return response.ok;
  } catch (error) {
    console.error('❌ Erreur validation image OG:', error);
    return false;
  }
}