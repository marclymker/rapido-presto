import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function WeddingCreditBanner({ userId }) {
  const [isDismissed, setIsDismissed] = useState(false);
  const [shouldShow, setShouldShow] = useState(false);

  // Vérifier si l'utilisateur a montré de l'intérêt pour la catégorie Mariage
  const { data: activities = [] } = useQuery({
    queryKey: ['user-activities', userId],
    queryFn: () => base44.entities.UserActivity.filter({ user_id: userId }),
    enabled: !!userId,
  });

  useEffect(() => {
    // Vérifier si l'utilisateur a consulté des produits de mariage
    const hasWeddingInterest = activities.some(
      activity => activity.category === 'Mariage' || 
      (activity.activity_type === 'category_view' && activity.category === 'Mariage')
    );

    // Vérifier si la bannière a été fermée récemment
    const dismissedTime = localStorage.getItem('wedding_credit_banner_dismissed');
    const daysSinceDismissed = dismissedTime 
      ? (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24)
      : 999;

    // Afficher si intérêt pour mariage ET pas fermé depuis moins de 7 jours
    setShouldShow(hasWeddingInterest && daysSinceDismissed > 7);
  }, [activities]);

  const handleDismiss = () => {
    setIsDismissed(true);
    localStorage.setItem('wedding_credit_banner_dismissed', Date.now().toString());
  };

  if (!shouldShow || isDismissed) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="relative w-full overflow-hidden rounded-2xl shadow-2xl my-6"
      style={{
        background: 'linear-gradient(135deg, #faf8f6 0%, #f5f0eb 100%)'
      }}
    >
      {/* Bouton de fermeture discret */}
      <button
        onClick={handleDismiss}
        className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/80 hover:bg-white transition-all shadow-md"
      >
        <X className="w-4 h-4 text-gray-600" />
      </button>

      {/* Motifs décoratifs */}
      <div className="absolute top-0 right-0 w-64 h-64 opacity-5">
        <svg viewBox="0 0 200 200" className="w-full h-full">
          <path d="M100,20 L110,50 L140,50 L115,70 L125,100 L100,80 L75,100 L85,70 L60,50 L90,50 Z" fill="currentColor" className="text-rose-400" />
        </svg>
      </div>

      <div className="relative flex flex-col md:flex-row items-center gap-6 p-6 md:p-8">
        {/* Image de gauche */}
        <div className="w-full md:w-1/2 relative">
          <div className="relative overflow-hidden rounded-xl shadow-xl">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/694b478cc984102a3c47c781/a3b7d4346_file_00000000fb8071f7853e3497a634f6e71.png"
              alt="Mariée élégante"
              className="w-full h-auto object-cover"
            />
            
            {/* Badge promo sur l'image */}
            <div className="absolute bottom-4 left-4 bg-gradient-to-r from-amber-500 to-amber-600 text-white px-4 py-2 rounded-full shadow-lg">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span className="font-bold text-sm">10% OFF</span>
              </div>
            </div>
          </div>

          {/* Éléments décoratifs floraux */}
          <div className="absolute -top-4 -left-4 w-16 h-16 opacity-20">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <circle cx="50" cy="50" r="40" fill="#d4a373" />
            </svg>
          </div>
        </div>

        {/* Contenu textuel à droite */}
        <div className="w-full md:w-1/2 text-center md:text-left space-y-6 px-4 md:px-8">
          {/* Logo/Branding */}
          <div className="flex items-center justify-center md:justify-start gap-3 mb-4">
            <div className="w-10 h-10 text-amber-600">
              <svg viewBox="0 0 100 100" className="w-full h-full" fill="currentColor">
                <path d="M50,10 L55,30 L75,30 L60,45 L65,65 L50,50 L35,65 L40,45 L25,30 L45,30 Z" />
              </svg>
            </div>
            <span className="text-lg font-serif text-amber-800 tracking-wide">RAPIDO PRESTO</span>
          </div>

          {/* Titre principal */}
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold leading-tight" style={{
            color: '#8b6d47',
            fontFamily: 'Georgia, serif',
            textShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            PEYE MARYAJ OU<br/>
            KREDI DEPI KOUNYA
          </h2>

          {/* Sous-titre avec mise en évidence du prix */}
          <div className="space-y-2">
            <p className="text-xl md:text-2xl text-gray-700 font-light">
              <span className="text-3xl md:text-4xl font-bold text-amber-600">1000 Gourdes</span> Selman
            </p>
            <p className="text-lg text-gray-600 font-light">
              poir Resève pou tout ane a
            </p>
          </div>

          {/* Bouton CTA */}
          <Link to={createPageUrl('Products') + '?category=Mariage'}>
            <Button 
              size="lg"
              className="w-full md:w-auto px-8 py-6 text-lg font-semibold rounded-full shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
              style={{
                background: 'linear-gradient(135deg, #d4a373 0%, #b8956a 100%)',
                color: 'white'
              }}
            >
              <Sparkles className="w-5 h-5 mr-2" />
              REZÈVE KOUNYA
            </Button>
          </Link>

          {/* Petite note */}
          <p className="text-xs text-gray-500 italic mt-4">
            * Offre valable pour tous les articles de la catégorie Mariage
          </p>
        </div>
      </div>

      {/* Décoration florale en bas à droite */}
      <div className="absolute bottom-0 right-0 w-32 h-32 opacity-10">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="20" cy="80" r="15" fill="#d4a373" />
          <circle cx="50" cy="85" r="12" fill="#d4a373" />
          <circle cx="75" cy="82" r="10" fill="#d4a373" />
        </svg>
      </div>
    </motion.div>
  );
}