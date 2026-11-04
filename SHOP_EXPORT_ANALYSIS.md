# Analyse de `Shop_export(1).csv`

## Résumé

- **72 boutiques** détectées dans l’export.
- **72 identifiants boutique uniques** (`id`).
- **72 identifiants propriétaires legacy uniques** (`user_id`).
- **72 noms de boutique non vides** ; un nom apparaît deux fois : `Sonie Flowers`.
- **71 slugs non vides** ; un slug est manquant.
- **Seulement 4 emails renseignés** dans l’export Shop.
- **34 régions manquantes**.
- **23 logos utilisent encore une URL `base44.app`** et devront être copiés vers Firebase Storage ou remplacés par une URL durable.

## Structure utile

| Colonne legacy | Destination Firebase | Rôle |
|---|---|---|
| `id` | `Shop/{id}` ou `legacy_shop_id` | Identifiant stable de la boutique |
| `user_id` | `Shop.user_id` après liaison | Ancien identifiant du propriétaire |
| `created_by_id` | `legacy_user_id` | Identifiant legacy secondaire |
| `email` | clé de rapprochement | Email du marchand lorsqu’il est présent |
| `phone` | clé de rapprochement | Téléphone/WhatsApp lorsqu’il est présent |
| `company_name` | `Shop.company_name` et profil métier | Nom de l’établissement |
| `company_category` | `Shop.company_category` et profil métier | Catégorie |
| `company_logo_url` | Storage Firebase | Logo à migrer si URL Base44 |
| `slug` | `Shop.slug` | URL boutique |

## Point important

Le champ `user_id` contient des identifiants legacy de type Base44, par exemple :

```text
694b478cc984102a3c47c782
```

Ce n’est pas automatiquement un UID Firebase Auth. Il ne faut donc pas le remplacer par déduction ou par le nom de la boutique.

## Liaison prévue

Pour chaque boutique :

1. utiliser `user_id` comme ancien identifiant propriétaire ;
2. retrouver le document `User` legacy correspondant ;
3. rapprocher ce propriétaire du compte Firebase par email ou téléphone ;
4. conserver l’ancien identifiant dans `legacy_user_id` ;
5. mettre à jour `Shop.user_id` avec le Firebase UID ;
6. mettre à jour les produits liés par `shop_id` sans les recréer ;
7. journaliser la liaison dans `MigrationLink`.

## Limite de cet export

L’export Shop ne contient pas assez d’emails pour rattacher automatiquement les 72 boutiques. Il faut également disposer de l’export `User` historique, ou vérifier que les documents legacy sont déjà présents dans la collection Firestore `User` avec leurs emails/téléphones.

Les 4 boutiques avec email peuvent être rapprochées directement si l’email existe aussi sur le compte Firebase. Les autres nécessitent le document utilisateur historique correspondant à leur `user_id`.

## Doublons et sécurité

- Aucun document ne doit être supprimé.
- Aucun produit ne doit être recréé.
- La migration doit utiliser `setDoc(..., { merge: true })` ou l’équivalent existant.
- Les identifiants legacy doivent être conservés.
- Les correspondances ambiguës doivent rester en attente de validation manuelle.
- Le nom d’une boutique ne doit jamais être utilisé seul comme clé de liaison.

## Exécution

L’écran administrateur `/LegacyMigration` analyse d’abord Firestore sans écrire. L’exécution est autorisée uniquement si aucune correspondance ambiguë n’est détectée.
