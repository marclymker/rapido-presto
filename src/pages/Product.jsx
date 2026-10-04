import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { 
  ArrowLeft, 
  ShoppingCart, 
  Minus, 
  Plus, 
  Store, 
  MapPin, 
  Check, 
  MessageCircle,
  Maximize2,
  Download,
  X,
  Star,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronRight
} from 'lucide-react';

const getClientPrice = (product) => {
  const basePrice = product.promo_price && parseFloat(product.promo_price) < parseFloat(product.price)
    ? parseFloat(product.promo_price)
    : parseFloat(product.price);
  return Math.round(basePrice * 1.1);
};

// --- COMPONENTS ---

const Button = ({ children, onClick, variant = 'default', size = 'default', className = '', disabled }) => {
  const baseStyle = "inline-flex items-center justify-center rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50";
  const variants = {
    default: "bg-slate-900 text-white hover:bg-slate-800",
    ghost: "hover:bg-slate-100 text-slate-700",
    outline: "border border-slate-200 bg-white hover:bg-slate-100 text-slate-900"
  };
  const sizes = {
    default: "h-10 px-4 py-2",
    icon: "h-10 w-10",
    sm: "h-9 px-3"
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`}>
      {children}
    </button>
  );
};

const Badge = ({ children, className = '', variant = 'default' }) => {
  const base = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors";
  const variants = {
    default: "border-transparent bg-slate-900 text-white",
    outline: "text-slate-950 border-slate-200",
    destructive: "border-transparent bg-red-500 text-white"
  };
  return <div className={`${base} ${variants[variant] || variants.default} ${className}`}>{children}</div>;
};

// Composant pour afficher les étoiles
const StarRating = ({ rating, count }) => (
  <div className="flex items-center gap-1">
    <div className="flex text-yellow-400">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star} 
          className={`w-4 h-4 ${star <= Math.round(rating) ? 'fill-current' : 'text-slate-200 fill-slate-200'}`} 
        />
      ))}
    </div>
    <span className="text-sm text-slate-500 font-medium ml-1">{rating}</span>
    {count && <span className="text-sm text-slate-400">({count} avis)</span>}
  </div>
);

// Composant Badge de confiance style Amazon/Alibaba
const TrustBadge = ({ icon: Icon, title, subtitle }) => (
  <div className="flex flex-col items-center text-center gap-1 min-w-[80px]">
    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-700 mb-1">
      <Icon className="w-5 h-5" />
    </div>
    <span className="text-[10px] font-bold text-slate-700 leading-tight">{title}</span>
    <span className="text-[9px] text-slate-500 leading-tight">{subtitle}</span>
  </div>
);

const CustomizationOptions = ({ product, onChange }) => {
  const [selectedColor, setSelectedColor] = useState(product.customization_options?.colors?.[0] || null);
  const [selectedSize, setSelectedSize] = useState(product.customization_options?.sizes?.[0] || null);

  useEffect(() => {
    onChange({ color: selectedColor, size: selectedSize });
  }, [selectedColor, selectedSize]);

  return (
    <div className="space-y-6 pt-4 border-t border-slate-100">
      <h3 className="font-bold text-slate-800">Personnalisation</h3>
      {product.customization_options?.colors && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">Couleur</label>
          <div className="flex gap-3">
            {product.customization_options.colors.map((color) => (
              <button
                key={color.name}
                onClick={() => setSelectedColor(color)}
                className={`group relative w-12 h-12 rounded-full border-2 flex items-center justify-center transition-all ${
                  selectedColor?.name === color.name ? 'border-orange-500 scale-110' : 'border-slate-200'
                }`}
                style={{ backgroundColor: color.value }}
                title={color.name}
              >
                {selectedColor?.name === color.name && (
                  <Check className={`w-5 h-5 ${['#ffffff', '#fffff0'].includes(color.value) ? 'text-slate-900' : 'text-white'}`} />
                )}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500">Sélectionné: {selectedColor?.name}</p>
        </div>
      )}
      {product.customization_options?.sizes && (
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700">Taille</label>
          <div className="flex flex-wrap gap-2">
            {product.customization_options.sizes.map((size) => (
              <button
                key={size.name}
                onClick={() => setSelectedSize(size)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all ${
                  selectedSize?.name === size.name 
                    ? 'border-orange-500 bg-orange-50 text-orange-700' 
                    : 'border-slate-100 bg-white text-slate-600 hover:border-slate-200'
                }`}
              >
                {size.name}
                {size.additional_price > 0 && <span className="text-xs opacity-75 ml-1">+{size.additional_price}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default function Product() {
  const [user, setUser] = useState(null);
  const [product, setProduct] = useState(null);
  const [shop, setShop] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [customization, setCustomization] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [activeImage, setActiveImage] = useState('');
  const [activeTab, setActiveTab] = useState('description');
  const [similarProducts, setSimilarProducts] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Lire la clé produit depuis l'URL. Les nouveaux liens utilisent l'ID.
        const urlParams = new URLSearchParams(window.location.search);
        const productKey = urlParams.get('id') || urlParams.get('product_id') || urlParams.get('slug');

        if (!productKey) {
          window.location.href = '/';
          return;
        }

        // Charger le produit depuis la base de données
        const allProducts = await base44.entities.Product.list();
        const foundProduct = allProducts.find(p => p.id === productKey)
          || (() => {
            const matches = allProducts.filter(p => p.slug === productKey);
            return matches.length === 1 ? matches[0] : null;
          })();

        if (!foundProduct) {
          // Produit introuvable, rediriger vers l'accueil après 2 secondes
          setTimeout(() => {
            window.location.href = '/';
          }, 2000);
          setIsLoading(false);
          return;
        }

        setProduct(foundProduct);
        
        // Préparer les images (image principale + images additionnelles)
        const images = [foundProduct.image_url, ...(foundProduct.additional_images || [])].filter(Boolean);
        foundProduct.images = images;
        setActiveImage(images[0]);

        // Charger la boutique
        const allShops = await base44.entities.Shop.list();
        const foundShop = allShops.find(s => s.id === foundProduct.shop_id);
        setShop(foundShop);

        // Charger les produits similaires (même catégorie)
        const similar = allProducts
          .filter(p => p.category === foundProduct.category && p.id !== foundProduct.id && p.is_available !== false)
          .slice(0, 6);
        setSimilarProducts(similar);

        // Charger l'utilisateur
        try {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
        } catch (e) {
          // Utilisateur non connecté
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Erreur chargement produit:', error);
        window.location.href = '/';
      }
    };
    fetchData();
  }, []);

  const clientPrice = product ? getClientPrice(product) : 0;
  const hasPromo = product?.promo_price && parseFloat(product.promo_price) < parseFloat(product.price);

  const calculateTotalPrice = () => {
    if (!product) return 0;
    const basePrice = clientPrice * quantity;
    let customizationTotal = 0;
    if (customization.color) customizationTotal += customization.color.additional_price || 0;
    if (customization.size) customizationTotal += customization.size.additional_price || 0;
    return basePrice + (customizationTotal * quantity);
  };

  const handleAddToCart = async () => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname + window.location.search);
      return;
    }
    
    try {
      const existingCart = await base44.entities.CartItem.filter({ 
        user_id: user.id, 
        product_id: product.id 
      });
      
      if (existingCart.length > 0) {
        await base44.entities.CartItem.update(existingCart[0].id, {
          quantity: existingCart[0].quantity + quantity
        });
      } else {
        await base44.entities.CartItem.create({
          user_id: user.id,
          product_id: product.id,
          product_name: product.name,
          product_image: product.image_url,
          quantity: quantity,
          unit_price: clientPrice,
          shop_id: shop?.id,
          shop_name: shop?.company_name,
          shop_region: shop?.region
        });
      }
      
      window.location.href = '/cart';
    } catch (error) {
      alert('Erreur lors de l\'ajout au panier');
    }
  };

  const handleDownloadImage = async () => {
    // Logic to download activeImage
    const link = document.createElement('a');
    link.href = activeImage;
    link.download = `product_image.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center p-6">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Produit introuvable</h2>
          <p className="text-slate-600 mb-4">Ce produit n'existe plus ou a été supprimé.</p>
          <p className="text-sm text-slate-500">Redirection vers l'accueil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-32 font-sans text-slate-900">
      
      {/* 1. AMAZON STYLE BREADCRUMBS */}
      <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-40 border-b border-slate-100">
         <div className="px-4 py-2 text-xs text-slate-500 flex items-center gap-1 max-w-lg mx-auto">
            <span>Accueil</span> <ChevronRight className="w-3 h-3" />
            <span>{product.category}</span> <ChevronRight className="w-3 h-3" />
            <span className="text-slate-800 truncate font-medium">{product.name}</span>
         </div>
      </div>

      <div className="max-w-lg mx-auto">
        
        {/* Header Navigation */}
        <div className="absolute top-10 left-4 z-30">
          <Button variant="ghost" size="icon" onClick={() => window.history.back()} className="bg-white/80 rounded-full shadow-sm hover:bg-white">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </div>

        {/* 2. GALLERY SYSTEM */}
        <div className="relative w-full bg-slate-50">
          <div className="relative w-full aspect-square group">
            <img 
              src={activeImage} 
              alt={product.name}
              className="w-full h-full object-cover transition-opacity duration-300"
              onClick={() => setIsZoomed(true)}
            />
            {/* Promo Badge */}
            {hasPromo && (
              <Badge className="absolute top-4 right-4 bg-red-500 text-white shadow-md">
                🔥 -{Math.round(((product.price - product.promo_price) / product.price) * 100)}%
              </Badge>
            )}
            {/* Action Buttons */}
            <div className="absolute bottom-4 right-4 flex gap-2">
               <Button onClick={() => setIsZoomed(true)} className="bg-white/90 text-slate-700 hover:bg-white rounded-full h-10 w-10 shadow-sm" size="icon">
                  <Maximize2 className="w-5 h-5" />
               </Button>
               <Button onClick={handleDownloadImage} className="bg-white/90 text-slate-700 hover:bg-white rounded-full h-10 w-10 shadow-sm" size="icon">
                  <Download className="w-5 h-5" />
               </Button>
            </div>
          </div>
          
          {/* Thumbnail Strip */}
          <div className="flex gap-2 p-4 overflow-x-auto scrollbar-hide">
             {product.images?.map((img, idx) => (
                <button 
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 ${activeImage === img ? 'border-orange-500' : 'border-transparent'}`}
                >
                  <img src={img} className="w-full h-full object-cover" alt="" />
                </button>
             ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 pt-2 pb-6 space-y-6">
          
          {/* Title, Rating & Price */}
          <div className="space-y-3">
            <h2 className="text-xl font-bold text-slate-900 leading-tight">{product.name}</h2>

            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-orange-500">{clientPrice.toLocaleString()} HTG</span>
              {hasPromo && (
                <div className="flex flex-col">
                  <span className="text-sm text-slate-400 line-through decoration-1">
                    {product.price.toLocaleString()} HTG
                  </span>
                  <span className="text-xs text-red-500 font-medium">Prix le plus bas sur 30j</span>
                </div>
              )}
            </div>
          </div>

          {/* 3. TRUST BADGES (ALIBABA STYLE) */}
          <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-100 bg-slate-50/50 rounded-xl px-2">
             <TrustBadge icon={ShieldCheck} title="Protection" subtitle="Acheteur" />
             <TrustBadge icon={Truck} title="Livraison" subtitle="Rapide" />
             <TrustBadge icon={RotateCcw} title="Retour" subtitle="Sous 15j" />
          </div>

          {/* 4. TABS FOR INFORMATION */}
          <div className="space-y-4">
             <div className="flex border-b border-slate-200">
                {['description', 'avis'].map((tab) => (
                   <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 pb-3 text-sm font-medium capitalize transition-colors relative ${
                         activeTab === tab ? 'text-orange-600' : 'text-slate-500 hover:text-slate-700'
                      }`}
                   >
                      {tab === 'specs' ? 'Spécifications' : tab}
                      {activeTab === tab && (
                         <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-orange-600 rounded-t-full" />
                      )}
                   </button>
                ))}
             </div>

             <div className="min-h-[100px]">
                {activeTab === 'description' && (
                  <p className="text-slate-600 leading-relaxed text-sm animate-in fade-in">{product.description || 'Aucune description disponible.'}</p>
                )}
                {activeTab === 'avis' && (
                   <div className="text-center py-4 text-slate-500 text-sm animate-in fade-in">
                     <p>Les avis clients seront bientôt disponibles.</p>
                   </div>
                )}
             </div>
          </div>

          {/* Customization */}
          <CustomizationOptions product={product} onChange={setCustomization} />

          {/* Shop Info (Simplified Alibaba Vendor Card) */}
          {shop && (
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm mt-6">
               <div className="flex items-center gap-3 mb-4">
                  {shop.company_logo_url ? (
                    <img src={shop.company_logo_url} className="w-12 h-12 rounded-full object-cover border border-slate-100" alt="" />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-lg font-bold text-orange-600">
                      {shop.company_name[0]}
                    </div>
                  )}
                  <div>
                     <p className="font-bold text-slate-900 text-base">{shop.company_name}</p>
                     <p className="text-xs text-slate-500">{shop.region}</p>
                  </div>
               </div>
               
               <div className="flex flex-col gap-3">
                  <button 
                    onClick={() => window.location.href = '/chat'}
                    className="w-full flex items-center justify-center gap-2 bg-slate-900 text-white py-3 rounded-xl font-bold hover:bg-slate-800 transition-all shadow-md active:scale-[0.98]"
                  >
                     <MessageCircle className="w-5 h-5" /> Discuter avec le vendeur
                  </button>
                  
                  {shop.company_name?.toLowerCase().includes('makarios') && (
                    <button 
                       onClick={() => window.open('https://wa.me/c/50948690366', '_blank')}
                       className="w-full flex items-center justify-center gap-2 bg-[#25D366] text-white py-3 rounded-xl font-bold hover:bg-[#20bd5a] transition-all shadow-md active:scale-[0.98]"
                    >
                       <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
                       Contact WhatsApp
                    </button>
                  )}
               </div>
            </div>
          )}

          {/* Similar Products (Horizontal Scroll) */}
          {similarProducts.length > 0 && (
            <div className="pt-6 border-t border-slate-100">
              <h3 className="font-bold text-slate-900 mb-4 text-lg">Produits similaires</h3>
              <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
                {similarProducts.map((simProduct) => (
                  <div 
                    key={simProduct.id} 
                    className="flex-shrink-0 w-36 group cursor-pointer"
                    onClick={() => {
                      if (simProduct.id) {
                        window.location.href = `/product?id=${encodeURIComponent(simProduct.id)}`;
                      }
                    }}
                  >
                    <div className="relative w-36 h-36 mb-2 overflow-hidden rounded-lg bg-slate-100 border border-slate-200">
                      <img src={simProduct.image_url} alt={simProduct.name} className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                    </div>
                    <h4 className="font-medium text-slate-800 text-xs line-clamp-2">{simProduct.name}</h4>
                    <p className="text-orange-600 font-bold text-sm">{getClientPrice(simProduct).toLocaleString()} HTG</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Zoom Modal */}
      {isZoomed && (
        <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
          <Button variant="ghost" size="icon" onClick={() => setIsZoomed(false)} className="absolute top-4 right-4 text-white hover:bg-white/20 rounded-full h-12 w-12">
            <X className="w-8 h-8" />
          </Button>
          <img src={activeImage} alt="Zoom" className="max-w-full max-h-full object-contain" />
        </div>
      )}

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] p-3 pb-6 z-40">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-full px-1 h-12">
            <Button variant="ghost" size="icon" onClick={() => setQuantity(Math.max(1, quantity - 1))} className="rounded-full h-10 w-10">
              <Minus className="w-4 h-4" />
            </Button>
            <span className="w-8 text-center font-bold text-sm">{quantity}</span>
            <Button variant="ghost" size="icon" onClick={() => setQuantity(quantity + 1)} className="rounded-full h-10 w-10">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <Button onClick={handleAddToCart} disabled={!product.is_available} className="flex-1 bg-gradient-to-r from-orange-500 to-orange-600 text-white h-12 rounded-full font-bold shadow-lg shadow-orange-500/25">
             <div className="flex flex-col items-start leading-none gap-0.5">
                <span className="text-sm">Acheter maintenant</span>
                <span className="text-[10px] font-normal opacity-90">Total: {calculateTotalPrice().toLocaleString()} HTG</span>
             </div>
             <ShoppingCart className="w-5 h-5 ml-auto" />
          </Button>
        </div>
      </div>
    </div>
  );
}
