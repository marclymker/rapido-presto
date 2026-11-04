import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Store, Bike } from 'lucide-react';
import { toast } from "sonner";

export default function ReviewModal({ order, open, onClose, onSubmit }) {
  const [shopRating, setShopRating] = useState(0);
  const [deliveryRating, setDeliveryRating] = useState(0);
  const [comment, setComment] = useState('');
  const [hoveredShopStar, setHoveredShopStar] = useState(0);
  const [hoveredDeliveryStar, setHoveredDeliveryStar] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (shopRating === 0 || deliveryRating === 0) {
      toast.error('Veuillez donner une note à la boutique et au livreur');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit({
        shop_rating: shopRating,
        delivery_rating: deliveryRating,
        comment: comment.trim()
      });
      toast.success('Merci pour votre avis !');
      onClose();
      // Reset form
      setShopRating(0);
      setDeliveryRating(0);
      setComment('');
    } catch (error) {
      toast.error('Erreur lors de l\'envoi de l\'avis');
    }
    setIsSubmitting(false);
  };

  const StarRating = ({ rating, setRating, hovered, setHovered }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => setRating(star)}
          onMouseEnter={() => setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`w-8 h-8 ${
              star <= (hovered || rating)
                ? 'fill-orange-400 text-orange-400'
                : 'text-slate-300'
            }`}
          />
        </button>
      ))}
    </div>
  );

  if (!order) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Notez votre expérience</DialogTitle>
          <DialogDescription>
            Commande #{order.order_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Shop Rating */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Store className="w-5 h-5 text-orange-500" />
              <span className="font-medium">{order.shop_name}</span>
            </div>
            <StarRating
              rating={shopRating}
              setRating={setShopRating}
              hovered={hoveredShopStar}
              setHovered={setHoveredShopStar}
            />
          </div>

          {/* Delivery Rating */}
          {order.driver_name && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-slate-700">
                <Bike className="w-5 h-5 text-orange-500" />
                <span className="font-medium">Livraison - {order.driver_name}</span>
              </div>
              <StarRating
                rating={deliveryRating}
                setRating={setDeliveryRating}
                hovered={hoveredDeliveryStar}
                setHovered={setHoveredDeliveryStar}
              />
            </div>
          )}

          {/* Comment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Commentaire (optionnel)
            </label>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Partagez votre expérience..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1"
          >
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 bg-orange-500 hover:bg-orange-600"
          >
            {isSubmitting ? 'Envoi...' : 'Envoyer'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
