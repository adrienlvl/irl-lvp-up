# Récap boucles #08–#10 — Notifications complètes, pont Grand Livre, durcissement sécurité

**Quand :** 2026-07-06 ~03h15–03h45 (mode continu demandé par Adrien — plus d'attente entre les lots)
**Vagues :** 2.4 (fin) ✅ · 2.2 ✅ → **Vague 2 terminée** · Vague S quasi complète
**Statut :** ✅ tout vérifié (23/23 tests, smoke OK en sandbox, app réelle OK sur Electron 43)

## Lot #08 — Notifications complètes (2.4) ✅
- **Rappel avant chaque bloc** : X minutes avant chaque événement du jour non terminé (réglable 5–60 min, défaut 15), une seule notif par événement et par jour. « 🔔 17:30 · Révision compta — Dans 15 min. »
- **Rappel du soir** (heure réglable, désactivable) : s'il reste des blocs ou quêtes, « 🌙 Encore 2 blocs et 3 quêtes aujourd'hui. »
- Réglages ajoutés au panneau Rappels (UI) ; validation stricte côté main (S.3 : clamps numériques, regex HH:MM) ; compat rétro du fichier `notifications.json`.
- Bonus : **fix d'un bug de fuseau horaire** (la date de référence était en UTC → rappels décalés entre minuit et 2h du matin en France).

## Lot #09 — Pont Grand Livre Compta (2.2) ✅ → Vague 2 terminée
- **Côté Grand Livre** (`D:\Le Grand Livre Compta App\le-grand-livre-compta.html`, backup `.bak` créé avant modif) : bouton flottant « ⬇ Exporter planning (IRL LVP UP) » — compte tes cartes de révision dues par date (répétition espacée réelle) et télécharge `legl-planning.json`. Bloc autonome : ne touche à rien d'existant.
- **Côté IRL** : « Importer le planning du Grand Livre (.json) » dans le bloc Planning de révision. Conversion défensive (`glcPlanningToEvents`, S.5 : schéma strict, regex dates/heures, `due` borné 1–500, cap 120 jours, fichier max 1 Mo, passé filtré). Durée auto : 2 min/carte (15–90 min). `refId: glc-<date>` → **réimport sans doublon**, créneaux validés préservés.
- Les créneaux apparaissent en ambre dans les calendriers + vue Ma journée + notifications.

## Lot #10 — Durcissement sécurité (Vague S) ✅ (sauf S.7, volontairement « préparé, pas activé »)
- **S.1** Sandbox renderer activé (`sandbox: true`), préload validé — le smoke-test tourne désormais lui-même en sandbox.
- **S.2** Navigation verrouillée : aucune navigation ni ouverture de fenêtre externe possible (`will-navigate` bloqué, `setWindowOpenHandler` deny).
- **S.4** Revue XSS : toutes les saisies utilisateur passent par `escapeHtml` avant `innerHTML`.
- **S.6** **Electron 33 → 43.0.0** : purge ~18 CVE (dont contournement d'intégrité ASAR, injection de registre Windows, use-after-free multiples). `npm audit` : le seul résiduel est `tar` dans la chaîne electron-builder = **outillage de build, jamais livré dans l'app** (suivi pour la Vague 3).
- Incident réglé au passage : le postinstall d'Electron 43 n'avait pas téléchargé le binaire → `node node_modules/electron/install.js`, puis re-validation complète.

## État global
- **Vague 0 ✅ · Vague 1 ✅ · Vague 2 ✅ · Vague S ✅ (S.7 = préparation future)**
- Reste : Vague 3 (qualité : découpage app.js, CSS, rendu ciblé) + Vague 4 (réservoir de features).
- Prochain livrable immédiat : **rebuild du `.exe`** avec tout dedans (lot #11).

## Git
- `feat(notifications): rappel avant chaque bloc + bilan du soir (2.4 complet)`
- `feat(glc): pont Grand Livre Compta -> calendrier IRL (2.2, clôture Vague 2)`
- `feat(securite): sandbox + verrouillage navigation + electron 43 (Vague S)` *(ce lot)*
