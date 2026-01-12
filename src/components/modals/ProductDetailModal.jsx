import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Minus, Plus, Store, MessageSquare, Loader2, MapPin, X, ChevronRight, ZoomIn, ZoomOut, Download, RotateCcw } from 'lucide-react';
import { applyClientMargin } from '@/components/utils/priceCalculation';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function ProductDetailModal({ product, shop, open, onClose, onAddToCart, user, similarProducts = [] }) {
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

  // Si similarProducts n'est pas fourni, on peut les charger
  useEffect(() => {
    if (open && product && similarItems.length === 0) {
      fetchSimilarProducts();
    }
  }, [open, product]);

  // Réinitialiser le zoom quand le produit change
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
      // Silencieux - pas de toast pour ne pas perturber l'UX
    } finally {
      setLoadingSimilar(false);
    }
  };

  const handleZoomIn = () => {
    setZoom(prev => Math.min(prev + 0.25, 3));
    if (zoom >= 1.5) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(prev - 0.25, 1));
    if (zoom <= 1.5) {
      setPosition({ x: 0, y: 0 });
    }
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
      console.error("Erreur lors du téléchargement:", error);
      toast.error("Erreur lors du téléchargement de l'image");
    } finally {
      setDownloading(false);
    }
  };

  // Gestion du drag pour le zoom
  const handleMouseDown = (e) => {
    if (zoom <= 1.5) return;
    
    setIsDragging(true);
    setStartPos({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
    e.preventDefault();
  };

  const handleMouseMove = (e) => {
    if (!isDragging || zoom <= 1.5) return;
    
    const newX = e.clientX - startPos.x;
    const newY = e.clientY - startPos.y;
    
    // Limiter le déplacement aux bords de l'image
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

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Gestion du zoom avec la molette
  const handleWheel = (e) => {
    if (!containerRef.current?.contains(e.target)) return;
    
    e.preventDefault();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  };

  useEffect(() => {
    if (zoom > 1.5) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('wheel', handleWheel, { passive: false });
    }
    
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('wheel', handleWheel);
    };
  }, [isDragging, zoom]);

  if (!product) return null;
  
  const price = applyClientMargin(product.promo_price || product.price);

  const handleContactVendor = async () => {
    if (!user) return base44.auth.redirectToLogin(window.location.pathname);
    const vendorId = shop?.user_id || product?.vendor_id;
    const shopId = shop?.id;

    if (!vendorId || !shopId) {
      alert("Données incomplètes.");
      return;
    }

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
    // Réinitialiser et ouvrir le nouveau produit
    setSimilarItems([]);
    setQuantity(1);
    window.location.href = `/?product=${similarProduct.id}`;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-0 overflow-hidden bg-white flex flex-col max-h-[92vh] sm:max-h-[85vh] rounded-t-3xl sm:rounded-3xl border-none">
        {/* HEADER AVEC IMAGE (Scrollable) */}
        <div className="overflow-y-auto flex-1 custom-scrollbar">
          {/* Conteneur image avec contrôles de zoom */}
          <div 
            ref={containerRef}
            className="relative aspect-[4/3] sm:aspect-square w-full bg-slate-100 overflow-hidden cursor-move"
            onMouseDown={handleMouseDown}
          >
            <div 
              className="w-full h-full flex items-center justify-center transition-transform duration-200"
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
                cursor: zoom > 1.5 ? 'move' : 'default'
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

            {/* Bouton fermer */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors z-10"
            >
              <X size={20} />
            </button>

            {/* Bouton téléchargement */}
            <button
              onClick={handleDownloadImage}
              disabled={downloading}
              className="absolute top-4 left-4 p-2 bg-black/20 backdrop-blur-md rounded-full text-white hover:bg-black/40 transition-colors z-10"
              title="Télécharger l'image"
            >
              {downloading ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <Download size={20} />
              )}
            </button>

            {/* Contrôles de zoom en bas */}
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex items-center gap-1 bg-black/20 backdrop-blur-md rounded-full p-1 z-10">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                className="p-2 rounded-full text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom arrière"
              >
                <ZoomOut size={18} />
              </button>
              
              <button
                onClick={handleResetZoom}
                className="px-3 py-2 text-xs font-medium text-white"
                title="Réinitialiser le zoom"
              >
                {Math.round(zoom * 100)}%
              </button>
              
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 3}
                className="p-2 rounded-full text-white hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed"
                title="Zoom avant"
              >
                <ZoomIn size={18} />
              </button>
              
              {zoom > 1 && (
                <button
                  onClick={handleResetZoom}
                  className="p-2 rounded-full text-white hover:bg-white/20 ml-1"
                  title="Réinitialiser"
                >
                  <RotateCcw size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Titre et Prix */}
            <div className="space-y-1">
              <h2 className="text-xl font-black text-slate-900 leading-tight">{product.name}</h2>
              <div className="flex items-center gap-3">
                <span className="text-2xl font-black text-orange-500">{price} HTG</span>
                {product.promo_price && (
                  <span className="text-sm text-slate-400 line-through font-medium">
                    {applyClientMargin(product.price)} HTG
                  </span>
                )}
              </div>
            </div>

            {/* Description - Limitée visuellement mais scrollable */}
            {product.description && (
              <div className="py-2 border-t border-slate-50">
                <h4 className="text-[10px] uppercase tracking-widest font-bold text-slate-400 mb-2">Description</h4>
                <p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Boutique - Plus compacte */}
            {shop && (
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                <div className="w-10 h-10 rounded-full overflow-hidden bg-orange-100 flex-shrink-0">
                  {shop.company_logo_url ? (
                    <img src={shop.company_logo_url} className="w-full h-full object-cover" alt={shop.company_name} />
                  ) : (
                    <Store className="w-full h-full p-2 text-orange-600" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-sm text-slate-800 truncate">{shop.company_name}</p>
                  <p className="text-[10px] text-slate-500 flex items-center gap-1">
                    <MapPin size={10} /> {shop.region || 'Haïti'}
                  </p>
                </div>
              </div>
            )}

            {/* SECTION ARTICLES SIMILAIRES */}
            {similarItems.length > 0 && (
              <div className="py-4 border-t border-slate-50">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-[10px] uppercase tracking-widest font-bold text-slate-400">
                    Articles similaires ({similarItems.length})
                  </h4>
                  {loadingSimilar && (
                    <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                  )}
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
                          <img 
                            src={similarProduct.image_url} 
                            alt={similarProduct.name}
                            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                        <h5 className="text-xs font-bold text-slate-800 truncate mb-1">
                          {similarProduct.name}
                        </h5>
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-black text-orange-500">
                            {similarPrice} HTG
                          </span>
                          <ChevronRight size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {loadingSimilar && similarItems.length === 0 && (
              <div className="py-6 border-t border-slate-50">
                <div className="flex justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ACTIONS FIXÉES EN BAS (Sticky Footer) */}
        <div className="p-4 bg-white border-t border-slate-100 space-y-3 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
          <div className="flex gap-2">
            <Button
              onClick={handleContactVendor}
              disabled={isChatLoading}
              variant="outline"
              className="flex-1 py-6 border-slate-200 rounded-2xl hover:bg-slate-50"
            >
              {isChatLoading ? <Loader2 className="animate-spin" /> : <MessageSquare size={18} className="mr-2 text-orange-500" />}
              Chat
            </Button>

            {shop?.company_category === "Mariage" && (
              <Button
                onClick={() => window.open('https://wa.me/c/50948690366', '_blank')}
                className="flex-1 py-6 bg-[#25D366] hover:bg-[#1ebd57] text-white rounded-2xl"
              >
                WhatsApp
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Sélecteur de quantité compact */}
            <div className="flex items-center bg-slate-100 rounded-xl p-1">
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus size={14} />
              </Button>
              <span className="font-black text-sm w-8 text-center">{quantity}</span>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8 rounded-lg"
                onClick={() => setQuantity(quantity + 1)}
              >
                <Plus size={14} />
              </Button>
            </div>

            {/* Bouton Panier Principal */}
            <Button
              className="flex-1 py-6 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-2xl shadow-lg shadow-orange-200 transition-all active:scale-95"
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