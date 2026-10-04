import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { ChevronRight, MapPin, Phone, Mail } from 'lucide-react';
import ProductCard from '@/components/ui/ProductCard';

/**
 * PAGE PILIER SEO - ROBE DE MARIAGE HAÏTI
 * URL: /robe-de-mariage-haiti
 *
 * Objectif: Dominer "robe de mariage haiti", "location robe mariée haiti"
 */
export default function RobeDeMariageHaiti() {
  const { data: products = [] } = useQuery({
    queryKey: ['wedding-dresses-haiti'],
    queryFn: () => base44.entities.Product.filter({
      category: 'Mariage',
      is_available: true
    }),
    select: (data) => data.slice(0, 12)
  });

  const { data: shops = [] } = useQuery({
    queryKey: ['wedding-shops'],
    queryFn: () => base44.entities.Shop.filter({
      company_category: 'Mariage',
      is_active: true
    })
  });

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "BridalShop",
    "name": "Kairos - Robes de Mariage Haïti",
    "description": "Trouvez la robe de mariage parfaite en Haïti. Location et vente de robes de mariée à Port-au-Prince, Pétion-Ville, Cap-Haïtien et Gonaïves.",
    "image": "https://makariosbridal.shop/icons/rapido-presto.svg",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Port-au-Prince",
      "addressRegion": "Ouest",
      "addressCountry": "HT"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "18.5944",
      "longitude": "-72.3074"
    },
    "priceRange": "$$-$$$",
    "areaServed": ["Port-au-Prince", "Pétion-Ville", "Cap-Haïtien", "Gonaïves"],
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Robes de Mariage",
      "itemListElement": [
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "Robe de Mariée Sirène"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "Robe de Mariée Princesse"
          }
        },
        {
          "@type": "Offer",
          "itemOffered": {
            "@type": "Product",
            "name": "Robe de Mariée Bustier"
          }
        }
      ]
    }
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "Où trouver une robe de mariage en Haïti ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Les meilleures boutiques de robes de mariage en Haïti se trouvent à Port-au-Prince et Pétion-Ville. Kairos connecte les futures mariées aux boutiques spécialisées comme Makarios Bridal Dream qui proposent robes sirène, princesse, bustier et sur mesure."
        }
      },
      {
        "@type": "Question",
        "name": "Quel est le prix d'une robe de mariée en Haïti ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Le prix d'une robe de mariée en Haïti varie de 15,000 à 150,000 HTG selon le modèle, les tissus et les finitions. La location est possible entre 5,000 et 30,000 HTG pour réduire les coûts."
        }
      },
      {
        "@type": "Question",
        "name": "Peut-on louer une robe de mariée en Haïti ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Oui, plusieurs boutiques à Port-au-Prince et Pétion-Ville proposent la location de robes de mariée. C'est une excellente option économique qui permet d'avoir une robe de luxe à moindre coût."
        }
      },
      {
        "@type": "Question",
        "name": "Combien de temps avant le mariage commander sa robe ?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "Il est recommandé de commander ou réserver votre robe de mariée 3 à 6 mois avant la date du mariage en Haïti. Cela permet les essayages, ajustements et retouches nécessaires."
        }
      }
    ]
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Accueil",
        "item": "https://makariosbridal.shop"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Robe de Mariage Haïti"
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Robe de Mariage en Haïti - Location et Vente | Port-au-Prince, Pétion-Ville</title>
        <meta
          name="description"
          content="Trouvez la robe de mariage parfaite en Haïti. Location et vente de robes de mariée sirène, princesse, bustier à Port-au-Prince, Pétion-Ville, Cap-Haïtien. Livraison rapide."
        />
        <meta
          name="keywords"
          content="robe de mariage haiti, robe de mariée port-au-prince, location robe mariée haiti, robe sirène haiti, robe princesse haiti, wedding dress haiti, pétion-ville, cap-haitien, gonaïves"
        />
        <link rel="canonical" href="https://makariosbridal.shop/robe-de-mariage-haiti" />

        <script type="application/ld+json">
          {JSON.stringify(localBusinessSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <article className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
        {/* Hero Section */}
        <header className="relative bg-gradient-to-r from-pink-100 to-purple-100 py-16 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6">
              Robe de Mariage en Haïti 👰
            </h1>
            <p className="text-xl text-gray-700 mb-8 max-w-3xl mx-auto">
              Découvrez les plus belles robes de mariée en Haïti. Location et vente à Port-au-Prince, Pétion-Ville, Cap-Haïtien et Gonaïves.
              Livraison rapide partout en Haïti.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-pink-600 hover:bg-pink-700">
                Voir les Robes Disponibles
              </Button>
              <Button size="lg" variant="outline">
                <Phone className="w-4 h-4 mr-2" />
                Contactez-nous
              </Button>
            </div>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-12">
          {/* Navigation interne */}
          <nav className="bg-white rounded-lg shadow-sm p-4 mb-8">
            <h2 className="font-bold mb-4">Navigation rapide :</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <a href="#types" className="text-pink-600 hover:underline flex items-center gap-1">
                <ChevronRight className="w-4 h-4" /> Types de robes
              </a>
              <a href="#prix" className="text-pink-600 hover:underline flex items-center gap-1">
                <ChevronRight className="w-4 h-4" /> Prix & Budget
              </a>
              <a href="#location" className="text-pink-600 hover:underline flex items-center gap-1">
                <ChevronRight className="w-4 h-4" /> Location
              </a>
              <a href="#faq" className="text-pink-600 hover:underline flex items-center gap-1">
                <ChevronRight className="w-4 h-4" /> FAQ
              </a>
            </div>
          </nav>

          {/* Section Introduction */}
          <section className="prose prose-lg max-w-none mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Trouver la Robe de Mariage Parfaite en Haïti
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Votre <strong>robe de mariage en Haïti</strong> est bien plus qu'un simple vêtement : c'est le symbole de votre grand jour,
              le reflet de votre personnalité et de vos rêves. À <strong>Port-au-Prince</strong>, <strong>Pétion-Ville</strong>,
              <strong>Cap-Haïtien</strong> et <strong>Gonaïves</strong>, de nombreuses boutiques spécialisées proposent des collections
              variées pour tous les styles et tous les budgets.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Que vous rêviez d'une <strong>robe sirène</strong> qui sublime vos courbes, d'une <strong>robe princesse</strong> digne
              des contes de fées, ou d'une <strong>robe bustier</strong> élégante et romantique, le marché haïtien du mariage s'est
              considérablement développé ces dernières années.
            </p>
            <p className="text-gray-700 leading-relaxed">
              <strong>Kairos</strong> facilite votre recherche en vous connectant aux meilleures boutiques de robes de mariée
              en Haïti, avec possibilité de <strong>location</strong> ou d'<strong>achat</strong>, et une <strong>livraison rapide</strong>
              dans toute l'île.
            </p>
          </section>

          {/* Section Types de Robes */}
          <section id="types" className="mb-12 bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Les Types de Robes de Mariée les Plus Populaires en Haïti
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-2xl font-bold text-pink-600 mb-3">1. Robe Sirène (Mermaid)</h3>
                <p className="text-gray-700 mb-3">
                  La <strong>robe sirène</strong> est le choix préféré des mariées haïtiennes qui souhaitent mettre en valeur leurs courbes.
                  Ajustée jusqu'aux genoux puis évasée, elle crée une silhouette spectaculaire et glamour. Particulièrement populaire à
                  <strong> Pétion-Ville</strong> pour les mariages chics, ce modèle sublime la féminité.
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Prix moyen :</strong> 35,000 - 120,000 HTG | <strong>Location :</strong> 12,000 - 35,000 HTG
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-pink-600 mb-3">2. Robe Princesse (Ball Gown)</h3>
                <p className="text-gray-700 mb-3">
                  La <strong>robe princesse</strong> incarne le rêve romantique absolu. Avec son bustier ajusté et sa jupe volumineuse,
                  elle transforme chaque mariée en véritable princesse. Idéale pour les cérémonies à <strong>Port-au-Prince</strong>,
                  elle convient à tous les types de morphologies.
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Prix moyen :</strong> 30,000 - 100,000 HTG | <strong>Location :</strong> 10,000 - 30,000 HTG
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-pink-600 mb-3">3. Robe Bustier</h3>
                <p className="text-gray-700 mb-3">
                  Élégante et intemporelle, la <strong>robe bustier</strong> met l'accent sur les épaules et la poitrine. Parfaite pour
                  les mariages en extérieur à <strong>Cap-Haïtien</strong> ou les cérémonies en soirée à <strong>Pétion-Ville</strong>,
                  elle offre une sophistication incomparable.
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Prix moyen :</strong> 25,000 - 90,000 HTG | <strong>Location :</strong> 8,000 - 25,000 HTG
                </p>
              </div>

              <div>
                <h3 className="text-2xl font-bold text-pink-600 mb-3">4. Robe Ponpon (Tulle)</h3>
                <p className="text-gray-700 mb-3">
                  La <strong>robe ponpon</strong> avec ses multiples couches de tulle crée un effet féerique et aérien. Très appréciée
                  pour les mariages traditionnels haïtiens, elle apporte volume et légèreté.
                </p>
                <p className="text-gray-600 text-sm">
                  <strong>Prix moyen :</strong> 28,000 - 85,000 HTG | <strong>Location :</strong> 9,000 - 28,000 HTG
                </p>
              </div>
            </div>
          </section>

          {/* Section Prix & Budget */}
          <section id="prix" className="mb-12 bg-pink-50 rounded-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Prix et Budget pour une Robe de Mariage en Haïti
            </h2>
            <p className="text-gray-700 mb-6">
              Le budget d'une <strong>robe de mariée en Haïti</strong> varie considérablement selon plusieurs facteurs : le type de robe,
              les matériaux utilisés, le prestige de la boutique, et si vous optez pour l'achat ou la location.
            </p>

            <div className="grid md:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold text-pink-600 mb-4">💰 Achat de Robe</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Entrée de gamme :</strong> 15,000 - 35,000 HTG</li>
                  <li><strong>Gamme moyenne :</strong> 35,000 - 80,000 HTG</li>
                  <li><strong>Haut de gamme :</strong> 80,000 - 150,000+ HTG</li>
                  <li><strong>Sur mesure :</strong> 50,000 - 200,000+ HTG</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold text-pink-600 mb-4">📦 Location de Robe</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Standard :</strong> 5,000 - 15,000 HTG</li>
                  <li><strong>Premium :</strong> 15,000 - 25,000 HTG</li>
                  <li><strong>Luxe :</strong> 25,000 - 40,000 HTG</li>
                  <li><strong>Durée :</strong> 3 à 7 jours inclus</li>
                </ul>
              </div>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-gray-800">
                <strong>💡 Conseil Budget :</strong> La location permet d'économiser 60-70% par rapport à l'achat, idéal pour les mariées
                avec budget limité ou qui ne souhaitent pas conserver la robe.
              </p>
            </div>
          </section>

          {/* Section Location */}
          <section id="location" className="mb-12 bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Location de Robe de Mariée en Haïti : Le Guide Complet
            </h2>
            <p className="text-gray-700 mb-6">
              La <strong>location de robe de mariée</strong> est devenue très populaire en Haïti, notamment à <strong>Port-au-Prince</strong>
              et <strong>Pétion-Ville</strong>. Cette option économique permet d'avoir une robe de luxe sans se ruiner.
            </p>

            <h3 className="text-2xl font-bold text-gray-900 mb-4">Avantages de la Location</h3>
            <ul className="space-y-3 mb-6 text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-pink-600 font-bold">✓</span>
                <span><strong>Économie substantielle :</strong> 60-70% moins cher qu'un achat</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-600 font-bold">✓</span>
                <span><strong>Accès au luxe :</strong> Portez une robe haut de gamme à prix abordable</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-600 font-bold">✓</span>
                <span><strong>Pas de stockage :</strong> Pas besoin de conserver la robe après le mariage</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-pink-600 font-bold">✓</span>
                <span><strong>Service inclus :</strong> Nettoyage et entretien pris en charge</span>
              </li>
            </ul>

            <h3 className="text-2xl font-bold text-gray-900 mb-4">Comment Louer une Robe en Haïti</h3>
            <ol className="space-y-3 text-gray-700 list-decimal list-inside">
              <li><strong>Réservez 2-3 mois à l'avance</strong> pour avoir le meilleur choix</li>
              <li><strong>Prenez rendez-vous</strong> pour essayage dans les boutiques à Port-au-Prince ou Pétion-Ville</li>
              <li><strong>Vérifiez les conditions :</strong> durée, caution, retouches incluses</li>
              <li><strong>Essayez plusieurs modèles</strong> pour trouver la coupe parfaite</li>
              <li><strong>Confirmez la date</strong> de récupération (généralement 1-2 jours avant le mariage)</li>
              <li><strong>Retournez la robe</strong> dans les 24-48h après l'événement</li>
            </ol>
          </section>

          {/* Galerie Produits */}
          {products.length > 0 && (
            <section className="mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-6">
                Robes de Mariage Disponibles en Haïti
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {products.map(product => {
                  const shop = shops.find(s => s.id === product.shop_id);
                  return (
                    <a key={product.id} href={`/product/${product.id}`}>
                      <ProductCard product={product} shop={shop} />
                    </a>
                  );
                })}
              </div>
              <div className="text-center mt-6">
                <Button size="lg" className="bg-pink-600 hover:bg-pink-700">
                  Voir Toutes les Robes →
                </Button>
              </div>
            </section>
          )}

          {/* Section Zones Géographiques */}
          <section className="mb-12 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Robes de Mariage par Région en Haïti
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-pink-600" />
                  Port-au-Prince
                </h3>
                <p className="text-gray-700">
                  La capitale concentre la majorité des boutiques de robes de mariage. Quartiers principaux : Delmas, Pétion-Ville,
                  Turgeau. Large choix de styles et prix. Livraison disponible partout en Haïti.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-pink-600" />
                  Pétion-Ville
                </h3>
                <p className="text-gray-700">
                  Zone haut de gamme avec boutiques spécialisées comme Makarios Bridal Dream. Collections exclusives, service
                  personnalisé, robes sur mesure. Rendez-vous conseillé.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-pink-600" />
                  Cap-Haïtien
                </h3>
                <p className="text-gray-700">
                  Deuxième ville d'Haïti avec options croissantes. Livraison depuis Port-au-Prince en 24-48h via Kairos.
                  Idéal pour mariages en province.
                </p>
              </div>

              <div className="bg-white rounded-lg p-6">
                <h3 className="text-xl font-bold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-pink-600" />
                  Gonaïves
                </h3>
                <p className="text-gray-700">
                  Accès aux collections via livraison rapide. Commandez en ligne et recevez votre robe en 2-3 jours ouvrables.
                  Service de retouches local disponible.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section id="faq" className="mb-12 bg-white rounded-lg shadow-sm p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Questions Fréquentes sur les Robes de Mariage en Haïti
            </h2>

            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Où trouver une robe de mariage en Haïti ?
                </h3>
                <p className="text-gray-700">
                  Les meilleures boutiques se trouvent à Port-au-Prince (Delmas, Turgeau) et Pétion-Ville. Kairos vous connecte
                  à des boutiques vérifiées comme Makarios Bridal Dream avec livraison dans toute l'île.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Quel est le prix moyen d'une robe de mariée en Haïti ?
                </h3>
                <p className="text-gray-700">
                  Entre 15,000 et 150,000 HTG selon le modèle et la boutique. La location coûte 5,000 à 40,000 HTG. Les robes sur mesure
                  démarrent à 50,000 HTG.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Peut-on louer une robe de mariée en Haïti ?
                </h3>
                <p className="text-gray-700">
                  Oui ! La location est très populaire et économique (60-70% moins cher). Durée standard : 3-7 jours. Réservez 2-3 mois
                  à l'avance pour avoir le meilleur choix.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Combien de temps avant le mariage dois-je commander ma robe ?
                </h3>
                <p className="text-gray-700">
                  <strong>Location :</strong> 2-3 mois minimum. <strong>Achat prêt-à-porter :</strong> 3-4 mois.
                  <strong>Sur mesure :</strong> 6-8 mois pour permettre essayages et ajustements.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Les retouches sont-elles incluses ?
                </h3>
                <p className="text-gray-700">
                  Cela dépend des boutiques. Certaines incluent les retouches mineures, d'autres facturent séparément (2,000-10,000 HTG).
                  Clarifiez ce point lors de votre achat ou location.
                </p>
              </div>

              <div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  Quels styles de robes sont tendance en Haïti en 2026 ?
                </h3>
                <p className="text-gray-700">
                  Les robes sirène dominent pour leur glamour, suivies des robes princesse pour l'aspect féerique. Les détails populaires :
                  dentelle, broderies perlées, bustiers scintillants, dos nus.
                </p>
              </div>
            </div>
          </section>

          {/* CTA Final */}
          <section className="bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Prête à Trouver Votre Robe de Rêve ?
            </h2>
            <p className="text-lg mb-6 max-w-2xl mx-auto">
              Explorez notre sélection de robes de mariage en Haïti. Location et achat avec livraison rapide à Port-au-Prince,
              Pétion-Ville, Cap-Haïtien et partout en Haïti.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-white text-pink-600 hover:bg-gray-100">
                Voir les Collections →
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                <Mail className="w-4 h-4 mr-2" />
                Demander un Devis
              </Button>
            </div>
          </section>

          {/* Liens internes */}
          <section className="mt-12 bg-gray-50 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-4">Liens Utiles :</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <a href="/wedding-planner-haiti" className="text-pink-600 hover:underline">→ Wedding Planner en Haïti</a>
              <a href="/robes-de-mariee-sirene" className="text-pink-600 hover:underline">→ Robes Sirène</a>
              <a href="/robes-de-mariee-princesse" className="text-pink-600 hover:underline">→ Robes Princesse</a>
              <a href="/decoration-mariage-haiti" className="text-pink-600 hover:underline">→ Décoration Mariage</a>
              <a href="/blog" className="text-pink-600 hover:underline">→ Blog Mariage Haïti</a>
              <a href="/event-planner-haiti" className="text-pink-600 hover:underline">→ Event Planner</a>
            </div>
          </section>
        </div>
      </article>
    </>
  );
}
