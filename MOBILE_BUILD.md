# Kairos — compilation mobile avec Capacitor

## État actuel

- Le build web Vite passe avec succès.
- Capacitor 8.5.2 est installé.
- Les projets natifs `android/` et `ios/` sont générés.
- `npx cap sync` passe avec succès.
- Le bundle Android release est compilable.
- Le bundle produit dans le sandbox est non signé : il sert à valider le pipeline, mais Google Play exige une clé de signature de publication.
- La compilation iOS nécessite macOS + Xcode, indisponible dans le sandbox Linux.

## Workflow après chaque modification React

```bash
npm install
npm run build
npx cap sync
```

## Android

Sur une machine avec Android Studio ou le SDK Android configuré :

```bash
cd android
./gradlew bundleRelease
```

Le bundle est généré ici :

```text
android/app/build/outputs/bundle/release/app-release.aab
```

Pour une publication réelle, configurer une clé de signature privée hors Git :

1. créer ou utiliser le keystore de publication Google Play ;
2. conserver le fichier et les mots de passe dans un coffre sécurisé ;
3. configurer `signingConfigs.release` dans `android/app/build.gradle` ou via des variables d’environnement ;
4. ne jamais committer le keystore, les mots de passe ou `local.properties`.

## iOS

Sur un Mac :

```bash
npm run build
npx cap sync ios
npx cap open ios
```

Puis ouvrir le workspace dans Xcode, configurer l’équipe Apple Developer, le Bundle ID `shop.makariosbridal.kairos`, la signature et l’archive App Store.

## Firebase

Les données Firebase ne sont pas compilées dans l’application. L’application mobile utilise le même backend Firebase que la version web : Auth, Firestore, Storage et les fonctions accessibles. Une modification des données Firebase ne nécessite donc pas de nouvelle compilation mobile.

## Sécurité

Ne pas mettre de secret Firebase Admin, clé privée, keystore ou mot de passe dans le dépôt. Les clés publiques nécessaires à Firebase Web peuvent rester dans la configuration frontend ; les secrets serveur restent dans Firebase Functions / Secret Manager.
