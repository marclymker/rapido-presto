import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, image, url, keywords, type = "website" }) => {
  const siteName = "Kairos — powered by makariosbridal.shop";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription = "Achetez. Réservez. Participez. Marketplace · Hôtels & Piscines · Billetterie · Chat en Haïti — powered by makariosbridal.shop";
  const finalDescription = description || defaultDescription;

  return (
    <Helmet>
      {/* Vérification Google Search Console */}
      <meta name="google-site-verification" content="mte9s9KgpFxd96KZsGD9Amos2lp-2dmG9k7OIIBWY3Y" />

      {/* Balises standard */}
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      <meta name="publisher" content="Kairos — powered by makariosbridal.shop" />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url || (typeof window !== 'undefined' ? window.location.href : '')} />

      {/* Open Graph - Facebook / WhatsApp */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content="fr_HT" />
      {url && <meta property="og:url" content={url} />}
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:secure_url" content={image} />}
      {image && <meta property="og:image:width" content="1200" />}
      {image && <meta property="og:image:height" content="630" />}
      {image && <meta property="og:image:alt" content={fullTitle} />}
      {image && <meta property="og:image:type" content="image/jpeg" />}

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
      {image && <meta name="twitter:image" content={image} />}
      {image && <meta name="twitter:image:alt" content={fullTitle} />}

      {/* Rich Snippets JSON-LD */}
      <script type="application/ld+json">
        {JSON.stringify(
          type === "product"
            ? {
                "@context": "https://schema.org",
                "@type": "Product",
                "name": fullTitle,
                "description": finalDescription,
                ...(image && { "image": [image] }),
                ...(url && { "url": url }),
                "brand": { "@type": "Brand", "name": siteName },
                "offers": {
                  "@type": "Offer",
                  "availability": "https://schema.org/InStock",
                  "priceCurrency": "HTG",
                  "url": url || ""
                }
              }
            : {
                "@context": "https://schema.org",
                "@type": "WebSite",
                "name": siteName,
                "url": "https://makariosbridal.shop",
                "description": finalDescription,
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": "https://makariosbridal.shop/?q={search_term_string}",
                  "query-input": "required name=search_term_string"
                }
              }
        )}
      </script>
    </Helmet>
  );
};

export default SEO;
