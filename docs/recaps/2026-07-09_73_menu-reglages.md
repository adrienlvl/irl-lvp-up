# Boucle #73 — Menu Réglages (Paramètres) · build 1.9.7

**Demande d'Adrien :** « fais un menu paramètres général pour connecter les API Strava, Garmin, Polar. » → choix retenu : **« juste le menu Paramètres »** (l'OAuth réel viendra après, il doit d'abord enregistrer les apps développeur).

## Livré

Nouvelle page **⚙️ Réglages** dans la nav principale :
- **🎨 Apparence** : boutons Thème (clair/sombre) + Densité (confort/compact) — déclenchent les toggles existants (zéro duplication de logique).
- **🔗 Connexions sportives** : Strava (Bientôt), Polar (Bientôt), Garmin (Plus tard) — chacun avec l'explication honnête (Strava faisable en solo → Client ID à fournir ; Garmin = API partenaire gated).
- **📂 Autres réglages** : boutons vers Rappels (scroll) et vers la page Calendrier (Point de départ · Calendriers · Révisions).
- Le panneau **Rappels & notifications** est **rapatrié** ici (il était sur « Focus & vie », place peu logique) : `pageGroups.settings = ['.settings-page', '.reminder-panel']`, retiré de `focus`.

## Détail technique

- `index.html` : bouton nav `data-page="settings"` ; `<section class="panel settings-page">`.
- `app.js` : `pageGroups.settings`, `pageTitles.settings`, handlers `settingsTheme`/`settingsDensity` (relaient les toggles d'en-tête), `settingsGotoReminders`/`settingsGotoCalendar` (navigation).
- `extras.css` : styles `.settings-group` / `.settings-conn` / `.conn-row` / `.conn-badge`.

## Vérifs

- `npm run verify` → **124 tests / 124 pass**, **SMOKE OK** (`settingsPage:true`).
- Capture : la page Réglages rend proprement (Apparence, 3 connexions avec badges, autres réglages) ; nav « ⚙️ Réglages » active.

## Suite (Vague S.8, action d'Adrien)

Brancher l'**OAuth Strava** : Adrien crée une app sur strava.com/settings/api → me donne le Client ID (secret chiffré `safeStorage`) → j'implémente le flux (loopback + PKCE, réseau main-only) + l'import d'activités. Puis Polar. Garmin = plus tard (API partenaire).
