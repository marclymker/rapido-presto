# Analyse de `UserActivity_export.csv`

## Résultats

- **5 752 événements**.
- **308 identifiants utilisateur distincts**.
- **262 visiteurs anonymes** avec un identifiant `guest_...`.
- **46 identifiants non anonymes**.
- **38 boutiques distinctes** consultées.
- **568 produits distincts** consultés.
- Période : **23 janvier 2026 → 29 septembre 2026**.

## Valeur pour la migration

Cet export n’est pas un export de comptes. Il ne contient ni mot de passe, ni profil complet, ni compte Firebase.

Cependant, il contient une information très utile pour 46 anciens utilisateurs :

```text
user_id = ancien identifiant Base44
created_by = email historique
```

Le moteur de migration utilise maintenant cette association pour compléter le rapprochement lorsque l’export `Shop` ne contient pas d’email.

Les événements `guest_...` ne seront jamais transformés en comptes clients. Ils représentent des visiteurs anonymes et doivent rester des données d’analytics.

## Sécurité

- Les activités ne sont pas utilisées pour créer automatiquement des comptes.
- Elles servent uniquement à retrouver un compte Firebase existant par email.
- Une correspondance ambiguë reste bloquée.
- Les événements ne sont pas modifiés ni supprimés.
