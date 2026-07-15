# #356 — 🚀 Version 2.0

## Décision

Adrien : « Continue, par contre quand atteindra-t-on la 2.0 ? » → après état des lieux honnête
(toutes les vagues de la roadmap terminées, ~20 builds de polish « au-delà de la roadmap initiale »,
et le fait que la 2.0 n'arrive jamais toute seule par incrément de patch), il a choisi **« couper la
2.0 maintenant »**. L'app est complète ; la 2.0 est une décision, pas un compteur.

## Passe QA (avant le cut)

- **Rendu des 7 pages** (dashboard, athlète, poids, bibliothèque, nutrition, focus, réglages) avec un
  état riche (poids/mesures/récup/habitudes/agenda/matin) → **aucune exception**.
- **Aucune erreur console** sur l'ensemble.
- **370 tests + smoke** verts (dont garde-fou CSS + 41 gardes smoke bloquants).
- Cohérence des versions vérifiée : `compareVersions('2.0.0','1.9.289') === 1`, CHANGELOG strictement
  décroissant, `CHANGELOG[0].v === '2.0.0'`.

## Le cut

- Entrée CHANGELOG **2.0.0** (message de bienvenue / bilan de la v2).
- `src/package.json` → **2.0.0** ; les 2 assertions `CHANGELOG[0].v` → `2.0.0`.
- Build **`IRL LVP UP Setup 2.0.0.exe`** (signé). Tag **`v2.0.0`** → auto-publish GitHub.

## Ce que contient la 2.0 (récap des grands blocs, tous terminés)

- **Agenda complet** (jour/semaine/mois, priorités, trajets, .ics import/export + récurrences) +
  **planning de révision BTS CG** + notifications.
- **Coach poids** sur mesure (cible + stepper, paliers, barre de progression, plan calories/macros,
  cadence de suivi) — onglet dédié.
- **Entraînement guidé** : 47 exercices **animés**, minuteur de repos, séries, records, 1RM, blocs
  périodisés, programmes par objectif.
- **Suivi corps** : poids (courbe + ETA), mesures (1/jour + courbe tour de taille), sommeil (courbe),
  hydratation (rythme), nutrition (protéines/eau/frigo/courses).
- **Vie & esprit** : rituel du matin (+ série), réflexion du soir, focus Pomodoro (+ pauses),
  habitudes (+ pouls hebdo), quêtes & XP (+ célébration journée parfaite), bien-être/mobilité.
- **Fondations** : 100 % local, sécurisé (contextIsolation, CSP, Electron 43), sauvegarde/import
  robuste, PWA installable iPhone, mises à jour à la demande, accessibilité (aria-current).

## Reste hors boucle (décisions/actions d'Adrien)

- 📸 Scan du frigo (reconnaissance d'image = IA/réseau).
- ⌚ Sync Strava/Garmin/Polar (OAuth = comptes développeur).

## Rotation

#356 — **jalon 2.0.0**. La boucle continue ensuite en **2.0.x** (polish/qualité + retours d'Adrien).
