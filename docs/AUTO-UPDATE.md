# Mise à jour automatique (electron-updater)

_But : plus besoin de réinstaller le `.exe` à la main. L'app vérifie GitHub au démarrage, télécharge la nouvelle version en tâche de fond, et propose « Redémarrer & installer »._

## Ce qui est déjà branché dans le code (build 1.5.0)
- **`electron-updater`** (dépendance runtime) + config `publish` (GitHub) dans `package.json`.
- **Process principal** (`electron-main.cjs`) : `initAutoUpdate()` — vérifie les mises à jour **uniquement en build empaqueté**, télécharge, et envoie l'état au renderer. **Toutes les erreurs sont avalées** (dépôt non configuré, hors-ligne) → l'app reste 100 % fonctionnelle en local.
- **Sécurité** : seul le process principal parle à GitHub (HTTPS, hôte fixe). Le renderer garde son verrouillage (aucune navigation/fenêtre externe, CSP `script-src 'self'`).
- **Renderer** : bannière discrète en bas (`#updateBanner`) → « disponible / téléchargement X % / prête », bouton **Redémarrer & installer**.
- À la génération, `latest.yml` (le flux) et `app-update.yml` (embarqué) sont produits.

## ⚠️ Ce qu'il reste à faire (une seule fois) pour l'ACTIVER
Tant que ces étapes ne sont pas faites, l'auto-update **ne fait rien de visible** (c'est voulu).

1. **Créer un dépôt GitHub** pour l'app (public = le plus simple pour les mises à jour ; seuls les installeurs y sont déposés en « Releases »).
2. **Renseigner le dépôt** dans `src/package.json` → `build.publish` :
   ```json
   "publish": [{ "provider": "github", "owner": "TON_USER_GITHUB", "repo": "TON_REPO" }]
   ```
   (Remplacer `REPLACE_WITH_GITHUB_USER` / `REPLACE_WITH_GITHUB_REPO`.)
3. **Créer un token GitHub** (Settings → Developer settings → *Personal access token*, portée `repo`).
4. **Publier une version** : dans `src/`, PowerShell :
   ```powershell
   $env:GH_TOKEN = "ton_token"
   npm run release
   ```
   → construit l'installeur **et** crée la Release GitHub avec `latest.yml` + le `.exe`.
5. Pour chaque amélioration suivante : bump la version dans `package.json`, `npm run release`. Les apps déjà installées se mettront à jour toutes seules au prochain lancement.

## Notes
- **Signature de code** : les installeurs ne sont pas signés → Windows SmartScreen peut afficher un avertissement à la 1re installation. La mise à jour electron-updater fonctionne quand même. Signer (certificat OV/EV) est une amélioration future (supprime l'avertissement).
- **Vie privée** : la vérification de version contacte GitHub (ton dépôt) au lancement. Rien d'autre ne part sur le réseau.
- **Rollback** : garde le dernier `.exe` connu bon ; en cas de souci, réinstalle-le (les données dans `userData` sont préservées).
