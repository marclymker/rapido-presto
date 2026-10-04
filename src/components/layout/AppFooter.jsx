import React from 'react';
import { Link } from 'react-router-dom';

export default function AppFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 px-6 text-center text-xs text-gray-400" role="contentinfo">
      <div className="flex justify-center gap-6 mb-2 flex-wrap">
        <Link to="/" className="hover:text-blue-600 transition font-medium min-h-11 inline-flex items-center" aria-label="Page d'accueil Marketplace">Marketplace</Link>
        <Link to="/About" className="hover:text-blue-600 transition font-medium min-h-11 inline-flex items-center" aria-label="À propos de Kairos">À propos</Link>
        <Link to="/Contact" className="hover:text-blue-600 transition font-medium min-h-11 inline-flex items-center" aria-label="Contacter Kairos">Contact</Link>
      </div>
      <p>© {new Date().getFullYear()} Kairos — Marketplace, réservations et billetterie en Haïti</p>
    </footer>
  );
}
