import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ShoppingCart, Minus, Plus, Store, MapPin } from 'lucide-react';
import ChatButton from '@/components/chat/ChatButton';
import { toast } from "sonner";
import { Helmet } from 'react-helmet-async';
import { getClientPrice } from '@/components/utils/priceCalculation';
import CustomizationOptions from '@/components/product/CustomizationOptions';

export default function Product() {
  const [user, setUser] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customization, setCustomization] = useState({});
  const queryClient = useQueryClient();

  // Get product ID from URL
  const urlParams = new URLSearchParams(window.location.search);
  const productId = urlParams.get('id');

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  // Fetch product
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: async () => {
      const products = await base44.entities.Product.filter({ id: productId });
      return products[0];
    },
    enabled: !!productId
  });

  // Fetch shop
  const { data: shop } = useQuery({
    queryKey: ['shop', product?.shop_id],
    queryFn: () => base44.entities.Shop.filter({ id: product.shop_id }).then(shops => shops[0]),
    enabled: !!product?.shop_id
  });

  // Fetch cart
  const { data: cartItems = [] } = useQuery({
    queryKey: ['cart', user?.id],
    queryFn: () => base44.entities.CartItem.filter({ user_id: user?.id }),
    enabled: !!user?.id
  });

  const addToCartMutation = useMutation({
    mutationFn: async ({ product, quantity, customization }) => {
      const clientPrice = getClientPrice(product);
      
      // Calculate customization total
      let customizationTotal = 0;
      if (customization.color) customizationTotal += customization.color.additional_price || 0;
      if (customization.size) customizationTotal += customization.size.additional_price || 0;
      if (customization.text && product.customization_options?.text_customization?.price) {
        customizationTotal += product.customization_options.text_customization.price;
      }
      if (customization.arrangement) customizationTotal += customization.arrangement.additional_price || 0;

      // Don't merge with existing if has customization
      const hasCustomization = Object.keys(customization).length > 0;
      if (!hasCustomization) {
        const existing = cartItems.find(item => item.product_id === product.id && !item.customization);
        if (existing) {
          return base44.entities.CartItem.update(existing.id, {
            quantity: existing.quantity + quantity
          });
        }
      }

      return base44.entities.CartItem.create({
        user_id: user.id,
        product_id: product.id,
        product_name: product.name,
        product_image: product.image_url,
        quantity: quantity,
        unit_price: clientPrice,
        shop_id: product.shop_id,
        shop_name: product.shop_name,
        shop_region: shop?.region,
        customization: hasCustomization ? customization : undefined,
        total_customization_price: customizationTotal
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['cart']);
      toast.success('Article ajouté au panier');
    }
  });

  const handleAddToCart = () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }
    addToCartMutation.mutate({ product, quantity, customization });
  };

  const calculateTotalPrice = () => {
    const basePrice = clientPrice * quantity;
    let customizationTotal = 0;
    if (customization.color) customizationTotal += customization.color.additional_price || 0;
    if (customization.size) customizationTotal += customization.size.additional_price || 0;
    if (customization.text && product.customization_options?.text_customization?.price) {
      customizationTotal += product.customization_options.text_customization.price;
    }
    if (customization.arrangement) customizationTotal += customization.arrangement.additional_price || 0;
    return basePrice + (customizationTotal * quantity);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-6xl mb-4">📦</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-2">Produit introuvable</h1>
        <p className="text-slate-500 mb-4">Ce produit n'existe pas ou a été supprimé</p>
        <Button onClick={() => window.location.href = '/'} className="bg-orange-500 hover:bg-orange-600">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Button>
      </div>
    );
  }

  const clientPrice = getClientPrice(product);
  const hasPromo = product.promo_price && parseFloat(product.promo_price) < parseFloat(product.price);

  // Generate SEO-optimized description
  const seoDescription = product.description 
    ? `${product.description.substring(0, 155)}... | Prix: ${clientPrice.toFixed(0)} HTG | Livraison rapide en Haïti`
    : `Achetez ${product.name} à ${clientPrice.toFixed(0)} HTG - Livraison rapide en Haïti ${product.category ? `| ${product.category}` : ''}`;

  const keywords = [
    product.name,
    product.category,
    shop?.company_name,
    shop?.region,
    'Haïti',
    'livraison rapide',
    'acheter en ligne',
    ...(product.seo_tags || [])
  ].filter(Boolean).join(', ');

  return (
    <div className="min-h-screen bg-white pb-20">
      <Helmet>
        <title>{product.name} - {shop?.company_name || 'Rapido Presto'}</title>
        <meta name="description" content={seoDescription} />
        <meta name="keywords" content={keywords} />
        <link rel="canonical" href={`https://rapidopresto.shop/product?id=${product.id}`} />

        {/* Open Graph / Facebook */}
        <meta property="og:type" content="product" />
        <meta property="og:title" content={`${product.name} - ${shop?.company_name || 'Rapido Presto'}`} />
        <meta property="og:description" content={seoDescription} />
        <meta property="og:image" content={product.image_url} />
        <meta property="og:url" content={`https://rapidopresto.shop/product?id=${product.id}`} />
        <meta property="product:price:amount" content={clientPrice.toFixed(2)} />
        <meta property="product:price:currency" content="HTG" />
        {hasPromo && <meta property="product:sale_price:amount" content={clientPrice.toFixed(2)} />}
        {product.category && <meta property="product:category" content={product.category} />}
        {product.is_available && <meta property="product:availability" content="in stock" />}

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${product.name} - ${shop?.company_name || 'Rapido Presto'}`} />
        <meta name="twitter:description" content={seoDescription} />
        <meta name="twitter:image" content={product.image_url} />

        {/* Schema.org structured data */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            "name": product.name,
            "description": product.description || seoDescription,
            "image": product.image_url,
            "sku": product.id,
            "offers": {
              "@type": "Offer",
              "url": `https://rapidopresto.shop/product?id=${product.id}`,
              "priceCurrency": "HTG",
              "price": clientPrice.toFixed(2),
              "availability": product.is_available ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              "seller": {
                "@type": "Organization",
                "name": shop?.company_name || "Rapido Presto"
              }
            },
            ...(product.category && { "category": product.category }),
            ...(hasPromo && { 
              "priceValidUntil": new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            })
          })}
        </script>
      </Helmet>

      {/* Header */}
      <div className="sticky top-0 bg-white z-50 shadow-sm">
        <div className="p-4 flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-bold text-slate-800">Détails du produit</h1>
          <div className="w-10"></div>
        </div>
      </div>

      {/* Product Image */}
      <div className="relative w-full h-80 bg-slate-100">
        <img 
          src={product.image_url} 
          alt={product.name}
          className="w-full h-full object-cover"
        />
        {hasPromo && (
          <Badge className="absolute top-4 right-4 bg-red-500 text-white px-3 py-1">
            🔥 Promo
          </Badge>
        )}
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Title and Price */}
        <div>
          <h2 className="text-2xl font-black text-slate-800 mb-2">{product.name}</h2>
          <div className="flex items-baseline gap-3">
            <span className="text-3xl font-black text-orange-500">{clientPrice.toFixed(0)} HTG</span>
            {hasPromo && (
              <span className="text-lg text-slate-400 line-through">{parseFloat(product.price).toFixed(0)} HTG</span>
            )}
          </div>
        </div>

        {/* Shop Info */}
        {shop && (
          <div className="bg-slate-50 rounded-2xl p-4 flex items-center gap-4">
            {shop.company_logo_url ? (
              <img src={shop.company_logo_url} className="w-12 h-12 rounded-full object-cover" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <Store className="w-6 h-6 text-orange-600" />
              </div>
            )}
            <div className="flex-1">
              <p className="font-bold text-slate-800">{shop.company_name}</p>
              {shop.region && (
                <p className="text-sm text-slate-500 flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {shop.region}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Description */}
        {product.description && (
          <div>
            <h3 className="font-bold text-slate-800 mb-2">Description</h3>
            <p className="text-slate-600 leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Product Info */}
        <div className="space-y-2">
          {product.category && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Catégorie</span>
              <Badge variant="outline">{product.category}</Badge>
            </div>
          )}
          {product.stock_quantity !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Stock</span>
              <span className="font-bold text-slate-800">
                {product.stock_quantity > 0 ? `${product.stock_quantity} disponibles` : 'Rupture de stock'}
              </span>
            </div>
          )}
          {product.delivery_time && (
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Livraison</span>
              <span className="font-bold text-slate-800">{product.delivery_time}</span>
            </div>
          )}
        </div>

        {/* Customization Options */}
        <CustomizationOptions 
          product={product} 
          onChange={setCustomization}
        />

        {/* Chat Button */}
        {shop && (
          <ChatButton product={product} shop={shop} />
        )}
        </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 safe-bottom">
        <div className="max-w-screen-lg mx-auto flex items-center gap-4">
          {/* Quantity Selector */}
          <div className="flex items-center bg-slate-100 rounded-full">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="rounded-full"
            >
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-12 text-center font-bold">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
              className="rounded-full"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Add to Cart Button */}
          <Button
            onClick={handleAddToCart}
            disabled={!product.is_available || (product.stock_quantity !== undefined && product.stock_quantity === 0)}
            className="flex-1 bg-orange-500 hover:bg-orange-600 text-white py-6 rounded-full font-bold flex-col gap-1"
          >
            <div className="flex items-center">
              <ShoppingCart className="w-5 h-5 mr-2" />
              Ajouter au panier
            </div>
            {calculateTotalPrice() !== clientPrice * quantity && (
              <span className="text-xs opacity-90">
                Total: {calculateTotalPrice().toFixed(0)} HTG
              </span>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}