import React from 'react';
import { Link } from 'react-router-dom';

export default function AppFooter() {
  return (
    <footer className="bg-white border-t border-gray-200 py-6 px-6 text-center text-xs text-gray-400">
      <div className="flex justify-center gap-6 mb-2 flex-wrap">
        <Link to="/" className="hover:text-blue-600 transition font-medium">Marketplace</Link>
        <Link to="/About" className="hover:text-blue-600 transition font-medium">À propos</Link>
        <Link to="/Contact" className="hover:text-blue-600 transition font-medium">Contact</Link>
      </div>
      <p>© {new Date().getFullYear()} Rapido Presto — Livraison rapide en Haïti</p>
    </footer>
  );
}