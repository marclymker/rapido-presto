import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Briefcase, PartyPopper, GraduationCap, Baby } from 'lucide-react';

export default function EventPlannerHaiti() {
  return (
    <>
      <Helmet>
        <title>Event Planner Haïti - Organisation Événements Corporatifs & Privés | Port-au-Prince</title>
        <meta 
          name="description" 
          content="Event planner professionnel en Haïti. Organisation événements corporatifs, conférences, anniversaires, baby showers à Port-au-Prince, Pétion-Ville. Planification complète." 
        />
        <meta name="keywords" content="event planner haiti, organisation événement haiti, event planner port-au-prince, événement corporatif haiti, anniversaire, baby shower, graduation" />
        <link rel="canonical" href="https://rapidopresto.shop/event-planner-haiti" />
      </Helmet>

      <article className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
        <header className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl font-black mb-6">Event Planner en Haïti 🎉</h1>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Organisation professionnelle d'événements corporatifs et privés en Haïti. Conférences, séminaires, anniversaires, 
              baby showers, graduations à Port-au-Prince et Pétion-Ville.
            </p>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Demander un Devis Gratuit
            </Button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-12">
          <section className="prose prose-lg max-w-none mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Event Planner : Votre Partenaire pour Événements Réussis en Haïti
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Un <strong>event planner</strong> (organisateur d'événements) est un professionnel qui conçoit, planifie et coordonne 
              tous types d'événements : corporatifs (conférences, séminaires, lancements produits) et privés (anniversaires, 
              baby showers, graduations, fêtes familiales).
            </p>
            <p className="text-gray-700 leading-relaxed">
              En Haïti, notamment à <strong>Port-au-Prince</strong> et <strong>Pétion-Ville</strong>, les entreprises et particuliers 
              font de plus en plus appel à des event planners pour garantir le succès de leurs événements. L'expertise locale, 
              la connaissance des prestataires, et la gestion logistique sont essentielles dans le contexte haïtien.
            </p>
          </section>

          {/* Types d'événements */}
          <section className="mb-12 bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Types d'Événements Organisés en Haïti
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                <Briefcase className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold mb-3">Événements Corporatifs</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Conférences et séminaires</li>
                  <li>• Lancements de produits</li>
                  <li>• Team building</li>
                  <li>• Formations professionnelles</li>
                  <li>• Galas d'entreprise</li>
                  <li>• Cocktails networking</li>
                </ul>
              </div>

              <div className="bg-pink-50 rounded-lg p-6 border-2 border-pink-200">
                <PartyPopper className="w-12 h-12 text-pink-600 mb-4" />
                <h3 className="text-xl font-bold mb-3">Anniversaires</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Anniversaires enfants (thématiques)</li>
                  <li>• Anniversaires adultes</li>
                  <li>• Anniversaires milestone (30, 40, 50 ans)</li>
                  <li>• Sweet 16 / Quinceañera</li>
                  <li>• Anniversaires surprise</li>
                </ul>
              </div>

              <div className="bg-purple-50 rounded-lg p-6 border-2 border-purple-200">
                <Baby className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-bold mb-3">Baby Showers & Baptêmes</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Baby showers élégants</li>
                  <li>• Gender reveal parties</li>
                  <li>• Baptêmes et communions</li>
                  <li>• Fêtes de naissance</li>
                  <li>• Décoration thématique bébé</li>
                </ul>
              </div>

              <div className="bg-green-50 rounded-lg p-6 border-2 border-green-200">
                <GraduationCap className="w-12 h-12 text-green-600 mb-4" />
                <h3 className="text-xl font-bold mb-3">Graduations & Célébrations</h3>
                <ul className="space-y-2 text-gray-700 text-sm">
                  <li>• Cérémonies de graduation</li>
                  <li>• Fêtes de fin d'études</li>
                  <li>• Promotions professionnelles</li>
                  <li>• Retraites</li>
                  <li>• Célébrations familiales</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Process */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Notre Processus d'Organisation d'Événements
            </h2>

            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-600">
                <div className="flex items-start gap-4">
                  <div className="bg-blue-600 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Consultation Initiale</h3>
                    <p className="text-gray-700">
                      Rencontre pour comprendre votre vision, objectifs, budget, nombre d'invités, date souhaitée. 
                      Définition claire des attentes.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-600">
                <div className="flex items-start gap-4">
                  <div className="bg-purple-600 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Conception & Planification</h3>
                    <p className="text-gray-700">
                      Création du concept, thème, ambiance. Élaboration du plan détaillé : lieu, décoration, traiteur, 
                      animations, timeline.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-green-600">
                <div className="flex items-start gap-4">
                  <div className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Coordination Prestataires</h3>
                    <p className="text-gray-700">
                      Sélection et négociation avec prestataires vérifiés : lieux, traiteurs, DJ, photographes, décorateurs. 
                      Gestion contrats.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-600">
                <div className="flex items-start gap-4">
                  <div className="bg-orange-600 text-white w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 font-bold">4</div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">Exécution Jour J</h3>
                    <p className="text-gray-700">
                      Coordination sur place : installation, gestion prestataires, respect timing, résolution imprévus. 
                      Vous profitez sans stress.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Prix */}
          <section className="mb-12 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Tarifs Event Planner en Haïti
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold mb-4">Événements Corporatifs</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Petite conférence (20-50 pers) :</strong> 30,000 - 80,000 HTG</li>
                  <li><strong>Séminaire (50-150 pers) :</strong> 80,000 - 200,000 HTG</li>
                  <li><strong>Grand événement (150+ pers) :</strong> 200,000 - 500,000+ HTG</li>
                </ul>
              </div>

              <div className="bg-white rounded-lg p-6 shadow-sm">
                <h3 className="text-xl font-bold mb-4">Événements Privés</h3>
                <ul className="space-y-2 text-gray-700">
                  <li><strong>Anniversaire (30-50 pers) :</strong> 20,000 - 60,000 HTG</li>
                  <li><strong>Baby shower :</strong> 15,000 - 50,000 HTG</li>
                  <li><strong>Graduation :</strong> 25,000 - 80,000 HTG</li>
                </ul>
              </div>
            </div>

            <p className="text-sm text-gray-600 mt-4">
              * Prix indicatifs. Devis personnalisé selon vos besoins spécifiques.
            </p>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-blue-600 to-cyan-600 rounded-lg p-8 text-center text-white mb-12">
            <h2 className="text-3xl font-bold mb-4">
              Organisez Votre Prochain Événement avec Nous
            </h2>
            <p className="text-lg mb-6 max-w-2xl mx-auto">
              Event planner professionnel à Port-au-Prince et Pétion-Ville. Événements corporatifs et privés clé en main.
            </p>
            <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
              Demander un Devis Gratuit →
            </Button>
          </section>

          {/* Liens */}
          <section className="bg-gray-50 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-4">Services Connexes :</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <a href="/wedding-planner-haiti" className="text-blue-600 hover:underline">→ Wedding Planner</a>
              <a href="/decoration-mariage-haiti" className="text-blue-600 hover:underline">→ Décoration Événements</a>
              <a href="/organisation-mariage-port-au-prince" className="text-blue-600 hover:underline">→ Organisation Mariage</a>
              <a href="/blog" className="text-blue-600 hover:underline">→ Blog Événementiel</a>
            </div>
          </section>
        </div>
      </article>
    </>
  );
}
