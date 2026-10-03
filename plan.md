# Plan — Rapido Presto Shop-inspired

## Direction produit

Créer une marketplace haïtienne mobile-first inspirée des codes d’Instagram Shop sans reproduire son identité visuelle exacte. La découverte produit doit être rapide, visuelle et orientée conversion : une recherche immédiatement accessible, des produits en images 4:5, des catégories défilantes, des actions simples et un panier toujours atteignable.

## Design movement

**Social commerce éditorial** : un mélange de feed social, catalogue marchand et galerie de boutique locale.

## Principes

1. **Image d’abord** : les produits sont compris en moins d’une seconde.
2. **Découverte continue** : sections horizontales, stories et recommandations plutôt qu’une grille froide.
3. **Conversion sans friction** : prix, disponibilité, livraison et action panier visibles sans ouvrir une fiche.
4. **Local et fiable** : lieux haïtiens, HTG, vendeurs et livraison affichés avec une microcopie claire.

## Palette

- Signature Rapido : orange corail `#ff6b35`, réservé aux actions et promotions.
- Encre : `#111827` pour les prix, titres et actions fortes.
- Fond : `#fafafa` et surfaces blanches pour conserver la sensation de feed.
- Accent local : vert `#16a34a` pour disponibilité/livraison.

## Layout paradigm

Sur mobile : canvas pleine largeur, header compact sticky, barre de recherche, stories horizontales, sections de produits scrollables, navigation basse fixe avec safe-area. Sur desktop : colonne centrale de feed de largeur contrôlée, rail latéral de catégories/navigation et grille 4 colonnes, sans étirer les images.

## Signature elements

- Cercles de stories avec anneau orange-corail.
- Cartes produits au ratio 4:5 avec actions flottantes.
- Barres d’action arrondies et capsules de localisation/livraison.

## Interaction et animation

Interactions tactiles de 150–220 ms, feedback `active:scale-[.97]`, apparition progressive des sections et aucun mouvement décoratif lourd. Les images utilisent `object-cover` pour un rendu editorial cohérent. Les actions restent accessibles au clavier et aux lecteurs d’écran.

## Typographie

Système sans-serif natif pour performance et cohérence mobile. Titres courts en `font-semibold`, prix en `font-bold`, métadonnées en 11–12 px avec contraste suffisant. Aucun texte tout en capitales pour les contenus principaux.

## Voix de marque

Positionnement : **le social commerce haïtien qui transforme une découverte locale en commande simple et rapide**. Personnalité : directe, locale, énergique.

Exemples :
- « Trouve. Compare. Commande. »
- « Des produits près de toi, livrés sans détour. »

## Structure projet

- `src/pages/Home.jsx` et `src/pages/Products.jsx` : flux de découverte et recherche.
- `src/components/home/*` : stories, catégories, sections horizontales.
- `src/components/ui/ProductCard.jsx` : carte produit réutilisable.
- `src/components/navigation/*` : navigation mobile/desktop.
- `src/Layout.jsx` et `src/globals.css` : shell, tokens et responsive.

## Périmètre de cette itération

Refondre les tokens CSS, le shell marketplace, la carte produit et les primitives stories/catégories en conservant les contrats `base44`, les routes, les données et les paiements inchangés. Les parcours compte/panier seront ensuite adaptés sans migration backend simultanée.


# Extension — profils métier multi-espaces

## Décisions confirmées

- Un compte peut posséder plusieurs profils métier et les basculer à volonté.
- Marketplace conserve l’interface actuelle.
- Nourriture fournit un POS avec acceptation/refus, préparation, retrait et livraison.
- Hôtel/Piscine gère chambres, dates d’arrivée/départ, piscine par créneau, prix et confirmation automatique après paiement.
- Ticket gère événements, ventes, participants et QR privé à usage unique après paiement.
- Des collaborateurs peuvent être invités avec permissions limitées.

## Architecture

`User/{uid}` conserve `current_profile` et `profiles`. Les espaces opérationnels sont liés à un `Workspace/{id}` appartenant au propriétaire. `WorkspaceMember/{id}` porte le rôle et les permissions du collaborateur. Les transitions sensibles passent par fonctions serveur et transactions Firestore.

## Dashboards

- `EnterpriseDashboard` reste le dashboard Marketplace.
- `FoodPOSDashboard` expose uniquement commandes, catalogue, préparation, retrait et livraison.
- `HospitalityDashboard` expose inventaire, disponibilités, calendrier, piscines/créneaux et réservations.
- `TicketDashboard` expose événements, ventes, participants et scanner QR.

## Sécurité

Les QR ne sont ni générés ni consommés côté client : le serveur signe, vérifie paiement/événement/expiration et consomme le billet une seule fois. Les réservations de chambres et de créneaux utilisent des transactions atomiques. Les collaborateurs ne voient que les espaces et actions autorisés.
