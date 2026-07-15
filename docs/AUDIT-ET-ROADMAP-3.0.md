# 🔍 Audit IRL LVP UP v2.0 & 🛣️ Route vers la 3.0

_Rédigé le 2026-07-16, au jalon **v2.0.0**. Analyse — aucune implémentation. À toi de décider la suite._

---

# Partie 1 — Audit de la 2.0

## Vue d'ensemble

IRL LVP UP est un **RPG de vie 100 % local** : un tableau de bord unique qui réunit entraînement,
poids/nutrition, sommeil/récupération, agenda + révisions BTS, focus, habitudes, quêtes/XP et
bien-être. Livré en **desktop (Electron)** et **PWA mobile installable iPhone**, hors-ligne, sans
compte, sans serveur.

## ✅ Forces (ce qui est solide)

| Domaine | Constat |
|---|---|
| **Architecture** | Vanilla JS, **0 dépendance runtime tierce** (juste `electron-updater`). App minuscule, rapide, surface d'attaque quasi nulle, aucune dette de supply-chain. |
| **Logique métier** | **348 fonctions pures** isolées dans `lib/logic.js`, testables et testées. Séparation logique/rendu nette. |
| **Qualité / tests** | **370 tests** (node:test) + un **smoke Electron** avec ~41 gardes **bloquants** qui exécutent l'app réelle. Discipline rare pour un projet solo. |
| **Sécurité** | `contextIsolation`, `nodeIntegration:false`, CSP `script-src 'self'`, Electron **43** (CVE purgées), réseau confiné au process principal. 100 % local. |
| **Sécurité des données** | Sauvegarde/restauration robuste (2 formats reconnus), 1 saisie/jour (poids, mesures), assainissement de l'état à l'import, photos migrées sur disque (desktop). |
| **Complétude fonctionnelle** | Couvre une dizaine de domaines de vie, chacun avec suivi + coaching contextuel. Peu d'apps « tout-en-un » vont aussi loin. |
| **Distribution** | Double cible desktop + PWA, **auto-update** (au démarrage, en tâche de fond, **et à la demande** depuis Réglages), CI GitHub Actions (Pages + Release). |
| **Accessibilité (démarrée)** | `aria-current` sur la navigation, `aria-label` sur les boutons-icônes, `role=status` sur les toasts, `prefers-reduced-motion` respecté. |

## ⚠️ Faiblesses & dette technique (l'honnête)

1. **Pas de synchronisation multi-appareils** — c'est **LE** grand manque structurel. Tes données
   vivent dans un seul `localStorage` par appareil : le PC et l'iPhone ne partagent rien
   automatiquement. Aujourd'hui il faut **exporter/importer à la main** pour transférer. Pour une app
   pensée « PC + téléphone », c'est la limite n°1.

2. **Persistance fragile en capacité** — tout dans **une clé `localStorage`** (`irl-level-up`). Plafond
   ~5–10 Mo, et sur iOS le localStorage peut être **évincé** (mitigé par la sauvegarde/rappel, pas
   éliminé). Ne passera pas à l'échelle avec beaucoup de photos/historique.

3. **Fichiers monolithiques** — `lib/logic.js` = **5 649 lignes / 348 fonctions**, `app.js` = tout le
   renderer en lignes très denses. Ça marche et c'est testé, mais ça devient **dur à naviguer et à
   faire évoluer**. Pas de modules ES, pas de bundler.

4. **Études BTS bridées** — `examGoal` est **unique** (`{title, date}`). Un BTS CG a **plusieurs
   matières et épreuves** ; aujourd'hui on ne suit qu'un examen/planning à la fois.

5. **Aucune intelligence/intégration externe** — saisie **100 % manuelle** : pas de scan du frigo
   (vision), pas d'import Strava/Garmin/Polar (OAuth). Volontaire (app locale), mais c'est un plafond.

6. **Français uniquement** (`lang="fr"`, textes en dur) — pas d'i18n. Bloque tout partage au-delà des
   francophones.

7. **A11y partielle** — bon départ, mais pas d'audit complet : gestion du focus dans les dialogues,
   `aria-live` sur toutes les zones dynamiques, parcours 100 % clavier, contraste — non vérifiés
   systématiquement.

8. **Tests E2E absents** — le smoke est un rendu Electron ponctuel, très utile, mais ce n'est pas un
   **parcours utilisateur automatisé** (type Playwright) qui cliquerait un scénario complet.

