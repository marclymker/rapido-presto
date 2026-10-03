# Rapido Presto

Marketplace haïtien moderne propulsé par React, Vite et Firebase.

## Démarrage

```bash
npm ci
npm run dev
```

## Production

```bash
npm run build
firebase deploy --only hosting,firestore,storage
```

Le client ne dépend d’aucun fournisseur de génération de projet : l’authentification, Firestore, Realtime Database et l’hébergement sont configurés directement avec Firebase.
