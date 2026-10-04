# Audit sécurité, performance 2G et localisation — Rapido Presto

**Date :** 4 octobre 2026  
**Projet audité :** `marclymker/rapido-presto` — branche de travail redesign

## Résumé exécutif

Le projet compile après les corrections. Les dépendances directes Base44 ont été retirées du `package.json`, les artefacts historiques `base44/` ont été supprimés et les URLs Supabase/Base44 découvertes dans les écrans publics ont été remplacées par le domaine Rapido Presto ou des assets locaux.

La priorité actuelle reste la **performance mobile** : le bundle principal reste lourd, environ **1,26 Mo minifié / 351 Ko gzip**, et le chunk `Orders` dépasse 500 Ko. L’application est utilisable, mais elle n’est pas encore optimale pour la 2G. La prochaine étape à fort rendement est de réduire les imports globaux et de découper les écrans lourds.

## Corrections appliquées

### Sécurité et dépendances

- Suppression de `@base44/sdk` et `@base44/vite-plugin` des dépendances npm.
- Suppression du répertoire historique `base44/` qui contenait des connecteurs, entités et fonctions hérités.
- Mise à jour de Firebase vers la version maintenue installée par npm.
- Exécution de `npm audit fix` sans forcer les changements majeurs.
- Règles Firestore restrictives par propriétaire, utilisateur authentifié et administrateur.
- Règles Storage limitées aux utilisateurs authentifiés, à leur chemin propriétaire, avec limite de taille et types MIME contrôlés.
- Validation du build après les changements.

### Suppression de dépendances réseau inutiles

- Suppression des préconnexions Supabase du layout.
- Remplacement des deux références d’image Supabase dans `ProductDetailModal` par `/assets/product-placeholder.svg`.
- Remplacement de l’image de `WeddingCreditBanner` par `/assets/wedding-credit.svg`.
- Remplacement des canonicals `rapidopresto.base44.app` par `rapidopresto.shop`.
- Suppression de l’écran OAuth hérité non routé et de son parseur de paramètres inutilisé.
- Suppression des trois injections GTM dupliquées, de l’iframe noscript GTM et du Pixel inline dans le layout. Cela réduit les requêtes, évite les erreurs 403/503 observées et supprime le double comptage marketing.

### Performance 2G / faible consommation de données

- Les lectures Home, Products, recommandations et blog ont été bornées dans les lots initiaux.
- Le layout détecte `Save-Data`, `2g` et `slow-2g` pour ne pas charger les composants non essentiels.
- Les images produit utilisent des variantes de taille/qualité dans les cartes et miniatures.
- Les écrans sont déjà séparés par lazy loading de routes ; les optimisations restantes concernent principalement les dépendances globales et les gros chunks.

### Localisation Haïti / SEO

- `lang="fr-HT"`.
- Métadonnées `geo.region=HT`, `geo.placename=Haïti`, coordonnées par défaut du pays et thème mobile cohérent.
- Données structurées `OnlineStore` avec zone desservie Haïti, devise HTG et adresse pays HT.
- Canonicals et données structurées des pages SEO orientés vers `https://rapidopresto.shop`.

## Risques encore présents à traiter avant une vraie mise en production

1. **Audit npm non nul :** après les mises à jour non cassantes, il reste 16 alertes de dépendances, dont certaines transitives et certaines liées à `jspdf`/DOMPurify, `react-quill`/Quill et React Router. Ne pas lancer `npm audit fix --force` sans test complet : npm annonce des changements majeurs. Plan recommandé : isoler ou remplacer les éditeurs et bibliothèques lourdes, puis mettre à jour par famille.
2. **Bundle initial trop lourd :** 351 Ko gzip avant téléchargement des routes lazy. Il faut sortir du chemin critique les imports globaux comme `recharts`, `moment`, `jspdf`, `html2canvas`, `three`, cartes et éditeurs.
3. **Cloud Functions / paiement :** les opérations MonCash, Square, notifications et prix doivent rester côté serveur. Les clés et secrets ne doivent jamais être ajoutés à `.env` frontend ou à Firestore.
4. **Storage Firebase :** le projet doit activer Storage avant de déployer l’upload. Les règles seules ne provisionnent pas le service.
5. **Rate limiting :** une limitation par IP/utilisateur doit être active sur les fonctions sensibles : paiement, création de commande, chat, upload et changement de profil.
6. **CSP stricte :** après validation des domaines réellement utilisés par Firebase, paiement, images et analytics, ajouter une Content-Security-Policy via Firebase Hosting.
7. **Géolocalisation dynamique :** les coordonnées dans les métadonnées sont un point de référence Haïti. Les vendeurs doivent conserver leur commune/région dans leurs documents et les pages boutique doivent produire des métadonnées locales individualisées.

## Commandes de validation

```bash
npm ci
npm run build
npm run lint
npm audit --omit=dev --audit-level=moderate
```

Le build a réussi après les corrections. `npm audit` reste volontairement documenté comme non nul parce que la résolution complète exigerait des remplacements ou des mises à jour majeures qui doivent être testés séparément.

## Plan recommandé à fort effet de levier

1. Mesurer Lighthouse mobile et WebPageTest avec profil 2G.
2. Créer des chunks manuels pour `Orders`, `BlogArticle`, `jspdf`, `recharts`, `three` et l’éditeur riche.
3. Remplacer `moment` par `date-fns` là où possible.
4. Remplacer `react-quill` ou le charger uniquement dans l’écran d’administration blog.
5. Ajouter une politique CSP testée en `Report-Only`, puis la passer en enforcement.
6. Activer Firebase Storage uniquement après validation du budget et des règles.
7. Tester les parcours critiques sur Android bas de gamme : connexion Google, création article, upload, variantes, panier, commande et changement de profil.

## Résultat du test `npm audit fix --force`

Le test a été exécuté sur une branche isolée puis abandonné, sans publication sur la branche stable. npm proposait notamment des changements incompatibles ou des rétrogradations inattendues : Firebase 9, `react-quill` 0.0.2 et React Router 7, tout en laissant encore 14 vulnérabilités signalées. Le build et le lint passaient, mais ce résultat ne justifie pas une mise à jour forcée : la compatibilité fonctionnelle des routes, de l’éditeur et de Firebase n’est pas garantie. La branche stable a été restaurée exactement avant la publication suivante.

## Seconde passe performance appliquée

- Firebase Storage n’est plus chargé au démarrage : il est importé dynamiquement uniquement lors d’un upload.
- Rollup sépare maintenant Firebase Core, Auth, Firestore et Storage.
- Le chemin initial conserve le bundle principal autour de 102 Ko gzip et évite de télécharger les 8 Ko gzip de Storage tant qu’aucun upload n’est demandé.
- Build et lint repassent avec succès après cette modification.
