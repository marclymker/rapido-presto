import React from 'react';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Check, Calendar, Users, Heart, Phone, Mail, MapPin } from 'lucide-react';

export default function WeddingPlannerHaiti() {
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    "serviceType": "Wedding Planning",
    "provider": {
      "@type": "Organization",
      "name": "Rapido Presto Wedding Services",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Port-au-Prince",
        "addressCountry": "HT"
      },
      "areaServed": ["Port-au-Prince", "Pétion-Ville", "Cap-Haïtien", "Gonaïves"]
    },
    "offers": [
      {
        "@type": "Offer",
        "name": "Planification Complète",
        "description": "Organisation complète de votre mariage de A à Z"
      },
      {
        "@type": "Offer",
        "name": "Coordination Jour J",
        "description": "Coordination le jour du mariage uniquement"
      },
      {
        "@type": "Offer",
        "name": "Consultation",
        "description": "Conseils et recommandations personnalisées"
      }
    ]
  };

  return (
    <>
      <Helmet>
        <title>Wedding Planner Haïti - Organisation Mariage Port-au-Prince | Pétion-Ville</title>
        <meta
          name="description"
          content="Wedding planner professionnel en Haïti. Organisation complète de mariage à Port-au-Prince, Pétion-Ville, Cap-Haïtien. Planification, coordination, décoration. Devis gratuit."
        />
        <meta
          name="keywords"
          content="wedding planner haiti, organisation mariage haiti, wedding planner port-au-prince, coordinateur mariage pétion-ville, planificateur mariage haiti, event planner mariage"
        />
        <link rel="canonical" href="https://rapidopresto.shop/wedding-planner-haiti" />

        <script type="application/ld+json">
          {JSON.stringify(serviceSchema)}
        </script>
      </Helmet>

      <article className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
        <header className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white py-20 px-4">
          <div className="max-w-5xl mx-auto text-center">
            <h1 className="text-5xl font-black mb-6">
              Wedding Planner en Haïti 💍
            </h1>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Organisez le mariage de vos rêves avec les meilleurs wedding planners d'Haïti.
              Planification complète, coordination jour J, décoration à Port-au-Prince, Pétion-Ville et partout en Haïti.
            </p>
            <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
              <Phone className="w-4 h-4 mr-2" />
              Demander un Devis Gratuit
            </Button>
          </div>
        </header>

        <div className="max-w-5xl mx-auto px-4 py-12">
          <section className="prose prose-lg max-w-none mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Qu'est-ce qu'un Wedding Planner ?
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Un <strong>wedding planner</strong> (ou organisateur de mariage) est un professionnel qui coordonne tous les aspects
              de votre mariage, de la planification initiale jusqu'au jour J. En Haïti, particulièrement à <strong>Port-au-Prince</strong>
              et <strong>Pétion-Ville</strong>, les wedding planners sont de plus en plus sollicités pour créer des célébrations
              mémorables et sans stress.
            </p>
            <p className="text-gray-700 leading-relaxed mb-4">
              Le wedding planner haïtien connaît parfaitement les traditions locales, les meilleurs fournisseurs, les salles de réception,
              les traiteurs, les décorateurs, les photographes, et peut négocier les meilleurs tarifs pour vous. C'est votre allié principal
              pour transformer votre vision en réalité.
            </p>
          </section>

          {/* Services */}
          <section className="mb-12 bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Nos Services de Wedding Planning en Haïti
            </h2>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="bg-purple-50 rounded-lg p-6 border-2 border-purple-200">
                <Calendar className="w-12 h-12 text-purple-600 mb-4" />
                <h3 className="text-xl font-bold mb-3">Planification Complète</h3>
                <p className="text-gray-700 mb-4">
                  Organisation de A à Z : budget, prestataires, chronologie, décoration, coordination totale.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Gestion budget et timeline</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Sélection fournisseurs</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Design & décoration</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span>Coordination jour J</span>
                  </li>
                </ul>
              </div>

              <div className="bg-pink-50 rounded-lg p-6 border-2 border-pink-200">
                <Heart className="w-12 h-12 text-pink-600 mb-4" />
                <h3 className="text-xl font-bold mb-3">Coordination Jour J</h3>
                <p className="text-gray-700 mb-4">
                  Supervision le jour du mariage pour garantir que tout se déroule parfaitement.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-pink-600 flex-shrink-0 mt-0.5" />
                    <span>Gestion prestataires</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-pink-600 flex-shrink-0 mt-0.5" />
                    <span>Respect timing cérémonie</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-pink-600 flex-shrink-0 mt-0.5" />
                    <span>Résolution problèmes</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-pink-600 flex-shrink-0 mt-0.5" />
                    <span>Support mariés</span>
                  </li>
                </ul>
              </div>

              <div className="bg-blue-50 rounded-lg p-6 border-2 border-blue-200">
                <Users className="w-12 h-12 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold mb-3">Consultation & Conseils</h3>
                <p className="text-gray-700 mb-4">
                  Conseils personnalisés, recommandations de prestataires, aide à la décision.
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Consultation initiale</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Liste prestataires vérifiés</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Optimisation budget</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span>Planning personnalisé</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Pourquoi un Wedding Planner */}
          <section className="mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Pourquoi Faire Appel à un Wedding Planner en Haïti ?
            </h2>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold text-purple-600 mb-3">💰 Économie de Temps & Argent</h3>
                <p className="text-gray-700">
                  Un wedding planner négocie les meilleurs tarifs grâce à son réseau de partenaires. Il évite les erreurs coûteuses
                  et optimise votre budget. Gain de temps : vous déléguez la logistique complexe.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold text-purple-600 mb-3">🎯 Expertise Locale</h3>
                <p className="text-gray-700">
                  Connaissance approfondie du marché haïtien : meilleurs lieux (Pétion-Ville, Boutilliers), prestataires fiables,
                  respect traditions, gestion logistique spécifique à Haïti (électricité, transport, etc.).
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold text-purple-600 mb-3">😌 Réduction du Stress</h3>
                <p className="text-gray-700">
                  Planifier un mariage est stressant. Le wedding planner gère tout : contrats, suivis, imprévus. Vous profitez
                  pleinement de vos fiançailles et de votre jour J sans soucis.
                </p>
              </div>

              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-xl font-bold text-purple-600 mb-3">✨ Créativité & Vision</h3>
                <p className="text-gray-700">
                  Transformation de vos idées en concept cohérent. Design décoration, ambiance, thème : le planner crée une expérience
                  unique qui vous ressemble et marque les esprits.
                </p>
              </div>
            </div>
          </section>

          {/* Prix */}
          <section className="mb-12 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Prix Wedding Planner en Haïti (2026)
            </h2>

            <div className="bg-white rounded-lg p-6 shadow-sm mb-6">
              <h3 className="text-xl font-bold mb-4">Tarifs Moyens à Port-au-Prince / Pétion-Ville :</h3>
              <ul className="space-y-3 text-gray-700">
                <li><strong>Planification Complète :</strong> 80,000 - 300,000 HTG (selon ampleur)</li>
                <li><strong>Coordination Jour J seulement :</strong> 25,000 - 80,000 HTG</li>
                <li><strong>Consultation / Conseils :</strong> 10,000 - 30,000 HTG</li>
                <li><strong>Forfait Décoration :</strong> 50,000 - 200,000+ HTG</li>
              </ul>
            </div>

            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <p className="text-gray-800">
                <strong>💡 Conseil :</strong> Le coût d'un wedding planner représente généralement 10-15% du budget total mariage,
                mais permet d'économiser 15-20% grâce aux négociations et évite les erreurs coûteuses.
              </p>
            </div>
          </section>

          {/* Zones géographiques */}
          <section className="mb-12 bg-white rounded-lg shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Wedding Planner par Région en Haïti
            </h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Port-au-Prince</h3>
                  <p className="text-gray-700">
                    Concentration de wedding planners professionnels. Accès à tous types de prestations. Salles prestigieuses :
                    Hôtel Montana, El Rancho, Karibe Convention Center. Expertise événements grande envergure (200+ invités).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Pétion-Ville</h3>
                  <p className="text-gray-700">
                    Zone premium avec planners haut de gamme. Mariages luxury dans villas privées, jardins Boutilliers.
                    Spécialistes décoration raffinée, mariages intimes (50-150 invités). Service ultra-personnalisé.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <MapPin className="w-6 h-6 text-purple-600 flex-shrink-0" />
                <div>
                  <h3 className="text-xl font-bold mb-2">Cap-Haïtien</h3>
                  <p className="text-gray-700">
                    Planners locaux spécialisés mariages traditionnels du Nord. Collaboration possible avec planners de Port-au-Prince
                    pour événements hybrides. Expertise logistique spécifique région Nord.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Checklist */}
          <section className="mb-12 bg-purple-50 rounded-lg p-8">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">
              Checklist : Comment Choisir son Wedding Planner en Haïti
            </h2>

            <ol className="space-y-4 text-gray-700">
              <li className="flex items-start gap-3">
                <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">1</span>
                <div>
                  <strong>Vérifier le portfolio</strong> : Demandez à voir photos et vidéos de mariages précédents. Style cohérent avec vos attentes ?
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">2</span>
                <div>
                  <strong>Lire les avis clients</strong> : Témoignages vérifiés, recommandations, présence sur réseaux sociaux.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">3</span>
                <div>
                  <strong>Rencontrer en personne</strong> : Le feeling est crucial. Vous devez vous sentir écouté et compris.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">4</span>
                <div>
                  <strong>Clarifier les services</strong> : Qu'est-ce qui est inclus ? Combien de rendez-vous ? Présence jour J ?
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">5</span>
                <div>
                  <strong>Discuter budget transparent</strong> : Tarifs clairs, pas de frais cachés, modalités paiement.
                </div>
              </li>
              <li className="flex items-start gap-3">
                <span className="bg-purple-600 text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold">6</span>
                <div>
                  <strong>Vérifier disponibilité</strong> : Le planner est-il libre à votre date ? Combien d'événements gère-t-il simultanément ?
                </div>
              </li>
            </ol>
          </section>

          {/* CTA */}
          <section className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg p-8 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">
              Prêt à Organiser le Mariage de Vos Rêves ?
            </h2>
            <p className="text-lg mb-6 max-w-2xl mx-auto">
              Contactez nos wedding planners partenaires en Haïti pour un devis gratuit et personnalisé.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="bg-white text-purple-600 hover:bg-gray-100">
                <Phone className="w-4 h-4 mr-2" />
                Appeler Maintenant
              </Button>
              <Button size="lg" variant="outline" className="text-white border-white hover:bg-white/10">
                <Mail className="w-4 h-4 mr-2" />
                Demander un Devis
              </Button>
            </div>
          </section>

          {/* Liens internes */}
          <section className="mt-12 bg-gray-50 rounded-lg p-6">
            <h3 className="font-bold text-lg mb-4">Services Complémentaires :</h3>
            <div className="grid md:grid-cols-3 gap-4 text-sm">
              <a href="/robe-de-mariage-haiti" className="text-purple-600 hover:underline">→ Robes de Mariage</a>
              <a href="/decoration-mariage-haiti" className="text-purple-600 hover:underline">→ Décoration Mariage</a>
              <a href="/event-planner-haiti" className="text-purple-600 hover:underline">→ Event Planner</a>
              <a href="/blog/budget-mariage-haiti" className="text-purple-600 hover:underline">→ Budget Mariage</a>
              <a href="/blog/checklist-wedding-planner" className="text-purple-600 hover:underline">→ Checklist Complète</a>
              <a href="/organisation-mariage-port-au-prince" className="text-purple-600 hover:underline">→ Mariage Port-au-Prince</a>
            </div>
          </section>
        </div>
      </article>
    </>
  );
}