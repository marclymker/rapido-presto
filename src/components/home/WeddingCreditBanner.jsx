import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight } from 'lucide-react';

export default function WeddingCreditBanner() {
  const imageUrl = "/assets/wedding-credit.svg";

  return (
    <div className="relative overflow-hidden rounded-xl shadow-lg">
      {/* Background Image - Layer de base */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-100"
        style={{
          backgroundImage: `url('${imageUrl}')`,
          backgroundPosition: 'left center'
        }}
      />
      
      {/* Gradient Overlay - gradient doux pour la lisibilité */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/20 to-transparent" />
      
      {/* Content Container - Responsive */}
      <div className="relative px-6 md:px-8 py-8 md:py-12 flex flex-col justify-center min-h-[200px] md:min-h-[280px]">
        
        {/* Logo Rapido Presto */}
        <div className="mb-4 md:mb-6">
          <div className="text-amber-700 text-xs md:text-sm font-semibold tracking-widest">
            RAPIDO PRESTO
          </div>
        </div>

        {/* Main Heading */}
        <h2 className="text-white font-black text-xl md:text-3xl lg:text-4xl leading-tight mb-4 md:mb-6 max-w-lg">
          PEYE MARYAJ OU<br />
          <span className="text-amber-300">KREDI DEPI KOUNYA</span>
        </h2>

        {/* Offer Text */}
        <p className="text-white/90 text-sm md:text-base mb-6 md:mb-8 max-w-lg leading-relaxed">
          <span className="font-bold text-amber-300 text-base md:text-lg">1000 Gourdes Selman</span>
          <br />
          pou Rezève pou tout ane a
        </p>

        {/* CTA Button */}
        <div>
          <Button 
            className="bg-amber-400 hover:bg-amber-500 text-gray-900 font-bold text-sm md:text-base px-6 md:px-8 py-2 md:py-3 h-auto rounded-lg transition-all shadow-lg hover:shadow-xl group"
            onClick={() => {
              // Scroll to wedding category
              const weddingSection = document.querySelector('[data-wedding-section]');
              if (weddingSection) {
                weddingSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              // Dispatch event to navigate to wedding category
              window.dispatchEvent(new CustomEvent('selectCategory', { detail: 'Mariage' }));
            }}
          >
            REZÈVE KOUNYA
            <ChevronRight className="w-4 h-4 md:w-5 md:h-5 ml-2 group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute top-4 right-6 text-white/20 text-2xl md:text-3xl">💍</div>
        <div className="absolute bottom-4 left-6 text-white/20 text-2xl md:text-3xl">🌸</div>
      </div>
    </div>
  );
}
