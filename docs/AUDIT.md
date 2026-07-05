# Audit complet — IRL LVP UP

_Date : 2026-07-05 · Auditeur : Claude Code · Version auditée : build-detail (23/06/2026), source extraite de `app.asar`._

---

## 1. Résumé exécutif

**IRL LVP UP** est une application de bureau **Electron** (JavaScript vanilla, sans framework ni bundler) qui fonctionne comme un « RPG de la vraie vie » : XP / niveaux, quêtes quotidiennes, journal d'entraînement (muscu, course, trail, mobilité), objectif ultra-trail, minuteur de focus (pomodoro), rituels matin/soir, nutrition, poids, mensurations, récupération, photos de progression, et un **calendrier/agenda** avec export `.ics`.

L'app est **fonctionnellement riche et cohérente dans son intention** (100 % locale, aucune donnée envoyée à l'extérieur, ton bienveillant, sécurité d'Electron correctement configurée). Mais elle porte les cicatrices d'un développement par itérations successives avec ChatGPT/Codex :

- **Aucune source versionnée** : le seul code existant était **enfermé dans le `.exe`** (`app.asar`). → Corrigé aujourd'hui (dossier `src/` + git).
- **Aucune chaîne de build reproductible** : impossible de régénérer le `.exe` en l'état (dépendances Electron/electron-builder absentes).
- **Un seul fichier `app.js` de ~2 500 lignes** (compressées sur 243 lignes physiques très longues) → difficile à faire évoluer sans risque de régression.
- **20 fichiers CSS** empilés par patchs (`polish.css`, `ultra-plus.css`, `coach-plus.css`, `general-plus.css`, `mission-control.css`…) → dette de maintenance.
- Quelques **risques de robustesse réels** : quota `localStorage` non géré, photos base64 dans le même blob que tout l'état, double modèle de calendrier (`agenda` vs `plans`) qui peut désynchroniser.

**Verdict global : 6,5 / 10.** Bonne base produit, hygiène d'ingénierie faible. Priorité n°1 avant toute évolution : **rendre le build reproductible et sécuriser les données**. Ensuite seulement, ajouter des fonctionnalités et brancher Le Grand Livre Compta.

---

## 2. Vue d'ensemble technique

