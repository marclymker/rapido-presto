import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Helmet } from 'react-helmet-async';
import { ArrowLeft, ShoppingCart, Share2, Heart, Truck, Shield, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import ProductCard from '@/components/ui/ProductCard';
import { getClientPrice } from '@/components/utils/priceCalculation';
import { useAuth } from '@/components/auth/useAuth';
import { createPageUrl } from '@/utils';
import { useActivityTracker } from '@/components/tracking/useActivityTracker';

/**
 * PAGE PRODUIT INDIVIDUELLE - SEO OPTIMISÉE
 * URL: /products/{slug-produit}
 * 
 * ✅ URL propre et statique
 * ✅ Meta tags dynamiques complets
 * ✅ Structured data (Product Schema)
 * ✅ Breadcrumb
 * ✅ Images optimisées
 * ✅ Performance optimale
 */
export default function ProductPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { trackProductView, trackAddToCart } = useActivityTracker();
  const [selectedImage, setSelectedImage] = useState(0);

  // Récupérer le produit par slug
  const { data: products = [], isLoading } = useQuery({
    queryKey: ['product-by-slug', slug],
    queryFn: () => base44.entities.Product.filter({ slug }),
    enabled: !!slug
  });

  const product = products[0];

  // Récupérer la boutique
  const { data: shops = [] } = useQuery({
    queryKey: ['shop', product?.shop_id],
    queryFn: () => base44.entities.Shop.filter({ id: product.shop_id }),
    enabled: !!product?.shop_id
  });

  const shop = shops[0];

  // Produits similaires
  const { data: similarProducts = [] } = useQuery({
    queryKey: ['similar', product?.category, product?.id],
    queryFn: () => base44.entities.Product.filter({ 
      category: product.category,
      is_available: true 
    }),
    enabled: !!product?.category,
    select: (data) => data.filter(p => p.id !== product?.id).slice(0, 8)
  });

  useEffect(() => {
    if (product) {
      setSelectedImage(0);
      // Track ViewContent pour Meta Pixel + GA4
      trackProductView(product, shop);
    }
  }, [product?.id]);

  const handleAddToCart = async () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }

    try {
      const cartItems = await base44.entities.CartItem.filter({ user_id: user.id });
      const existing = cartItems.find(item => item.product_id === product.id);
      
      if (existing) {
        await base44.entities.CartItem.update(existing.id, {
          quantity: existing.quantity + 1
        });
      } else {
        await base44.entities.CartItem.create({
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          quantity: 1,
          unit_price: getClientPrice(product),
          shop_id: shop?.id,
          shop_name: shop?.company_name,
          shop_region: shop?.region
        });
      }
      toast.success('Ajouté au panier');
      // Track AddToCart Meta Pixel + GA4
      trackAddToCart(product, 1);
    } catch (e) {
      toast.error('Erreur');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-4">Produit introuvable</h1>
        <Button onClick={() => navigate('/')}>Retour à l'accueil</Button>
      </div>
    );
  }

  const price = getClientPrice(product);
  const images = [product.image_url, ...(product.additional_images || [])].filter(Boolean);
  const inStock = product.stock_quantity > 0 || product.stock_quantity === undefined;

  // Structured Data - Product Schema
  const productSchema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": product.name,
    "description": product.description || `${product.name} disponible sur Rapido Presto`,
    "image": images,
    "sku": product.id,
    "brand": {
      "@type": "Brand",
      "name": shop?.company_name || "Rapido Presto"
    },
    "offers": {
      "@type": "Offer",
      "price": price,
      "priceCurrency": "HTG",
      "availability": inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      "url": typeof window !== 'undefined' ? window.location.href : '',
      "seller": {
        "@type": "Organization",
        "name": shop?.company_name || "Rapido Presto"
      }
    },
    "category": product.category
  };

  // Breadcrumb Schema
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
        "name": product.category,
        "item": typeof window !== 'undefined' ? `${window.location.origin}?category=${product.category}` : ''
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": product.name
      }
    ]
  };

  return (
    <>
      <Helmet>
        {/* Title optimisé pour SEO */}
        <title>{product.name} - {price.toFixed(0)} HTG | {shop?.company_name || 'Rapido Presto'}</title>
        
        {/* Meta description riche */}
        <meta 
          name="description" 
          content={`${product.name} - ${price.toFixed(0)} HTG. ${product.description || ''} Livraison rapide en Haïti. ${inStock ? 'En stock' : 'Épuisé'}.`}
        />
        
        {/* Keywords */}
        <meta 
          name="keywords" 
          content={`${product.name}, ${product.category}, Haïti, ${shop?.company_name || 'Rapido Presto'}, ${product.seo_tags?.join(', ') || ''}`}
        />

        {/* Open Graph */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={product.name} />
        <meta property="og:description" content={product.description || `${product.name} - ${price.toFixed(0)} HTG. Livraison rapide en Haïti.`} />
        <meta property="og:image" content={product.image_url} />
        <meta property="og:image:width" content="800" />
        <meta property="og:image:height" content="800" />
        <meta property="og:image:alt" content={product.image_alt || product.name} />
        <meta property="og:url" content={typeof window !== 'undefined' ? window.location.href : ''} />
        <meta property="og:site_name" content="Rapido Presto" />
        <meta property="og:locale" content="fr_HT" />
        <meta property="product:price:amount" content={price.toString()} />
        <meta property="product:price:currency" content="HTG" />
        <meta property="product:availability" content={product.is_available !== false ? 'in stock' : 'out of stock'} />
        <meta property="product:retailer_item_id" content={product.id} />
        <meta property="product:condition" content="new" />

        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={product.name} />
        <meta name="twitter:description" content={product.description || product.name} />
        <meta name="twitter:image" content={product.image_url} />

        {/* Canonical URL */}
        <link rel="canonical" href={typeof window !== 'undefined' ? window.location.href : ''} />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify(productSchema)}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(breadcrumbSchema)}
        </script>
      </Helmet>

      {/* HTML SEMANTIC - Crawlable sans JS */}
      <div className="min-h-screen bg-gray-50">
        {/* Breadcrumb visible */}
        <nav className="bg-white border-b px-4 py-2" aria-label="breadcrumb">
          <ol className="flex items-center gap-2 text-sm text-gray-600">
            <li><a href="/" className="hover:text-orange-600">Accueil</a></li>
            <li>/</li>
            <li><a href={`/?category=${product.category}`} className="hover:text-orange-600">{product.category}</a></li>
            <li>/</li>
            <li className="text-gray-900 font-medium">{product.name}</li>
          </ol>
        </nav>

        <main className="max-w-7xl mx-auto p-4 lg:p-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>

          <article className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="grid lg:grid-cols-2 gap-8 p-6">
              {/* Images */}
              <section>
                <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden mb-4">
                  <img
                    src={images[selectedImage]}
                    alt={`${product.name} - Image ${selectedImage + 1}`}
                    className="w-full h-full object-contain"
                    loading="eager"
                  />
                </div>
                {images.length > 1 && (
                  <div className="grid grid-cols-5 gap-2">
                    {images.map((img, idx) => (
                      <button
                        key={idx}
                        onClick={() => setSelectedImage(idx)}
                        className={`aspect-square rounded overflow-hidden border-2 ${
                          selectedImage === idx ? 'border-orange-500' : 'border-gray-200'
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" />
                      </button>
                    ))}
                  </div>
                )}
              </section>

              {/* Détails produit */}
              <section>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {product.name}
                </h1>

                {shop && (
                  <a 
                    href={shop.slug ? `/shops/${shop.slug}` : `${createPageUrl('ShopView')}?slug=${shop.slug}`}
                    className="text-blue-600 hover:underline mb-4 block"
                  >
                    Par {shop.company_name}
                  </a>
                )}

                <div className="flex items-baseline gap-3 mb-6">
                  <span className="text-4xl font-black text-gray-900">
                    {price.toFixed(0)} HTG
                  </span>
                  {product.promo_price && (
                    <span className="text-lg line-through text-gray-400">
                      {product.price.toFixed(0)} HTG
                    </span>
                  )}
                </div>

                {inStock ? (
                  <Badge className="bg-green-100 text-green-800 mb-4">✓ En stock</Badge>
                ) : (
                  <Badge className="bg-red-100 text-red-800 mb-4">Épuisé</Badge>
                )}

                {/* Description */}
                {product.description && (
                  <div className="mb-6">
                    <h2 className="font-bold text-lg mb-2">Description</h2>
                    <p className="text-gray-700 whitespace-pre-wrap">{product.description}</p>
                  </div>
                )}

                {/* Réassurance */}
                <div className="grid grid-cols-3 gap-4 py-6 border-y mb-6">
                  <div className="text-center">
                    <Truck className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                    <p className="text-xs text-gray-600">Livraison rapide</p>
                  </div>
                  <div className="text-center">
                    <Shield className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                    <p className="text-xs text-gray-600">Paiement sécurisé</p>
                  </div>
                  <div className="text-center">
                    <Clock className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                    <p className="text-xs text-gray-600">{product.delivery_time || '24-48h'}</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <Button
                    onClick={handleAddToCart}
                    className="flex-1 bg-orange-500 hover:bg-orange-600 text-white text-lg py-6"
                    disabled={!inStock}
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Ajouter au panier
                  </Button>
                  <Button variant="outline" size="icon" className="py-6 px-4">
                    <Heart className="w-5 h-5" />
                  </Button>
                  <Button variant="outline" size="icon" className="py-6 px-4">
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>

                {/* Infos complémentaires */}
                <div className="mt-6 space-y-2 text-sm text-gray-600">
                  <p><strong>Catégorie :</strong> {product.category}</p>
                  {product.subcategory && <p><strong>Sous-catégorie :</strong> {product.subcategory}</p>}
                  <p><strong>Délai :</strong> {product.delivery_time || 'Selon disponibilité'}</p>
                  <p><strong>Référence :</strong> {product.id.slice(0, 8)}</p>
                </div>
              </section>
            </div>
          </article>

          {/* Produits similaires */}
          {similarProducts.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Produits similaires</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {similarProducts.map(p => (
                  <a key={p.id} href={`/products/${p.slug}`}>
                    <ProductCard
                      product={p}
                      shop={shops.find(s => s.id === p.shop_id)}
                      onClick={() => window.location.href = `/products/${p.slug}`}
                    />
                  </a>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </>
  );
}