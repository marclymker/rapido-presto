import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  Minus, Plus, Store, MessageSquare, Loader2, MapPin, X, 
  ChevronRight, ZoomIn, ZoomOut, Download, RotateCcw, 
  Share2 // Ajout de l'icône de partage
} from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { trackMetaEvent } from '@/components/utils/metaTracking';

export default function ProductDetailModal({ product, shop, open, onClose, onAddToCart, user, similarProducts = [], onProductChange }) {
  const [quantity, setQuantity] = useState(1);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [loadingSimilar, setLoadingSimilar] = useState(false);
  const [similarItems, setSimilarItems] = useState(similarProducts);
  const [zoom, setZoom] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  // --- LOGIQUE DE PARTAGE ---
  const handleShare = async () => {
    // Utiliser le slug si disponible, sinon l'ID
    const productIdentifier = product.slug || product.id;
    const shopSlug = shop?.slug || '';
    
    // Construction du lien avec slugs
    let shareUrl;
    if (shopSlug && product.slug) {
      shareUrl = `${window.location.origin}/shop/${shopSlug}/product/${product.slug}`;
    } else {
      shareUrl = `${window.location.origin}${window.location.pathname}?product=${productIdentifier}`;
    }
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Regarde ce produit sur notre boutique : ${product.name}`,
          url: shareUrl,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Erreur de partage:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast.success("Lien copié dans le presse-papier !");
      } catch (err) {
        toast.error("Impossible de copier le lien");
      }
    }
  };

  useEffect(() => {
    if (open && product) {
      if (similarItems.length === 0) {
        fetchSimilarProducts();
      }
      
      // Track ViewContent
      trackMetaEvent('ViewContent', {
        content_ids: [product.id],
        content_type: 'product',
        content_name: product.name,
        value: price,
        currency: 'HTG',
      });
    }
  }, [open, product]);

  useEffect(() => {
    if (open) {
      setZoom(1);
      setPosition({ x: 0, y: 0 });
      setImageLoaded(false);
    }
  }, [product?.id, open]);

  const fetchSimilarProducts = async () => {
    setLoadingSimilar(true);
    try {
      const response = await base44.functions.invoke('getSimilarProducts', {
        product_id: product.id,
        category: product.category,
        limit: 6
      });
      
      if (response?.data?.data) {
        setSimilarItems(response.data.data);
      } else if (response?.data) {
        setSimilarItems(response.data);
      }
    } catch (error) {
      console.error("Erreur chargement similaires:", error);
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
    if (zoom >= 1.5) setPosition({ x: 0, y: 0 });
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 1));
    if (zoom <= 1.5) setPosition({ x: 0, y: 0 });
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleDownloadImage = async () => {
    if (!product.image_url) return;
    setDownloading(true);
    try {
      const response = await fetch(product.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `produit-${product.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("Image téléchargée avec succès");
    } catch (error) {
      toast.error("Erreur lors du téléchargement");
    } finally {
      setDownloading(false);
    }
  };

  const handleMouseDown = (e) => {
    if (zoom <= 1.5) return;
    setIsDragging(true);
    setStartPos({ x: e.clientX - position.x, y: e.clientY - position.y });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1.5) return;
    const newX = e.clientX - startPos.x;
    const newY = e.clientY - startPos.y;
    const containerRect = containerRef.current?.getBoundingClientRect();
    const imageRect = imageRef.current?.getBoundingClientRect();
    
    if (containerRect && imageRect) {
      const maxX = (imageRect.width - containerRect.width) / 2;
      const maxY = (imageRect.height - containerRect.height) / 2;
      setPosition({
        x: Math.max(-maxX, Math.min(maxX, newX)),
        y: Math.max(-maxY, Math.min(maxY, newY))
      });
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  useEffect(() => {
    if (zoom > 1.5) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, zoom]);

  if (!product) return null;
  
  const price = applyClientMargin(product.promo_price || product.price);

  const handleContactVendor = async () => {
    if (!user) return base44.auth.redirectToLogin(window.location.pathname);
    const vendorId = shop?.user_id || product?.vendor_id;
    const shopId = shop?.id;
    if (!vendorId || !shopId) return;

    setIsChatLoading(true);
    try {
      const response = await base44.functions.invoke('chatService', {
        action: 'init',
        vendor_id: vendorId,
        shop_id: shopId,
        shop_name: shop.company_name,
        shop_logo: shop.company_logo_url,
        product_id: product.id,
        product_name: product.name,
        initial_message: `Bonjour, je suis intéressé par : ${product.name}`
      });
      if (response?.id || response.data?.id) {
        window.location.href = `/chat?id=${response?.id || response.data.id}`;
      }
    } catch (error) {
      toast.error("Erreur lors de l'ouverture du chat");
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleSimilarProductClick = (similarProduct) => {
    if (onProductChange) {
      setSimilarItems([]);
      setQuantity(1);
      onProductChange(similarProduct);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white flex flex-col max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border-none">
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          <div 
            ref={containerRef}
            className="relative aspect-[4/3] sm:aspect-square w-full bg-slate-100 overflow-hidden cursor-move"
            onMouseDown={handleMouseDown}
          >
            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-200"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
              }}
            >
              <img 
                ref={imageRef}
                src={product.image_url} 
                alt={product.name} 
                className="max-w-full max-h-full object-contain transition-opacity duration-300"
                style={{ opacity: imageLoaded ? 1 : 0 }}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-slate-300" />
                </div>
              )}
            </div>

            <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors z-10">
              <X size={20} />
            </button>

            <button onClick={handleDownloadImage} disabled={downloading} className="absolute top-4 left-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors z-10">
              {downloading ? <Loader2 size={20} className="animate-spin" /> : <Download size={20} />}
            </button>

            {/* BOUTON PARTAGE AJOUTÉ ICI */}
            <button onClick={handleShare} className="absolute top-4 left-16 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors z-10">
              <Share2 size={20} />
            </button>

            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-black/20 backdrop-blur-md rounded-full p-1 z-10">
              <button onClick={handleZoomOut} disabled={zoom <= 1} className="p-2 rounded-full text-white hover:bg-white/20 disabled:opacity-40"><ZoomOut size={18} /></button>
              <button onClick={handleResetZoom} className="px-3 py-2 text-xs font-medium text-white">{Math.round(zoom * 100)}%</button>
              <button onClick={handleZoomIn} disabled={zoom >= 3} className="p-2 rounded-full text-white hover:bg-white/20 disabled:opacity-40"><ZoomIn size={18} /></button>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 leading-tight">{product.name}</h2>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-orange-500">{price.toLocaleString()} HTG</span>
                {product.promo_price && (
                  <span className="text-sm text-slate-400 line-through font-medium">
                    {applyClientMargin(product.price).toLocaleString()} HTG
                  </span>
                )}
              </div>
            </div>

            {product.description && (
              <div className="py-2 border-t border-slate-50">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Description</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>
              </div>
            )}

            {shop && (
              <div 
                onClick={() => {
                  if (shop.slug) {
                    window.location.href = `/shop-view?slug=${shop.slug}`;
                  } else {
                    window.location.href = `/shop-view?id=${shop.id}`;
                  }
                }}
                className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 flex-shrink-0">
                  {shop.company_logo_url ? (
                    <img src={shop.company_logo_url} className="w-full h-full object-cover" alt={shop.company_name} />
                  ) : (
                    <Store className="w-full h-full p-2 text-orange-600" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm text-slate-800 truncate hover:text-orange-600 transition-colors">{shop.company_name}</p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <MapPin size={10} /> {shop.region || 'Haïti'}
                  </p>
                </div>
                <ChevronRight size={16} className="text-slate-400" />
              </div>
            )}

            {similarItems.length > 0 && (
              <div className="py-4 border-t border-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Articles similaires ({similarItems.length})</h4>
                  {loadingSimilar && <Loader2 className="h-3 w-3 animate-spin text-slate-400" />}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {similarItems.map((similarProduct) => {
                    const similarPrice = applyClientMargin(similarProduct.promo_price || similarProduct.price);
                    return (
                      <button
                        key={similarProduct.id}
                        onClick={() => handleSimilarProductClick(similarProduct)}
                        className="group text-left bg-slate-50 hover:bg-slate-100 rounded-xl p-3 transition-all duration-200 active:scale-[0.98]"
                      >
                        <div className="aspect-square w-full bg-white rounded-lg overflow-hidden mb-2">
                          <img src={similarProduct.image_url} alt={similarProduct.name} className="w-full h-full object-contain group-hover:scale-105 transition-transform" />
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 truncate mb-1">{similarProduct.name}</h5>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-orange-500">{similarPrice.toLocaleString()} HTG</span>
                          <ChevronRight size={14} className="text-slate-400" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 bg-white border-t border-slate-100 space-y-3 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          {shop?.company_category === "Mariage" && (
            <Button onClick={() => window.open('https://wa.me/c/50948690366', '_blank')} className="w-full py-6 bg-[#25D366] hover:bg-[#1ebd57] text-white rounded-2xl mb-3">
              WhatsApp
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQuantity(Math.max(1, quantity - 1))}><Minus size={14} /></Button>
              <span className="font-black text-sm w-8 text-center">{quantity}</span>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setQuantity(quantity + 1)}><Plus size={14} /></Button>
            </div>
            <Button
              className="flex-1 py-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200"
              onClick={() => { 
                // Track AddToCart
                trackMetaEvent('AddToCart', {
                  content_ids: [product.id],
                  content_type: 'product',
                  content_name: product.name,
                  value: price * quantity,
                  currency: 'HTG',
                });

                onAddToCart(product, quantity); 
                onClose(); 
              }}
            >
              Ajouter au panier
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}