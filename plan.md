

# Audit sécurité, performance 2G et localisation Haïti

## Objectif

Rendre Kairos plus difficile à compromettre, plus rapide sur réseau 2G/3G en Haïti et explicitement localisé en Haïti sans casser Firebase/Auth ni les données existantes.

## Axes d’implémentation

- Sécurité : contrôler les règles Firestore/Storage, les écritures propriétaires, les endpoints exposés, les secrets, les dépendances et les URLs legacy.
- Performance : réduire les requêtes initiales, limiter les téléchargements, améliorer le lazy-loading, le cache et les images, conserver une expérience utilisable en basse donnée.
- Réseau lent : éviter les fallbacks qui chargent tout le catalogue, désactiver les appels non essentiels, fournir des états de chargement compacts et ne jamais bloquer la création d’un article sur une analyse externe.
- Haïti : définir `ht-HT`, HTG, fuseau `America/Port-au-Prince`, téléphones +509, régions haïtiennes, SEO/canonical/local business et textes de découverte locale.

## Structure concernée

- `src/api` : accès Firebase, uploads et écritures propriétaires.
- `src/pages` : Home/Products, formulaires et données chargées.
- `src/components` : cartes, images, trackers et appels non essentiels.
- `public` : manifest, robots, sitemap et service worker.
- `firestore.rules`, `storage.rules`, `firebase.json` : frontières de sécurité et cache/déploiement.
