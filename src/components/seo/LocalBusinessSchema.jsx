import React from 'react';
import { Helmet } from 'react-helmet-async';

const schema = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Rapido Presto",
  "url": "https://rapidopresto.shop",
  "logo": "https://rapidopresto.shop/logo.png",
  "image": "https://rapidopresto.shop/logo.png",
  "description": "Plateforme e-commerce leader en Haïti pour l'achat et la vente de produits variés. Livraison rapide à Port-au-Prince, Delmas, Cap-Haïtien et partout en Haïti.",
  "priceRange": "HTG",
  "address": {
    "@type": "PostalAddress",
    "streetAddress": "Delmas 33",
    "addressLocality": "Port-au-Prince",
    "addressRegion": "Ouest",
    "postalCode": "HT6110",
    "addressCountry": "HT"
  },
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+50931604104",
    "contactType": "customer service",
    "availableLanguage": ["French", "Haitian Creole", "English"]
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": "18.5770",
    "longitude": "-72.2924"
  },
  "hasMap": "https://www.google.com/maps/place/Delmas,+Haiti",
  "openingHours": "Mo-Sa 08:00-20:00",
  "currenciesAccepted": "HTG",
  "paymentAccepted": "Cash, MonCash, NatCash",
  "areaServed": [
    { "@type": "City", "name": "Port-au-Prince" },
    { "@type": "City", "name": "Delmas" },
    { "@type": "City", "name": "Cap-Haïtien" },
    { "@type": "City", "name": "Gonaïves" },
    { "@type": "City", "name": "Pétion-Ville" }
  ],
  "sameAs": [
    "https://www.facebook.com/RapidoPresto",
    "https://www.instagram.com/RapidoPresto"
  ],
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://rapidopresto.shop/?q={search_term_string}",
    "query-input": "required name=search_term_string"
  }
};

export default function LocalBusinessSchema() {
  return (
    <Helmet>
      <script type="application/ld+json">
        {JSON.stringify(schema)}
      </script>
      {/* hreflang pour le SEO multilingue */}
      <link rel="alternate" hrefLang="fr" href="https://rapidopresto.shop/?lang=fr" />
      <link rel="alternate" hrefLang="en" href="https://rapidopresto.shop/?lang=en" />
      <link rel="alternate" hrefLang="ht" href="https://rapidopresto.shop/?lang=ht" />
      <link rel="alternate" hrefLang="x-default" href="https://rapidopresto.shop/" />
    </Helmet>
  );
}