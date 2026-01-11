import React, { useState } from 'react';
import { 
  Minus, Plus, Store, MessageCircle, Loader2, MapPin, X,
  Star, ShieldCheck, Truck, RotateCcw, Clock 
} from 'lucide-react';

// --- MOCK DES DÉPENDANCES ET UTILITAIRES ---

// Simulation de l'API base44
const base44 = {
  auth: {
    redirectToLogin: () => alert("Redirection vers la page de connexion (Simulation)"),
  },
  functions: {
    invoke: async (name, params) => {
      console.log(`Fonction ${name} appelée avec:`, params);
      await new Promise(resolve => setTimeout(resolve, 1500)); // Latence artificielle
      return { id: "chat_simule_123" };
    }
  }
};

// Simulation du calcul de prix
const applyClientMargin = (price) => {
  if (!price) return 0;
  return Math.round(price * 1.0);
};

// --- COMPOSANTS UI SIMULÉS (Pour remplacer shadcn/ui) ---

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
  
  // Gestion simple des classes pour fusionner avec className passé en prop
  const computedClass = `${baseStyle} ${variants[variant] || variants.default} ${sizes[size] || sizes.default} ${className}`;
  
  return (
    <button onClick={onClick} disabled={disabled} className={computedClass}>
      {children}
    </button>
  );
};

// Simulation Dialog (Modal)
const Dialog = ({ open, onOpenChange, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" onClick={() => onOpenChange(false)}>
      <div onClick={e => e.stopPropagation()} className="w-full max-w-md mx-4">
        {children}
      </div>
    </div>
  );
};

const DialogContent = ({ children, className }) => (
  <div className={`bg-white shadow-lg animate-in zoom-in-95 duration-200 ${className}`}>
    {children}
  </div>
);

// --- COMPOSANTS INTERNES SPÉCIFIQUES ---

const StarRating = ({ rating = 4.5, count = 124 }) => (
  <div className="flex items-center gap-1">
    <div className="flex text-yellow-400">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star 
          key={star} 
          size={12} 
          className={star <= Math.round(rating) ? "fill-current" : "text-slate-200 fill-slate-200"} 
        />
      ))}
    </div>
    <span className="text-[10px] text-slate-400 font-medium">({count} avis)</span>
  </div>
);

const TrustBadge = ({ icon: Icon, title, subtitle }) => (
  <div className="flex flex-col items-center justify-center p-2 bg-slate-50/80 rounded-lg flex-1 border border-slate-100">
    <Icon size={16} className="text-slate-700 mb-1" />
    <span className="text-[9px] font-bold text-slate-700 leading-tight">{title}</span>
    <span className="text-[8px] text-slate-500 leading-tight">{subtitle}</span>
  </div>
);

// --- COMPOSANT PRINCIPAL : ProductDetailModal ---

