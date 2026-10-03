import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { firebase } from '@/api/firebaseClient';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, MapPin, Star, Store, LayoutGrid } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * PAGE BOUTIQUE - SEO OPTIMISÉE
 * URL: /shops/{slug-boutique}
 */
export default function ShopPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const { data: shops = [], isLoading: loadingShop } = useQuery({
    queryKey: ['shop-by-slug', slug],
    queryFn: () => firebase.entities.Shop.filter({ slug }),
    enabled: !!slug
  });

  const shop = shops[0];

  const { data: products = [] } = useQuery({
    queryKey: ['shop-products', shop?.id],
    queryFn: () => firebase.entities.Product.filter({
      shop_id: shop.id,
      is_available: true
    }),
    enabled: !!shop?.id
  });

  const shareShop = () => {
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: shop?.company_name, url }).catch(() => {});
    else navigator.clipboard?.writeText(url);
  };

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
        <title>{shop.company_name} - {shop.region} | Rapido Presto</title>
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

      <div className="min-h-screen bg-white">
        <div className="sticky top-0 z-40 bg-white border-b border-neutral-200 flex items-center gap-3 px-3 py-2.5" style={{ paddingTop: 'max(env(safe-area-inset-top), 10px)' }}>
          <button onClick={() => navigate(-1)} aria-label="Retour"><ArrowLeft className="w-6 h-6 text-neutral-900" /></button>
          <h1 className="text-base font-bold text-neutral-900 truncate">{shop.company_name}</h1>
        </div>

        <main className="max-w-3xl mx-auto">
          <section className="px-4 pt-4">
            <div className="flex items-center gap-6">
              <span className="p-[3px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600 shrink-0">
                <span className="block p-[3px] bg-white rounded-full">
                  {shop.company_logo_url
                    ? <img src={shop.company_logo_url} alt={shop.company_name} className="w-20 h-20 rounded-full object-cover" />
                    : <span className="w-20 h-20 rounded-full bg-neutral-100 flex items-center justify-center"><Store className="w-8 h-8 text-neutral-400" /></span>}
                </span>
              </span>
              <div className="flex flex-1 justify-around text-center">
                <div><p className="font-bold text-neutral-900">{products.length}</p><p className="text-xs text-neutral-600">produits</p></div>
                <div><p className="font-bold text-neutral-900 flex items-center justify-center gap-1">{shop.rating || 4.5}<Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" /></p><p className="text-xs text-neutral-600">note</p></div>
              </div>
            </div>
            <div className="mt-3 text-sm">
              <p className="font-semibold text-neutral-900">{shop.company_name}</p>
              {shop.company_category && <p className="text-neutral-500">{shop.company_category}</p>}
              {shop.description && <p className="text-neutral-800 whitespace-pre-line">{shop.description}</p>}
              {shop.region && <p className="text-neutral-500 flex items-center gap-1 mt-0.5"><MapPin className="w-3.5 h-3.5" />{shop.region}</p>}
            </div>
            <div className="flex gap-2 mt-3">
              {shop.phone && (
                <a href={`https://wa.me/${String(shop.phone).replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                  className="flex-1 text-center bg-neutral-100 text-neutral-900 text-sm font-semibold py-1.5 rounded-lg">Message</a>
              )}
              <button onClick={shareShop} className="flex-1 bg-neutral-100 text-neutral-900 text-sm font-semibold py-1.5 rounded-lg">Partager</button>
            </div>
          </section>

          <div className="flex justify-center border-t border-neutral-200 mt-4">
            <span className="py-2.5 border-t-2 border-neutral-900 -mt-px"><LayoutGrid className="w-5 h-5 text-neutral-900" /></span>
          </div>

          {products.length === 0 ? (
            <p className="text-center text-neutral-500 text-sm py-12">Aucun produit pour le moment</p>
          ) : (
            <div className="grid grid-cols-3 gap-0.5">
              {products.map(p => (
                <button key={p.id} onClick={() => navigate(`/product/${p.slug || p.id}`)} className="relative bg-neutral-100" style={{ aspectRatio: '1 / 1' }}>
                  {p.image_url && <img src={`${p.image_url}${p.image_url.includes('?') ? '&' : '?'}width=300&quality=65&resize=cover`} alt={p.image_alt || p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />}
                  <span className="absolute bottom-1 left-1 bg-black/60 text-white text-[11px] font-semibold px-1.5 py-0.5 rounded">{Number(p.promo_price || p.price).toLocaleString()} G</span>
                </button>
              ))}
            </div>
          )}
        </main>
      </div>
    </>
  );
}