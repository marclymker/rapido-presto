import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, MapPin, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/ui/ProductCard';

/**
 * PAGE BOUTIQUE - SEO OPTIMISÉE
 * URL: /shops/{slug-boutique}
 */
export default function ShopPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data: shops = [], isLoading: loadingShop } = useQuery({
    queryKey: ['shop-by-slug', slug],
    queryFn: () => base44.entities.Shop.filter({ slug }),
    enabled: !!slug
  });

  const shop = shops[0];

  const { data: products = [] } = useQuery({
    queryKey: ['shop-products', shop?.id],
    queryFn: () => base44.entities.Product.filter({
      shop_id: shop.id,
      is_available: true
    }),
    enabled: !!shop?.id
  });

  if (loadingShop) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!shop) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Boutique introuvable</h1>
        <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
      </div>
    );
  }

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    "name": shop.company_name,
    "image": shop.company_logo_url,
    "address": {
      "@type": "PostalAddress",
      "addressLocality": shop.region,
      "addressCountry": "HT"
    },
    "telephone": shop.phone,
    "email": shop.email,
    "priceRange": "$$",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": shop.rating || 4.5,
      "ratingCount": products.length
    }
  };

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
        "name": "Boutiques",
        "item": typeof window !== 'undefined' ? `${window.location.origin}/shops` : ''
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": shop.company_name
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>{shop.company_name} - {shop.region} | Kairos</title>
        <meta
          name="description"
          content={`${shop.company_name} - ${shop.company_category} à ${shop.region}. ${products.length} produits disponibles. Livraison rapide en Haïti.`}
        />
        <meta name="keywords" content={`${shop.company_name}, ${shop.company_category}, ${shop.region}, Haïti`} />

        <meta property="og:title" content={shop.company_name} />
        <meta property="og:description" content={`${shop.company_category} à ${shop.region}`} />
        <meta property="og:image" content={shop.company_logo_url} />

        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />

        <script type="application/ld+json">
          {JSON.stringify(organizationSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <nav className="bg-white border-b px-4 py-2">
          <ol className="flex items-center gap-2 text-sm text-gray-600">
            <li><a href="/" className="hover:text-orange-600">Accueil</a></li>
            <li>/</li>
            <li><a href="/shops" className="hover:text-orange-600">Boutiques</a></li>
            <li>/</li>
            <li className="text-gray-900 font-medium">{shop.company_name}</li>
          </ol>
        </nav>

        <main className="max-w-7xl mx-auto p-4 lg:p-8">
          <Button variant="ghost" onClick={() => navigate('/')} className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <header className="bg-white rounded-lg shadow-sm p-6 mb-8">
            <div className="flex items-center gap-6">
              {shop.company_logo_url && (
                <img
                  src={shop.company_logo_url}
                  alt={shop.company_name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-orange-100"
                />
              )}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{shop.company_name}</h1>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    {shop.region}
                  </span>
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    {shop.rating || 4.5}
                  </span>
                  <span>{shop.company_category}</span>
                </div>
              </div>
            </div>
          </header>

          <section>
            <h2 className="text-2xl font-bold mb-6">Nos produits ({products.length})</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {products.map(product => (
                <a key={product.id} href={`/product/${product.id}`}>
                  <ProductCard
                    product={product}
                    shop={shop}
                    onClick={() => window.location.href = `/product/${product.id}`}
                  />
                </a>
              ))}
            </div>
          </section>
        </main>
      </div>
    </>
  );
}