export function ProductDetailModal({ product, shop, open, onClose, onAddToCart, user }) {
  const [quantity, setQuantity] = useState(1);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  
  if (!product) return null;

  // Logique Prix & Promo
  const price = product.price || 0;
  const promoPrice = product.promo_price;
  const hasPromo = promoPrice && promoPrice < price;

  const displayPrice = hasPromo 
    ? applyClientMargin(promoPrice) 
    : applyClientMargin(price);

  const originalDisplayPrice = applyClientMargin(price);

  const discountPercent = (hasPromo && price > 0)
    ? Math.round((1 - promoPrice / price) * 100) 
    : 0;

  const rating = product.rating || 4.8;
  const reviews = product.reviews_count || 124;

  const handleContactVendor = async () => {
    // Dans la démo, on considère l'utilisateur comme connecté ou on simule
    // if (!user) return base44.auth.redirectToLogin(...);

    const vendorId = shop?.user_id || product?.vendor_id || 'vendor_1';
    const shopId = shop?.id || 'shop_1';

    setIsChatLoading(true);
    try {
      const response = await base44.functions.invoke('chatService', {
        action: 'init',
        vendor_id: vendorId,
        shop_id: shopId,
        shop_name: shop?.company_name,
        shop_logo: shop?.company_logo_url,
        product_id: product.id,
        product_name: product.name,
        initial_message: `Bonjour, je suis intéressé par : ${product.name}`
      });
      
      alert("Chat initialisé ! Redirection vers la conversation...");
      // window.location.href = ... (désactivé pour la démo)
      
    } catch (error) {
      alert("Erreur lors de l'initialisation du chat.");
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white flex flex-col max-h-[95vh] sm:max-h-[90vh] rounded-xl sm:rounded-2xl border-none shadow-2xl mx-auto">
        
        {/* HEADER AVEC IMAGE (Scrollable) */}
        <div className="overflow-y-auto flex-1 custom-scrollbar pb-4 scroll-smooth">
          
          {/* ZONE IMAGE AVEC BADGES */}
          <div className="relative aspect-square w-full bg-white p-6 group">
             {/* Badge Promo */}
             {hasPromo && (
              <div className="absolute top-0 left-0 bg-[#CC0C39] text-white text-xs font-bold px-3 py-1.5 rounded-br-lg z-20 shadow-sm">
                -{discountPercent}%
              </div>
            )}

            {/* Badge Best Seller */}
            <div className="absolute top-0 right-12 bg-[#e67a00] text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg rounded-br-lg z-20 shadow-sm uppercase tracking-wider">
              Best Seller
            </div>

            {/* Bouton Fermer */}
            <button 
              onClick={onClose}
              className="absolute top-2 right-2 p-2 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-full transition-colors z-30"
            >
              <X size={20} />
            </button>

            <img 
              src={product.image_url} 
              alt={product.name} 
              className="w-full h-full object-contain mix-blend-multiply transition-transform duration-500 group-hover:scale-105" 
            />
          </div>

          <div className="px-5 space-y-5">
            {/* Titre, Rating et Prix */}
            <div className="space-y-2">
              <h2 className="text-lg font-bold text-slate-900 leading-tight line-clamp-2">{product.name}</h2>
              
              {/* Étoiles */}
              <div className="flex items-center justify-between">
                <StarRating rating={rating} count={reviews} />
                {product.is_available && (
                   <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                     En Stock
                   </span>
                )}
              </div>

              {/* Prix */}
              <div className="flex items-baseline gap-2 pt-1">
                <span className="text-3xl font-black text-orange-600 tracking-tight">
                  {displayPrice.toLocaleString()} <span className="text-sm font-bold">HTG</span>
                </span>
                {hasPromo && (
                  <span className="text-sm text-slate-400 line-through decoration-slate-300">
                    {originalDisplayPrice.toLocaleString()} HTG
                  </span>
                )}
              </div>
            </div>

            {/* Badges de Confiance */}
            <div className="flex gap-2">
               <TrustBadge icon={ShieldCheck} title="Protection" subtitle="Acheteur" />
               <TrustBadge icon={Truck} title="Livraison" subtitle={product.delivery_time || "Rapide"} />
               <TrustBadge icon={RotateCcw} title="Retour" subtitle="Sous 15j" />
            </div>

            {/* Tabs / Description */}
            <div>
               <div className="flex border-b border-slate-100 mb-3">
                 <button 
                   onClick={() => setActiveTab('description')}
                   className={`pb-2 text-sm font-bold border-b-2 px-1 transition-colors ${activeTab === 'description' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'}`}
                 >
                   Description
                 </button>
                 <button 
                   onClick={() => setActiveTab('specs')}
                   className={`pb-2 text-sm font-bold border-b-2 px-4 transition-colors ${activeTab === 'specs' ? 'border-orange-500 text-orange-600' : 'border-transparent text-slate-400'}`}
                 >
                   Détails
                 </button>
               </div>
               
               <div className="min-h-[60px]">
                  {activeTab === 'description' ? (
                    <p className="text-slate-600 text-sm leading-relaxed">{product.description || "Aucune description disponible."}</p>
                  ) : (
                    <div className="space-y-1 animate-in fade-in">
                       <p className="text-xs text-slate-500 flex justify-between border-b border-slate-50 py-1"><span>Catégorie:</span> <span className="font-medium text-slate-800">{product.category || 'Général'}</span></p>
                       <p className="text-xs text-slate-500 flex justify-between border-b border-slate-50 py-1"><span>Vendeur:</span> <span className="font-medium text-slate-800">{shop?.company_name}</span></p>
                       <p className="text-xs text-slate-500 flex justify-between border-b border-slate-50 py-1"><span>Ref:</span> <span className="font-medium text-slate-800">REF-{product.id}</span></p>
                    </div>
                  )}
               </div>
            </div>

            {/* Boutique & Info Paiement */}
            {shop && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-white border border-slate-200 flex-shrink-0">
                    {shop.company_logo_url ? (
                      <img src={shop.company_logo_url} className="w-full h-full object-cover" alt="" />
                    ) : (
                      <Store className="w-full h-full p-2 text-slate-400" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-xs text-slate-900 truncate">{shop.company_name}</p>
                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                      <MapPin size={10} /> {shop.region || 'Haïti'}
                    </p>
                  </div>
                </div>
                {/* Simulation Logo MonCash */}
                <div className="h-6 w-10 bg-red-600 rounded flex items-center justify-center text-[8px] font-bold text-white italic">
                  MonCash
                </div>
              </div>
            )}
          </div>
        </div>

        {/* FOOTER ACTIONS (Sticky) */}
        <div className="p-4 bg-white border-t border-slate-100 space-y-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-40">
          
          {/* Ligne 1: Boutons Contact */}
          <div className="flex gap-2">
            <Button
              onClick={handleContactVendor}
              disabled={isChatLoading}
              className="flex-1 py-5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm"
            >
              {isChatLoading ? <Loader2 className="animate-spin" /> : (
                <>
                  <MessageCircle size={18} className="mr-2" />
                  Discuter
                </>
              )}
            </Button>

            {shop?.company_category === "Mariage" && (
              <Button
                onClick={() => window.open('https://wa.me/c/50948690366', '_blank')}
                className="flex-1 py-5 bg-[#25D366] hover:bg-[#1ebd57] text-white rounded-xl font-bold shadow-sm"
              >
                <MessageCircle size={18} className="mr-2" />
                WhatsApp
              </Button>
            )}
          </div>

          {/* Ligne 2: Quantité & Panier */}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-xl p-1 h-12">
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-10 w-10 rounded-lg hover:bg-white"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus size={16} />
              </Button>
              <span className="font-black text-sm w-8 text-center">{quantity}</span>
              <Button 
                size="icon" 
                variant="ghost" 
                className="h-10 w-10 rounded-lg hover:bg-white"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={16} />
              </Button>
            </div>

            <Button 
              className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold rounded-xl shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
              onClick={() => { onAddToCart(product, quantity); onClose(); }}
            >
              Ajouter au panier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- DÉMONSTRATION (Pour visualiser le modal) ---

export default function DemoModal() {
  const [isOpen, setIsOpen] = useState(true);

  // Données factices pour la démo
  const mockProduct = {
    id: 123,
    name: "Montre Connectée Édition Limitée Sport Pro",
    price: 15000,
    promo_price: 12500,
    image_url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
    description: "Une montre intelligente haute performance avec suivi GPS, capteur cardiaque avancé et une autonomie de 7 jours. Résistante à l'eau et compatible iOS/Android.",
    is_available: true,
    category: "Électronique",
    delivery_time: "24h - 48h",
    rating: 4.9,
    reviews_count: 243
  };

  const mockShop = {
    id: "s1",
    company_name: "Tech Zone Haïti",
    region: "Delmas",
    company_category: "Électronique",
    company_logo_url: "https://images.unsplash.com/photo-1550009158-9ebf69173e03?auto=format&fit=crop&w=100&h=100"
  };

  return (
    <div className="min-h-screen bg-slate-200 flex items-center justify-center p-4">
      <Button onClick={() => setIsOpen(true)}>Ouvrir le Modal Produit</Button>
      
      <ProductDetailModal 
        open={isOpen}
        onClose={() => setIsOpen(false)}
        product={mockProduct}
        shop={mockShop}
        onAddToCart={(p, q) => alert(`Ajouté: ${q} x ${p.name}`)}
        user={{ id: "u1" }}
      />
    </div>
  );
}