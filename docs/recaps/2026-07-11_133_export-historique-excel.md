# Boucle #133 (autonome) — Export historique vers Excel · build 1.9.67

**Contexte :** 58ᵉ itération de la boucle autonome. Aire : Athlète / données (Adrien est à l'aise avec Excel — BTS CG).

## Livré

Un bouton **« 📊 Exporter (Excel) »** dans le panneau d'historique **copie l'historique d'entraînement** dans le presse-papiers au format **TSV** (tabulations) → collage direct dans Excel/tableur, une colonne par champ :

`Date · Type · Durée (min) · Distance (km) · RPE · Exercices` — une ligne par séance, du plus récent au plus ancien.

Complément à l'export JSON complet (sauvegarde) : ici, une extraction ciblée et exploitable pour analyser ses séances soi-même.

## Détail technique

- `lib/logic.js` : `workoutsTable(workouts, sep='\t')` pur + testé — en-tête + lignes triées récent→ancien, champs nettoyés (retire tab/retour-ligne/`;`), exercices concaténés.
- `app.js` : handler `#exportHistoryTsv` → `navigator.clipboard.writeText(workoutsTable(...))` + retour « Copié ✓ (colle dans Excel) ».
- `index.html` : bouton dans le panneau historique.

## Vérifs

- `npm run verify` → **168 tests / 168 pass** (+1 : `workoutsTable` — en-tête, tri, séparateur custom, vide/non-tableau), **SMOKE OK** (`exportTsv:true`).

_Incident corrigé : le check smoke contenait `.split('\n')` **dans une template literal** → le `\n` devenait un vrai saut de ligne cassant la chaîne évaluée dans le renderer ("Invalid or unexpected token"). Remplacé par `String.fromCharCode(10)`. Rien d'anormal côté app._
