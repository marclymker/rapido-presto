import React from 'react';
import { Link } from 'react-router-dom';

export default function AppFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 px-6 text-center text-xs text-gray-400" role="contentinfo">
      <div className="flex justify-center gap-6 mb-2 flex-wrap">
        <Link to="/" className="hover:text-blue-600 transition font-medium min-h-11 inline-flex items-center" aria-label="Accueil Kairos">Kairos</Link>
        <Link to="/About" className="hover:text-blue-600 transition font-medium min-h-11 inline-flex items-center" aria-label="À propos de Kairos">À propos</Link>
        <Link to="/Contact" className="hover:text-blue-600 transition font-medium min-h-11 inline-flex items-center" aria-label="Contacter Kairos">Contact</Link>
        <Link to="/Legal" className="hover:text-blue-600 transition font-medium min-h-11 inline-flex items-center" aria-label="Mentions légales et conditions de Kairos">Mentions légales</Link>
      </div>
      <p>© {new Date().getFullYear()} Kairos — Achetez. Réservez. Participez.</p>
      <p className="mt-1 font-medium text-gray-500">Marketplace · Hôtels &amp; Piscines · Billetterie · Chat</p>
      <p className="mt-1 text-gray-500">powered by <a href="https://makariosbridal.shop" className="hover:text-blue-600 transition">makariosbridal.shop</a></p>
    </footer>
  );
}
