import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';

const SITE_URL = 'https://makariosbridal.shop';

export default function Legal() {
  return (
    <main className="min-h-screen bg-white pb-24">
      <Helmet>
        <title>Mentions légales et conditions | Kairos Haïti</title>
        <meta name="description" content="Mentions légales, conditions d'utilisation et règles de confidentialité de Kairos, la plateforme haïtienne powered by makariosbridal.shop." />
        <link rel="canonical" href={`${SITE_URL}/Legal`} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Kairos — powered by makariosbridal.shop" />
        <meta property="og:title" content="Mentions légales et conditions | Kairos Haïti" />
        <meta property="og:description" content="Consultez les mentions légales, conditions d'utilisation et règles de confidentialité de Kairos en Haïti." />
        <meta property="og:url" content={`${SITE_URL}/Legal`} />
        <meta property="og:locale" content="fr_HT" />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content="Mentions légales | Kairos Haïti" />
        <meta name="twitter:description" content="Les règles d'utilisation de Kairos — powered by makariosbridal.shop." />
      </Helmet>

      <div className="mx-auto max-w-3xl px-6 py-12 text-gray-700">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">Kairos · Haïti</p>
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-gray-950">Mentions légales et conditions</h1>
        <p className="mb-10 text-sm text-gray-500">Dernière mise à jour : 4 octobre 2026</p>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-bold text-gray-950">1. Éditeur de la plateforme</h2>
          <p>Kairos est une plateforme numérique accessible à l'adresse <strong>{SITE_URL}</strong>, dédiée au commerce local, aux réservations, à la billetterie et à la messagerie en Haïti.</p>
          <p>Branding : <strong>Kairos — powered by makariosbridal.shop</strong>. Pour toute question, contactez-nous à <a className="text-blue-600 underline" href="mailto:support@makariosbridal.shop">support@makariosbridal.shop</a>.</p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-bold text-gray-950">2. Rôle de Kairos</h2>
          <p>Kairos met en relation des clients, vendeurs, restaurateurs, établissements d'hébergement, piscines, organisateurs d'événements et livreurs. Chaque vendeur reste responsable de ses produits, disponibilités, prix, descriptions, livraisons et obligations envers ses clients.</p>
          <p>Les annonces doivent être exactes, licites et exemptes de contrefaçon, contenu frauduleux ou activité interdite.</p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-bold text-gray-950">3. Compte et sécurité</h2>
          <p>L'utilisateur doit fournir des informations exactes, protéger ses moyens d'accès et signaler immédiatement toute utilisation non autorisée de son compte. Kairos peut limiter ou suspendre un compte présentant un risque de fraude, d'abus ou de sécurité.</p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-bold text-gray-950">4. Paiements, commandes et réservations</h2>
          <p>Les conditions propres à chaque commande, réservation ou billet sont présentées avant confirmation. Les paiements, annulations, remboursements et disponibilités peuvent dépendre du vendeur ou de l'établissement concerné.</p>
        </section>

        <section className="space-y-3 mb-8">
          <h2 className="text-xl font-bold text-gray-950">5. Données personnelles</h2>
          <p>Kairos traite uniquement les données nécessaires au fonctionnement du compte, aux commandes, réservations, communications, à la sécurité et à l'amélioration du service. Les utilisateurs peuvent demander des informations sur leurs données en écrivant à l'adresse de support.</p>
        </section>

        <section className="space-y-3 mb-10">
          <h2 className="text-xl font-bold text-gray-950">6. Propriété intellectuelle</h2>
          <p>Le nom Kairos, son interface, ses textes, éléments graphiques et logiciels sont protégés par les droits applicables. Les contenus publiés par les vendeurs restent sous leur responsabilité et ne doivent pas violer les droits de tiers.</p>
        </section>

        <div className="flex flex-wrap gap-3 border-t border-gray-200 pt-6">
          <Link to="/" className="rounded-lg bg-gray-950 px-5 py-3 text-sm font-semibold text-white hover:bg-gray-800">Retour à Kairos</Link>
          <Link to="/Contact" className="rounded-lg border border-gray-300 px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50">Contacter le support</Link>
        </div>
      </div>
    </main>
  );
}
