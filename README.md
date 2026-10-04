# Rapido Presto

## Prévisualisation produit WhatsApp

Les boutons de partage utilisent `/functions/ogMetaTags?slug=<slug-produit>&product=<slug-produit>`. Cette fonction Firebase renvoie les balises Open Graph côté serveur aux crawlers WhatsApp, Facebook et autres réseaux sociaux, puis redirige les visiteurs ordinaires vers `/product/<slug-produit>`.

Après `npm run build`, déployer Hosting et la fonction avec :

```bash
npx firebase-tools deploy --project rapido-presto-f072a --only hosting,functions:ogMetaTags
```

Le déploiement des Functions peut nécessiter le plan Firebase Blaze. Vérifier ensuite un lien produit réel avec un User-Agent crawler avant de le partager sur WhatsApp.
