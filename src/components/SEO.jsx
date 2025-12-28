import React from 'react';
import { Helmet } from 'react-helmet-async';

const SEO = ({ title, description, image, url, keywords, type = "website" }) => {
  const siteName = "Rapido Presto";
  const fullTitle = title ? `${title} | ${siteName}` : siteName;
  const defaultDescription = "Livraison rapide en Haïti - Commandez vos produits préférés et recevez-les en 30 minutes";
  const finalDescription = description || defaultDescription;

  return (
    <Helmet>
      {/* Vérification Google Search Console */}
      <meta name="google-site-verification" content="mte9s9KgpFxd96KZsGD9Amos2lp-2dmG9k7OIIBWY3Y" />
      
      {/* Balises standard */}
      <title>{fullTitle}</title>
      <meta name="description" content={finalDescription} />
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={url || window.location.href} />

      {/* Balises pour Facebook / WhatsApp (Open Graph) */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={finalDescription} />
      <meta property="og:site_name" content={siteName} />
      {image && <meta property="og:image" content={image} />}
      {image && <meta property="og:image:alt" content={title} />}
      {url && <meta property="og:url" content={url} />}

      {/* Balises pour Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={finalDescription} />
      {image && <meta name="twitter:image" content={image} />}
      {image && <meta name="twitter:image:alt" content={title} />}
      
      {/* Rich Snippets */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": type === "product" ? "Product" : "WebSite",
          "name": fullTitle,
          "description": finalDescription,
          ...(image && { "image": image }),
          ...(url && { "url": url })
        })}
      </script>
    </Helmet>
  );
};

export default SEO;