# Mise à jour automatique (electron-updater)

_But : plus besoin de réinstaller le `.exe` à la main. L'app vérifie GitHub au démarrage, télécharge la nouvelle version en tâche de fond, et propose « Redémarrer & installer »._

## Ce qui est déjà branché dans le code (build 1.5.0)
- **`electron-updater`** (dépendance runtime) + config `publish` (GitHub) dans `package.json`.
- **Process principal** (`electron-main.cjs`) : `initAutoUpdate()` — vérifie les mises à jour **uniquement en build empaqueté**, télécharge, et envoie l'état au renderer. **Toutes les erreurs sont avalées** (dépôt non configuré, hors-ligne) → l'app reste 100 % fonctionnelle en local.
- **Sécurité** : seul le process principal parle à GitHub (HTTPS, hôte fixe). Le renderer garde son verrouillage (aucune navigation/fenêtre externe, CSP `script-src 'self'`).
- **Renderer** : bannière discrète en bas (`#updateBanner`) → « disponible / téléchargement X % / prête », bouton **Redémarrer & installer**.
- À la génération, `latest.yml` (le flux) et `app-update.yml` (embarqué) sont produits.

## ⚠️ TUTO PAS À PAS pour l'ACTIVER (une seule fois)
Tant que ces étapes ne sont pas faites, l'auto-update **ne fait rien de visible** (c'est voulu).

### Étape 1 — Avoir un compte GitHub
- Va sur **https://github.com**. Si tu n'as pas de compte : « Sign up », suis les étapes (email + mot de passe). Si tu en as un : « Sign in ».
- Ton **nom d'utilisateur** (ex. `adrienlanneval`) = le futur `owner`. Tu le vois en haut à droite (ton avatar) ou dans l'URL `github.com/TON_NOM`.

### Étape 2 — Créer le dépôt (le « repo »)
- Clique le **« + » en haut à droite** → **« New repository »** (ou va direct sur **https://github.com/new**).
- **Repository name** : `irl-lvp-up`.
- Coche **Public** (le plus simple pour les mises à jour ; seuls les installeurs `.exe` y seront déposés, pas tes données).
- Laisse le reste par défaut, clique **« Create repository »**.
- → Ton repo est `TON_NOM/irl-lvp-up`. Note-le.

### Étape 3 — Renseigner le repo dans le code
Dans `src/package.json`, section `build.publish`, remplace les placeholders :
```json
"publish": [{ "provider": "github", "owner": "TON_NOM", "repo": "irl-lvp-up" }]
```
_(Ou donne-moi `TON_NOM/irl-lvp-up` et je le fais.)_

### Étape 4 — Créer un jeton (token) GitHub
Le token autorise ton PC à déposer les versions sur GitHub.
- Va sur **https://github.com/settings/tokens** (ou : avatar → **Settings** → tout en bas à gauche **Developer settings** → **Personal access tokens** → **Tokens (classic)**).
- **« Generate new token »** → **« Generate new token (classic) »**.
- **Note** : `IRL LVP UP release`. **Expiration** : 90 jours (ou plus).
- **Coche la case `repo`** (tout le bloc). Rien d'autre n'est nécessaire.
- **« Generate token »** en bas → **copie le token** (il commence par `ghp_…`). ⚠️ Il ne s'affiche qu'une fois — garde-le de côté (pas dans le code, pas sur GitHub).

### Étape 5 — Publier la première version
Ouvre **PowerShell**, puis :
```powershell
cd "D:\IRL LVP UP\src"
$env:GH_TOKEN = "ghp_colle_ton_token_ici"
npm run release
```
Ça construit l'installeur **et** l'envoie sur GitHub.

### Étape 6 — Publier la Release (important !)
electron-builder crée la Release en **brouillon (draft)**. L'auto-update ne lit que les Releases **publiées** :
- Va sur **`https://github.com/TON_NOM/irl-lvp-up/releases`**.
- Tu vois un brouillon **« v1.5.0 »** → clique le **crayon (Edit)** → en bas **« Publish release »**.

### C'est actif ✅
- La **première** installation reste manuelle (double-clic sur le `Setup .exe`).
- Ensuite, pour **chaque** amélioration : je bump la version + `npm run release` + tu publies la Release → **les apps déjà installées se mettent à jour toutes seules** au lancement (bannière « Redémarrer & installer »).

## Notes
- **Signature de code** : les installeurs ne sont pas signés → Windows SmartScreen peut afficher un avertissement à la 1re installation. La mise à jour electron-updater fonctionne quand même. Signer (certificat OV/EV) est une amélioration future (supprime l'avertissement).
- **Vie privée** : la vérification de version contacte GitHub (ton dépôt) au lancement. Rien d'autre ne part sur le réseau.
- **Rollback** : garde le dernier `.exe` connu bon ; en cas de souci, réinstalle-le (les données dans `userData` sont préservées).
