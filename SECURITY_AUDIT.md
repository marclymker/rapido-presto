# Audit de sécurité et migration — Rapido Presto

## Fait dans cette version

- Suppression du répertoire et des imports de l’ancien fournisseur de génération de projet.
- Adaptateur renommé `src/api/firebaseClient.js` et centralisation Auth, Firestore et Realtime Database sur le projet `rapido-presto-f072a`.
- Suppression des médias de stockage hérités et ajout de repli local dans `public/assets/`.
- Suppression des fonctions serveur héritées non déployables avec Firebase Hosting.
- Les appels serveur non configurés échouent maintenant explicitement au lieu de retourner un faux succès.
- Ajout de `functions/index.js` avec vérification des ID tokens Firebase, contrôles de rôle admin, validation Zod, recalcul serveur des prix, commandes, avis, chat et notifications.
- Règles Firestore et Storage fermées par défaut, avec accès par propriétaire/admin et limites d’upload.
- En-têtes Hosting : HSTS, anti-MIME sniffing, anti-iframe, politique de référent et Permissions Policy.
- Ajout de `robots.txt`, `sitemap.xml` et `manus-routes.json`.
- Nettoyage lint et build de production validé.

## Avant mise en production

1. Déployer et tester les règles Firebase dans un projet de staging.
2. Déployer les Cloud Functions présentes dans `functions/`, puis configurer les secrets fournisseurs pour les paiements et notifications externes. `VITE_FIREBASE_FUNCTIONS_URL` pointe par défaut vers l’API `api` du projet.
3. Activer Firebase App Check avec reCAPTCHA Enterprise et vérifier les domaines autorisés dans Authentication.
4. Configurer les quotas, alertes de budget, MFA pour les comptes administrateurs et rotation des accès.
5. Exécuter `npm audit` régulièrement. Les dépendances transitives restantes doivent être résolues par mise à jour majeure lorsque la compatibilité de l’application aura été validée.
6. Vérifier les règles avec l’émulateur Firebase et des tests de non-régression sur les rôles client, commerçant, livreur et admin.