## 📊 Chiffres clés

- **~6 800 lignes** JS/HTML + **1 072 lignes CSS** (17 fichiers) · **348 fonctions pures** ·
  **370 tests** + smoke bloquant · **0 dépendance runtime tierce** · **47 exercices animés** ·
  version **2.0.0**.

---

# Partie 2 — 🛣️ Route vers la 3.0

> **Principe** : la 2.0 = complétude. La **3.0 doit être un SAUT**, pas du polish. Le fil rouge que je
> propose : **« mes données me suivent partout, l'app pense un peu à ma place, et elle grandit avec
> mes vrais besoins (BTS). »** Trois piliers : **Sync**, **Intelligence/Intégrations**, **Études**.

## 🌊 Vague A — Synchronisation multi-appareils _(le cœur de la 3.0)_

Le plus gros gain de valeur. Objectif : **PC ↔ iPhone sans export/import manuel.**
- Option légère : sync via un **fichier dans ton cloud** (Google Drive / iCloud Drive / Dropbox) —
  l'app lit/écrit un `.json` chiffré, fusion par horodatage. Pas de serveur à maintenir.
- Option robuste : un **petit backend de sync chiffré bout-en-bout** (compte minimal, données
  illisibles côté serveur). Plus lourd, plus « produit ».
- Prérequis technique : **migrer la persistance vers IndexedDB** (capacité + robustesse) et modéliser
  un état versionné/fusionnable.

## 🧠 Vague B — Intelligence & intégrations _(dépend de toi : réseau/comptes)_

- 📸 **Scan du frigo** : photo → aliments détectés → remplit « Mon frigo » (reconnaissance d'image).
- ⌚ **Sync sportive** : Strava (faisable en solo), puis Garmin/Polar (API partenaires) — import auto
  des runs/activités dans l'historique et la charge.
- 🤖 **Coaching adaptatif** : l'app a déjà des recommandations contextuelles ; franchir un cap vers de
  vraies suggestions personnalisées (charge, nutrition, révisions) selon tes tendances.

## 🎓 Vague C — Études BTS, en vrai _(ton besoin réel)_

- **Multi-matières / multi-épreuves** : plusieurs examens datés, suivi et objectifs **par matière**.
- **Planning multi-échéances** : le générateur de révision équilibre plusieurs matières jusqu'à leurs
  dates respectives, avec **répétition espacée**.
- **Bilan par matière** : progression, retard, prochaine révision — déjà amorcé (#352), à étendre.

## 🧱 Vague D — Fondations techniques _(catalyseur des autres)_

- **Découper** `app.js` et `lib/logic.js` en **modules ES** thématiques + **bundler léger**
  (esbuild/vite) — sans casser le « 0 dépendance runtime » livré.
- **IndexedDB** pour la persistance (prérequis de la Vague A).
- **Tests E2E** (Playwright) sur les parcours clés, en complément du smoke.

## ♿ Vague E — Accessibilité & international _(élargir)_

- Audit **WCAG** complet : focus dans les dialogues, `aria-live`, parcours clavier, contrastes.
- **i18n** : externaliser les textes, ajouter l'anglais → ouvrir l'app au-delà du français.

## 🗺️ Séquencement proposé (le mien)

1. **D (fondations)** en premier, léger, car il **débloque** A et le reste.
2. **A (sync)** — le saut de valeur qui justifie à lui seul la 3.0.
3. **C (études BTS)** — ton besoin concret, autonome (pas de dépendance externe).
4. **B (intégrations/IA)** — quand tu es prêt à fournir comptes/dépendances.
5. **E (a11y/i18n)** — en continu, en parallèle.

## 🔒 Ce qui dépend de TOI (hors boucle autonome)

- Choix de la stratégie de **sync** (fichier cloud vs backend) et du niveau d'effort accepté.
- **Comptes développeur** Strava/Garmin/Polar (OAuth).
- Acceptation d'une **dépendance IA/réseau** pour le scan du frigo (l'app est 100 % locale aujourd'hui).
- Accepter (ou non) un **bundler** dans la chaîne de build.

---

_À toi de jouer : dis-moi quelle(s) vague(s) tu veux viser pour la 3.0, et je te propose un plan
d'implémentation détaillé pour celle(s)-là._
