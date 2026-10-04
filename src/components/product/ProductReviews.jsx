import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Star } from 'lucide-react';
import { toast } from 'sonner';

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map(n => (
        <button key={n} type="button" onMouseEnter={() => setHovered(n)} onMouseLeave={() => setHovered(0)} onClick={() => onChange(n)}>
          <Star className="w-6 h-6 transition-colors" fill={(hovered || value) >= n ? '#F59E0B' : 'none'} stroke={(hovered || value) >= n ? '#F59E0B' : '#9CA3AF'} />
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating, size = 14 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star key={n} style={{ width: size, height: size }} fill={rating >= n ? '#F59E0B' : 'none'} stroke={rating >= n ? '#F59E0B' : '#D1D5DB'} />
      ))}
    </div>
  );
}

export default function ProductReviews({ productId, productName }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [showForm, setShowForm] = useState(false);

  const { data: reviews = [] } = useQuery({
    queryKey: ['reviews', productId],
    queryFn: () => base44.entities.ProductReview.filter({ product_id: productId, is_approved: true }),
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });

  const avgRating = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) : 0;

  const submitMutation = useMutation({
    mutationFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.ProductReview.create({
        product_id: productId,
        user_name: user?.full_name || 'Client anonyme',
        rating,
        comment: comment.trim(),
        is_approved: true,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['reviews', productId]);
      setRating(0); setComment(''); setShowForm(false);
      toast.success('Merci pour votre avis !');
    },
    onError: () => toast.error('Erreur lors de l\'envoi'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!rating) { toast.error('Veuillez choisir une note'); return; }
    submitMutation.mutate();
  };

  // Aggregate rating JSON-LD (injecté ici, consommé par le parent via prop ou directement)
  return (
    <div className="bg-white mt-2 px-4 py-4 shadow-sm">
      {/* Résumé */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-gray-900">Avis clients</h2>
        {reviews.length > 0 && (
          <div className="flex items-center gap-1.5">
            <StarDisplay rating={Math.round(avgRating)} />
            <span className="text-xs font-bold text-amber-500">{avgRating.toFixed(1)}</span>
            <span className="text-xs text-gray-400">({reviews.length})</span>
          </div>
        )}
      </div>

      {/* Liste avis (max 3 sans scroll) */}
      {reviews.length === 0 && !showForm && (
        <p className="text-xs text-gray-400 mb-3">Aucun avis pour le moment. Soyez le premier !</p>
      )}
      <div className="space-y-3 mb-3">
        {reviews.slice(0, 3).map(r => (
          <div key={r.id} className="border-b border-gray-100 pb-2 last:border-0">
            <div className="flex items-center gap-2 mb-0.5">
              <StarDisplay rating={r.rating} size={12} />
              <span className="text-xs font-semibold text-gray-700">{r.user_name}</span>
            </div>
            {r.comment && <p className="text-xs text-gray-500 leading-relaxed">{r.comment}</p>}
          </div>
        ))}
      </div>

      {/* Formulaire */}
      {showForm ? (
        <form onSubmit={handleSubmit} className="border-t border-gray-100 pt-3 space-y-2">
          <StarPicker value={rating} onChange={setRating} />
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder="Votre avis (optionnel)..."
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none outline-none focus:border-blue-400"
          />
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg">Annuler</button>
            <button type="submit" disabled={submitMutation.isPending || !rating} className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 rounded-lg disabled:opacity-50">
              {submitMutation.isPending ? 'Envoi...' : 'Publier'}
            </button>
          </div>
        </form>
      ) : (
        <button onClick={() => setShowForm(true)} className="text-xs font-semibold text-blue-600 hover:underline">
          + Laisser un avis
        </button>
      )}
    </div>
  );
}

export { StarDisplay };
export function getAvgRating(reviews) {
  if (!reviews?.length) return null;
  return reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
}
