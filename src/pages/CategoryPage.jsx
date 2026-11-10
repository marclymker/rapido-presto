import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firebaseApi } from '@/api/firebaseClient';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ui/ProductCard';
import { getMarketplaceSpace } from '@/lib/marketplaceSpaces';

/**
 * PAGE CATÉGORIE - SEO OPTIMISÉE
 * URL: /categories/{slug-categorie}
 *
 * Exemples:
 * - /categories/mariage
 * - /categories/robes-de-mariee
 * - /categories/sirene
 */
export default function CategoryPage() {
  const { slug: routeSlug } = useParams();
  const navigate = useNavigate();
  const slug = routeSlug || window.location.pathname.replace(/^\//, '');

  // Mapping slug → catégorie
  const categoryMap = {
    'marketplace': 'Marketplace',
    'nourriture': 'Nourriture',
    'hotel-piscine': 'Hotels/Piscine',
    'hotels-piscine': 'Hotels/Piscine',
    'tickets': 'Tickets',
    'pharmacie': 'Pharmacie',
    'mariage': 'Mariage',
    'robes-de-mariee': 'Mariage',
    'sirene': 'Mariage',
    'princesse': 'Mariage',
    'mode-femme': 'Pour Femme',
    'homme': 'Pour homme',
    'fleurs': 'Boutique Fleurs',
    'electronique': 'Electronics',
    'bijoux': 'Bijoux',
    'maison': 'Maison',
    'bebe': 'Bébé',
    'outils': 'Outils'
  };

  const category = categoryMap[slug] || 'Tout';
  const isMainSpace = ['Marketplace', 'Nourriture', 'Hotels/Piscine', 'Tickets', 'Pharmacie'].includes(category);

  // Produits de la catégorie
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['category-products', category],
    queryFn: async () => {
      const [products, shops] = await Promise.all([
        firebaseApi.entities.Product.filter({ is_available: true }, '-created_date', 200),
        isMainSpace ? firebaseApi.entities.Shop.filter({ is_active: true }, '-created_date', 200) : Promise.resolve([]),
      ]);
      const shopsMap = Object.fromEntries(shops.map((shop) => [shop.id, shop]));
      return isMainSpace
        ? products.filter((product) => getMarketplaceSpace(product, shopsMap[product.shop_id]) === category)
        : products.filter((product) => product.category === category);
    },
    enabled: category !== 'Tout'
  });

  // Boutiques actives
  const { data: shops = [] } = useQuery({
    queryKey: ['shops'],
    queryFn: () => firebaseApi.entities.Shop.filter({ is_active: true })
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Accueil",
        "item": typeof window !== 'undefined' ? window.location.origin : ''
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": category
      }
    ]
  };

  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${category} - Kairos`,
    "description": `Découvrez notre sélection ${category.toLowerCase()} en Haïti. Marketplace, réservations et billetterie.`,
    "url": typeof window !== 'undefined' ? window.location.href : '',
    "numberOfItems": products.length
  };

  return (
    <>
      <Helmet>
        <title>{category} en Haïti | Kairos Marketplace</title>
        <meta
          name="description"
            content={`Découvrez ${products.length} offres ${category.toLowerCase()} en Haïti sur Kairos : marketplace, réservations, billetterie et contact direct.`}
        />
        <meta name="keywords" content={`${category}, ${category} Haïti, Kairos, marketplace Haïti, makariosbridal.shop`} />

        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />

        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(collectionSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b px-4 py-2">
          <ol className="flex items-center gap-2 text-sm text-gray-600">
            <li><a href="/" className="hover:text-orange-600">Accueil</a></li>
            <li>/</li>
            <li className="text-gray-900 font-medium">{category}</li>
          </ol>
        </nav>

        <main className="max-w-7xl mx-auto p-4 lg:p-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <header className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">{category}</h1>
            <p className="text-gray-600">{products.length} produits disponibles</p>
          </header>

          <section className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {products.map(product => {
              const shop = shops.find(s => s.id === product.shop_id);
              return (
                <a key={product.id} href={`/product/${product.id}`}>
                  <ProductCard
                    product={product}
                    shop={shop}
                    onClick={() => window.location.href = `/product/${product.id}`}
                  />
                </a>
              );
            })}
          </section>
        </main>
      </div>
    </>
  );
}
