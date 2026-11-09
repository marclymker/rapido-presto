# Kairos — configuration MonCash et Square

Aucune clé privée ne doit être ajoutée à React, Vite, Capacitor, Firestore ou GitHub. Les variables ci-dessous sont lues uniquement par `functions/payments.js` via Firebase Secret Manager.

## Secrets à créer par le propriétaire

```bash
firebase functions:secrets:set MONCASH_CLIENT_ID
firebase functions:secrets:set MONCASH_CLIENT_SECRET
firebase functions:secrets:set MONCASH_REST_BASE_URL
firebase functions:secrets:set MONCASH_GATEWAY_BASE_URL
firebase functions:secrets:set MONCASH_MODE

firebase functions:secrets:set SQUARE_ACCESS_TOKEN
firebase functions:secrets:set SQUARE_APPLICATION_ID
firebase functions:secrets:set SQUARE_LOCATION_ID
firebase functions:secrets:set SQUARE_WEBHOOK_SIGNATURE_KEY
firebase functions:secrets:set SQUARE_ENVIRONMENT
firebase functions:secrets:set SQUARE_CURRENCY
firebase functions:secrets:set SQUARE_HTG_TO_CURRENCY_RATE
```

Ne pas mettre les valeurs dans la commande, dans un fichier `.env` suivi par Git ou dans une conversation.

## Valeurs MonCash

Pour le sandbox :

```text
MONCASH_REST_BASE_URL=https://sandbox.moncashbutton.digicelgroup.com/Api
MONCASH_GATEWAY_BASE_URL=https://sandbox.moncashbutton.digicelgroup.com/Moncash-middleware
MONCASH_MODE=sandbox
```

Pour la production, utiliser les URLs live fournies par MonCash :

```text
MONCASH_REST_BASE_URL=https://moncashbutton.digicelgroup.com/Api
MONCASH_GATEWAY_BASE_URL=https://moncashbutton.digicelgroup.com/Moncash-middleware
MONCASH_MODE=live
```

## Valeurs Square

Commencer avec :

```text
SQUARE_ENVIRONMENT=sandbox
SQUARE_CURRENCY=USD
SQUARE_HTG_TO_CURRENCY_RATE=<taux défini par le propriétaire>
```

Le taux est une configuration métier. Le serveur convertit le total HTG en unité mineure Square et ne fait jamais confiance au montant transmis par le navigateur. Vérifier d’abord que le compte Square accepte le pays et la devise utilisés. Ne pas passer en production avant un paiement sandbox réussi et vérifié.

## URLs à déclarer

Endpoint webhook Square :

```text
https://us-central1-rapido-presto-f072a.cloudfunctions.net/squareWebhook
```

Le webhook doit être configuré dans le tableau de bord Square avec les événements de paiement pertinents. Kairos vérifie la signature HMAC-SHA-256 avant de traiter le corps de la requête.

Retour MonCash utilisé par l’application :

```text
https://makariosbridal.shop/payment/callback
```

La vérification MonCash est effectuée par `moncashVerifyPayment` après retour du client. Le serveur recharge les commandes liées et refuse une transaction qui n’appartient pas à l’utilisateur connecté.

## Déploiement après ajout des secrets

Depuis le dépôt :

```bash
npm run build
npx firebase-tools deploy --project rapido-presto-f072a --only hosting,functions,firestore:rules
```

Les clés ne seront pas imprimées par l’application. En cas de secret absent, le paiement retourne une erreur de configuration contrôlée et aucune commande n’est marquée comme payée.

## Garanties implémentées

- Le prix est recalculé depuis les commandes Firestore.
- Le frontend ne peut plus marquer une commande comme `paid`.
- Square utilise une clé d’idempotence déterministe pour éviter les doubles débits.
- Les secrets restent côté Cloud Functions.
- Le webhook Square utilise une comparaison HMAC à temps constant.
- MonCash utilise OAuth côté serveur, puis `CreatePayment` et `RetrieveTransactionPayment`.
- Le token de carte Square est temporaire et est transmis au serveur uniquement pour la création du paiement.
