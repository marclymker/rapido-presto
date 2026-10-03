import { Helmet } from 'react-helmet-async';

export default function SEOArticle({ product, shop }) {
  const siteUrl = "https://rapidopresto.shop";
  const productUrl = `${siteUrl}/product?id=${product.id}`;

  // Gestion des images
  const productImages = product.additional_images && product.additional_images.length > 0
    ? [product.image_url, ...product.additional_images].filter(Boolean)
    : [product.image_url].filter(Boolean);

  // Prix client (avec marge)
  const displayPrice = product.promo_price && product.promo_price < product.price
    ? Math.round(product.promo_price * 1.1)
    : Math.round(product.price * 1.1);

  // Description optimisée pour SEO
  const seoDescription = product.description
    ? `${product.description} - ${displayPrice} HTG sur Rapido Presto. Livraison rapide ${shop?.region ? `à ${shop.region}` : 'en Haïti'}.`
    : `${product.name} disponible à ${displayPrice} HTG sur Rapido Presto. Commandez en ligne et faites-vous livrer rapidement.`;

  // Données structurées Schema.org
  const schemaData = {
    "@context": "https://schema.org/",
    "@type": "Product",
    "name": product.name,
    "image": productImages,
    "description": product.description || `${product.name} disponible sur Rapido Presto`,
    "brand": {
      "@type": "Brand",
      "name": shop?.company_name || product.shop_name || "Rapido Presto"
    },
    "category": product.category,
    "offers": {
      "@type": "Offer",
      "url": productUrl,
      "priceCurrency": "HTG",
      "price": displayPrice,
      "availability": product.is_available !== false && product.stock_quantity > 0
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      "seller": {
        "@type": "Organization",
        "name": shop?.company_name || product.shop_name || "Rapido Presto"
      }
    }
  };

  // Ajouter les avis si disponibles
  if (shop?.rating) {
    schemaData.aggregateRating = {
      "@type": "AggregateRating",
      "ratingValue": shop.rating,
      "reviewCount": 1,
      "bestRating": 5
    };
  }

  return (
    <Helmet>
      {/* Titre optimisé pour SEO */}
      <title>{`${product.name} - ${displayPrice} HTG | Rapido Presto`}</title>
      <meta name="description" content={seoDescription} />
      <link rel="canonical" href={productUrl} />

      {/* Keywords SEO */}
      {product.seo_tags && product.seo_tags.length > 0 && (
        <meta name="keywords" content={product.seo_tags.join(', ')} />
      )}

      {/* Open Graph pour partage social (WhatsApp, Facebook) */}
      <meta property="og:type" content="product" />
      <meta property="og:title" content={product.name} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={product.image_url} />
      <meta property="og:url" content={productUrl} />
      <meta property="og:site_name" content="Rapido Presto" />

      {/* Open Graph Product Meta */}
      <meta property="product:price:amount" content={displayPrice} />
      <meta property="product:price:currency" content="HTG" />
      <meta property="product:availability" content={product.is_available !== false ? "in stock" : "out of stock"} />
      {product.category && <meta property="product:category" content={product.category} />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={product.name} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={product.image_url} />

      {/* Données Structurées JSON-LD pour Google Rich Snippets */}
      <script type="application/ld+json">
        {JSON.stringify(schemaData)}
      </script>
    </Helmet>
  );
}