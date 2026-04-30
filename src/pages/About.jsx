import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

export default function About() {
  return (
    <div className="min-h-screen bg-white pb-24">
      <Helmet>
        <title>À propos de Rapido Presto | Livraison rapide en Haïti</title>
        <meta name="description" content="Découvrez Rapido Presto, la plateforme de livraison rapide et de marketplace en ligne dédiée à Haïti. Qui nous sommes, ce que nous faisons et pourquoi nous le faisons." />
      </Helmet>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">À propos de Rapido Presto</h1>

        <p className="text-gray-700 leading-relaxed mb-4">
          <strong>Rapido Presto</strong> est la première plateforme de marketplace et de livraison rapide conçue spécifiquement pour Haïti. Notre mission est simple : connecter les consommateurs haïtiens avec les meilleures boutiques locales, partout dans le pays, et leur permettre de recevoir leurs commandes rapidement et en toute sécurité.
        </p>

        <p className="text-gray-700 leading-relaxed mb-4">
          Que vous soyez à la recherche de vêtements, de bijoux, de produits alimentaires, de fleurs, de médicaments, ou encore d'articles pour votre mariage, Rapido Presto regroupe des centaines de boutiques locales sur une seule et même plateforme. Vous pouvez commander en quelques clics et être livré en 30 à 45 minutes dans certaines zones.
        </p>

        <p className="text-gray-700 leading-relaxed mb-4">
          La plateforme s'adresse à tous : aux particuliers qui souhaitent faire leurs achats depuis leur téléphone, aux entreprises qui veulent toucher plus de clients, et aux livreurs indépendants qui cherchent à générer un revenu flexible. Chaque acteur de l'économie locale peut trouver sa place sur Rapido Presto.
        </p>

        <p className="text-gray-700 leading-relaxed mb-4">
          Rapido Presto est développé par une équipe passionnée basée en Haïti, engagée à moderniser le commerce local grâce à la technologie. Nous croyons fermement que chaque entrepreneur haïtien mérite un outil puissant pour vendre ses produits, gérer ses commandes et développer son activité, sans barrière technique.
        </p>

        <p className="text-gray-700 leading-relaxed mb-4">
          Notre plateforme supporte plusieurs méthodes de paiement locales comme MonCash et NatCash, ainsi que le paiement en espèces à la livraison. Nous travaillons constamment à améliorer l'expérience de nos utilisateurs, d'ajouter de nouvelles fonctionnalités et d'étendre notre couverture géographique à travers tout le pays.
        </p>

        <p className="text-gray-700 leading-relaxed mb-6">
          Rejoignez les milliers d'Haïtiens qui font déjà confiance à Rapido Presto pour leurs achats quotidiens. Ensemble, construisons une économie locale plus forte et plus connectée.
        </p>

        <div className="flex gap-4">
          <Link to="/" className="px-5 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition">
            Explorer la marketplace
          </Link>
          <Link to="/Contact" className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-semibold text-sm hover:bg-gray-50 transition">
            Nous contacter
          </Link>
        </div>
      </div>
    </div>
  );
}