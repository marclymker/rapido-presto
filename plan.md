

# Révision — Workspace opérationnel unique

## Décision UX

Le profil actif ne doit pas seulement changer une étiquette ou une route : il doit changer la plateforme métier visible. Tous les profils opérationnels utilisent une seule route `Dashboard`, avec un shell minimaliste et des modules adaptés au profil actif.

- `Marketplace` : catalogue, commandes, comptes, performance et boutique.
- `Nourriture` : POS plein écran, commandes entrantes et catalogue rapide ; aucune navigation commerciale inutile.
- `Hôtel / Piscine` : disponibilités, réservations, chambres/piscines et commandes.
- `Tickets` : événements, ventes, participants et contrôle QR.

## Shell

Un en-tête compact affiche le nom de la plateforme active, le statut opérationnel, le profil actif et un seul bouton de changement d’espace. Le contenu principal est organisé en panneaux et cartes d’action ; il n’y a plus de sidebar, de barre de navigation basse ou de menu de pages concurrent pour les espaces métier.

## Direction visuelle

**Operational calm** : interface claire, dense et rassurante inspirée des POS et consoles de réservation professionnelles, distincte du feed client.

- Fond graphite doux pour les espaces opérationnels, cartes blanches et accent propre à chaque activité.
- Typographie sans-serif native, chiffres et statuts très lisibles.
- Une action principale par écran, états d’urgence visibles, aucun décor superflu.
- Responsive mobile-first : actions prioritaires accessibles au pouce, panneaux empilés sur mobile et deux colonnes maximum sur desktop.

## Transition

`ProfileSwitcher` conserve le changement de profil mais redirige tous les profils métier vers `Dashboard`. `Dashboard` choisit le workspace à partir de `current_profile`. Les anciens dashboards restent temporairement accessibles pour compatibilité, mais ne sont plus les destinations principales.

## Contraintes métier

Le changement d’espace doit conserver les permissions du profil, l’état actif dans Firestore, les commandes existantes et les données de catalogue. L’interface ne doit jamais afficher les actions d’un autre profil actif.
