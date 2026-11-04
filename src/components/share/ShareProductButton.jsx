import React from 'react';
import { Button } from '@/components/ui/button';
import { Share2 } from 'lucide-react';
import { toast } from 'sonner';
import { getProductShareUrl } from '@/lib/productShareUrl';

export default function ShareProductButton({ product, shop, className = '' }) {
  const handleShare = async () => {
    const shareProduct = product ? { ...product, shop_slug: shop?.slug } : null;
    const shareUrl = getProductShareUrl(shareProduct, window.location.origin);
    const shareText = product ? `${product.name} - ${shop?.company_name || 'Kairos'}` : shop?.company_name || 'Kairos';

    if (navigator.share) {
      try {
        await navigator.share({ title: shareText, text: 'Découvre ce produit sur Kairos', url: shareUrl });
        return;
      } catch (error) {
        if (error.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Lien copié ! Collez-le sur WhatsApp pour voir l’aperçu');
    } catch {
      toast.error('Impossible de copier le lien');
    }
  };

  return <Button onClick={handleShare} variant="outline" size="sm" className={className}>
    <Share2 className="w-4 h-4 mr-2" />Partager
  </Button>;
}
