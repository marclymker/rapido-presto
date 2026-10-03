import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Bouton de partage avec lien public stable, compatible WhatsApp/Facebook.
 */
export default function ShareProductButton({ product, shop, className = "" }) {
  const handleShare = async () => {
    const shareUrl = product
      ? `${window.location.origin}/product/${encodeURIComponent(product.slug || product.id)}`
      : `${window.location.origin}/ShopView?slug=${encodeURIComponent(shop.slug || shop.id)}`;

    const shareText = product
      ? `${product.name} - ${shop.company_name}`
      : shop.company_name;

    // Utiliser l'API native de partage si disponible
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareText,
          text: `Découvre ce produit sur Rapido Presto`,
          url: shareUrl,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Erreur de partage:', error);
          copyToClipboard(shareUrl);
        }
      }
    } else {
      // Fallback : copier dans le presse-papier
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lien copié ! Collez-le sur WhatsApp pour voir l'aperçu");
    } catch (err) {
      toast.error("Impossible de copier le lien");
    }
  };

  return (
    <Button
      onClick={handleShare}
      variant="outline"
      size="sm"
      className={className}
    >
      <Share2 className="w-4 h-4 mr-2" />
      Partager
    </Button>
  );
}