| Élément | Détail |
|---|---|
| Type | Application de bureau Electron (Windows) |
| Renderer | HTML/CSS/JS vanilla, **aucun** bundler ni transpilation |
| Fichier logique | `src/app.js` — ~2 500 lignes logiques |
| Vue | `src/index.html` (39 Ko, une seule page à sections masquées) |
| Styles | 20 fichiers `.css` chargés séquentiellement |
| Process principal | `src/electron-main.cjs` (fenêtre, tray, notifications, backups) |
| Pont IPC | `src/preload.cjs` (`contextIsolation: true`, `nodeIntegration: false` ✅) |
| Stockage | `localStorage['irl-level-up']` (un seul blob JSON) + backups disque via Electron (`userData`, 14 copies quotidiennes) |
| Tests | ❌ Aucun |
| Lint / format | ❌ Aucun |
| CI / versioning | ❌ Aucun (git ajouté aujourd'hui) |

### Modèle de données (state)
Un seul objet `state` sérialisé en JSON : `xp, health, focus, life, streak, quests[], workouts[], weights[], measurements[], recovery[], nutrition[], plans[], photos[], agenda[], lifeGoals[], dailyLifeStep, trail[], ultraPlan, focusTask, focusSessions[], focusParkings[], focusReviews[], morningRituals[], reflections[], profile{}, goals{}`.

---

## 3. Points forts (à préserver)

1. **Sécurité Electron correcte** : `contextIsolation: true`, `nodeIntegration: false`, préload minimal exposant une API restreinte. C'est le bon socle.
2. **100 % local / respect de la vie privée** : aucune requête réseau, aucun tracker, message explicite « aucune connexion à Strava/Garmin ». Cohérent et rassurant.
3. **Sauvegardes automatiques** : instantané + 14 copies quotidiennes sur disque, avec restauration au démarrage. Bonne intention de durabilité.
4. **`normalizeState()`** : garde-fou de migration qui recrée les tableaux/objets manquants → évite bien des crashs au chargement d'un vieux state.
5. **Gestion des fuseaux horaires** cohérente (`localDate()`, `dateKey()`, ancrage `T12:00:00`) → pas de décalage de jour.
6. **Produit pensé** : le ton, la logique « une seule variable à la fois », les modes Préserver/Construire/Consolider, la boussole du jour… c'est une vraie réflexion UX, pas un empilement de champs.

---

## 4. Findings classés par sévérité

### 🔴 Critique
| # | Finding | Emplacement | Impact |
|---|---|---|---|
| C1 | **Aucun build reproductible** : dépendances (`electron`, `electron-builder`) et config de packaging absentes du source. Le `.exe` ne peut pas être régénéré en l'état. | `src/package.json` (12 lignes, aucune dep) | Bloque *toute* évolution livrable. |
| C2 | **Source uniquement dans le `.exe`** avant aujourd'hui. Une corruption du binaire = perte du code. | `app.asar` | Perte de code possible. → *Corrigé (src/ + git).* |

### 🟠 Élevé
| # | Finding | Emplacement | Impact |
|---|---|---|---|
| H1 | **Quota `localStorage` non géré** : `save()` fait `localStorage.setItem(...JSON.stringify(state))` sans `try/catch`. Un `QuotaExceededError` (photos base64, historiques longs) casse silencieusement toutes les sauvegardes. | `app.js` `save()` (ligne 69) | Perte de données silencieuse. |
| H2 | **Photos base64 dans le blob d'état** : jusqu'à 12 images encodées en Data URL, re-sérialisées à *chaque* `save()`. Gonfle le state, ralentit chaque écriture, rapproche du quota. | `app.js` (state.photos, `#progressPhoto`) | Perf + quota. |
| H3 | **Double modèle de calendrier** : `agenda[]` (blocs + `.ics`) et `plans[]` (séances) coexistent ; les plans sont dupliqués dans l'agenda via `planId`. Les cycles de vie divergent → **orphelins**. Ex. supprimer un événement du calendrier mensuel efface l'`agenda` mais **laisse le `plan`** correspondant. | `renderMonthCalendar`, `#monthCalendar` onclick (l. 237), `generateAutomaticWeek` | Désync de données ; central pour l'intégration Grand Livre. |

### 🟡 Moyen
| # | Finding | Emplacement | Impact |
|---|---|---|---|
| M1 | **`render()` monolithique** : chaque interaction relance ~20 fonctions de rendu + reconstruit tout l'`innerHTML` + rappelle `exerciseEntries()` (flatMap sur tous les workouts) plusieurs fois. | `app.js` `render()` (l. 173) | Jank, perte de focus/scroll, mise à l'échelle médiocre. |
| M2 | **`save()` à chaque `render()`** (l. 174) même sans changement d'état → écritures `localStorage` superflues. | `render()` | Perf. |
| M3 | **XSS potentiel (self)** : usage massif d'`innerHTML`. La plupart des entrées sont passées à `escapeHtml`, mais le motif est **inconsistant** ; un seul oubli = injection depuis ses propres saisies. | Partout (ex. l. 83, 89, 167, 170) | Faible (mono-utilisateur local) mais fragile. |
| M4 | **Pas de CSP** dans `index.html`. | `index.html` `<head>` | Durcissement manquant. |
| M5 | **Tray invisible** : `nativeImage.createEmpty()` → icône de zone de notification vide. Combiné à « fermer = masquer », l'app peut « disparaître » sans point de rappel visible. | `electron-main.cjs` (l. 11) | UX : app introuvable. |
| M6 | **Pas de verrou d'instance unique** : plusieurs fenêtres/instances possibles, chacune écrivant le backup. | `electron-main.cjs` | Corruption de backup possible. |
| M7 | **Pas de versioning de schéma** sur le state en `localStorage` (les backups ont `version` mais pas l'état vivant). | `normalizeState` | Migrations futures risquées. |

### 🟢 Faible
| # | Finding | Emplacement | Impact |
|---|---|---|---|
| L1 | **20 CSS empilés** par patchs successifs → règles redondantes, ordre de cascade fragile. | `src/*.css` | Maintenance. |
| L2 | **`.ics` en heure flottante** (ni `Z` ni `TZID`), `SUMMARY` n'échappe pas les retours ligne. | `#exportIcs` (l. 232) | Ambiguïté d'import inter-fuseaux. |
| L3 | **Compteurs `health/focus/life`** peuvent dériver (ajouts/suppressions asymétriques). | `award`, suppressions | Cosmétique. |
| L4 | **Aucune gestion d'erreur globale** : une exception dans `render()` casse toute l'UI. | `render()` | Fragilité. |
| L5 | **Suppression sans confirmation fine** dans le calendrier mensuel (clic = suppression, y compris séances terminées). | `#monthCalendar` (l. 237) | UX. |

---

## 5. Le point le plus important pour la suite : le modèle « calendrier »

C'est **le cœur de l'intégration avec Le Grand Livre Compta**, donc il mérite une section dédiée.

Aujourd'hui il existe **trois** surfaces qui parlent de temps :
- **`agenda[]`** — blocs génériques `{id, title, date, time, kind: focus|sport|life, completed, planId?}`. C'est ce qu'affichent le calendrier hebdo (dashboard) et le calendrier mensuel, et ce qu'exporte le `.ics`.
- **`plans[]`** — séances d'entraînement planifiées `{id, date, time, type, auto?}`. Chaque plan est **aussi** poussé dans `agenda` (avec `planId`).
- Le minuteur de focus et les rituels, datés mais hors calendrier.

**Problèmes :**
- Cycles de vie divergents (supprimer l'agenda ≠ supprimer le plan → orphelins).
- `kind` est limité à 3 valeurs (`focus/sport/life`) — **il n'y a pas de catégorie « révision / étude »**, qu'il faudra ajouter pour le Grand Livre.
- Pas de notion de « source » d'un événement (manuel vs importé vs généré) → indispensable pour pouvoir **resynchroniser** proprement les révisions BTS CG sans écraser les blocs manuels.

**Recommandation** : unifier autour d'un modèle d'événement unique avec `kind` étendu (`study`) et un champ `source` (`manual | training | study-glc | imported`), pour permettre un import/rafraîchissement idempotent du planning de révision.

---

## 6. Intégration Le Grand Livre Compta — état des lieux

- **Le Grand Livre Compta** est une **page HTML autonome** (`le-grand-livre-compta.html`), app de révision **BTS CG** : flashcards à **répétition espacée** (système de « boîtes » `BOX_DAYS`, dates d'échéance `due`), examens blancs, outils compta. State en `localStorage['legl.compta.v2']` (`{passed, cards}` ; `cards[id] = {box, due}`).
- **Elle possède déjà un planning implicite** : chaque carte a une date `due` (prochaine révision). C'est **exactement** la matière à faire remonter dans le calendrier de IRL LVP UP (« X cartes à réviser le J », créneaux de révision).
- **Obstacle technique** : les deux apps ont des `localStorage` **cloisonnés** (origines différentes ; l'une est Electron, l'autre du HTML `file://`/navigateur). Elles **ne peuvent pas** lire directement les données l'une de l'autre.
- **Ponts possibles** (détaillés dans la ROADMAP) : fichier JSON partagé sur disque lu par Electron, import/export `.ics`, ou intégration du module de révision directement dans l'app hub. Décision à cadrer avec toi.

---

## 7. Ce qui manque pour « faire les évolutions » proprement

1. **Chaîne de build** : `package.json` complet (deps `electron` + `electron-builder`, scripts `start`/`dist`), config de packaging, icône. → Sans ça, on ne peut pas te livrer de nouveau `.exe`.
2. **Filet de sécurité** : quelques tests de non-régression sur la logique pure (XP, streak, semaine, prescription d'exercices, migration de state).
3. **Découpage** : au minimum séparer les données (exercices, programmes) de la logique, et sécuriser les écritures.

---

## 8. Prochaines étapes recommandées (résumé)

1. **P0 — Rendre le projet buildable** (package.json + electron-builder + `npm start`).
2. **P0 — Sécuriser les données** (try/catch quota, sortir les photos du blob, CSP, tray visible, instance unique).
3. **P1 — Unifier le modèle calendrier** (`kind: study`, champ `source`, cycle de vie cohérent).
4. **P1 — Brancher Le Grand Livre Compta** (pont de révision → calendrier).
5. **P2 — Qualité** : découper `app.js`, rationaliser les CSS, ajouter des tests.
6. **P2 — Fonctionnalités** : voir ROADMAP.

> Détail complet et séquencé dans [`ROADMAP.md`](ROADMAP.md).
