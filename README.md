# Kairos

## Prévisualisation produit WhatsApp

Les boutons de partage utilisent `/functions/ogMetaTags?slug=<slug-produit>&product=<id-produit>`. Cette fonction Firebase renvoie les balises Open Graph côté serveur aux crawlers WhatsApp, Facebook et autres réseaux sociaux, puis redirige les visiteurs ordinaires vers `/product/<id-produit>`.

Après `npm run build`, déployer Hosting et les Functions avec :

```bash
npx firebase-tools deploy --project rapido-presto-f072a --only hosting,functions
```

Le déploiement des Functions peut nécessiter le plan Firebase Blaze. Vérifier ensuite un lien produit réel avec un User-Agent crawler avant de le partager sur WhatsApp.

## Fonctions Firebase autonomes

Les anciennes fonctions Base44 ont été remplacées par des Cloud Functions Firebase dans `functions/index.js`.

| Fonction | URL publique | Usage |
|---|---|---|
| Sitemap dynamique | `/sitemap.xml` | Pages publiques, produits et boutiques Firestore |
| Sitemap compatible | `/functions/generateSitemap` | Alias historique interne |
| Google Merchant | `/feeds/google-merchant.xml` | Flux RSS 2.0 avec namespaces Google Merchant |
| Flux produits IA | `/feeds/openai-products.json` | Catalogue JSON public structuré |
| Produits similaires | `/functions/getSimilarProducts?productId=ID` | Recommandations par boutique ou catégorie |
| Vérification Google | `/functions/googleVerification?token=TOKEN` | Réponse activée seulement avec `GOOGLE_SITE_VERIFICATION` |
| Analytics serveur | `/functions/googleAnalyticsFeed` | Proxy GA4 POST activé seulement avec `GA4_MEASUREMENT_ID` et `GA4_API_SECRET` |

Les flux lisent directement Firestore, utilisent des caches HTTP courts et ne dépendent d’aucune API Base44.

## Secrets optionnels

Ne jamais placer les valeurs dans Git :

```bash
firebase functions:secrets:set GOOGLE_SITE_VERIFICATION
firebase functions:secrets:set GA4_MEASUREMENT_ID
firebase functions:secrets:set GA4_API_SECRET
```

La fonction Analytics refuse les appels tant que les paramètres serveur ne sont pas configurés. Le sitemap, le flux Google Merchant et le flux JSON produits restent fonctionnels sans ces secrets.
