# #290 — Partage natif du bilan du mois (1.9.224)

**Rotation 20 · item #3 · liberté totale (domaine : dashboard / partage)**

## Problème
Le bilan du mois (#289) pouvait être **copié** mais pas **partagé** via le
partage natif (Web Share), alors que le bilan hebdo l'est déjà. Le texte
partageable (`monthlyRecapText`) existait ; il ne manquait que l'objet de partage
et le bouton.

## Amélioration
Un bouton « 📤 Partager mon bilan du mois » complète la carte : Web Share natif
si disponible (mobile / PWA), repli copie presse-papier sinon.

### Logique pure — `shareableMonth(recap)`
- Renvoie `{ title, text }` (titre « 🏆 Mon bilan de <mois> », texte =
  `monthlyRecapText(recap)`), ou `null` si le texte est vide.
- Miroir exact de `shareableWeek` pour la cohérence.

### Rendu — `renderWeeklyReview()` + handler
- Bouton `#shareMonthlyRecap` affiché en même temps que la carte, masqué sinon.
- Clic : `navigator.share(shareableMonth(...))` ; sur `AbortError` (annulation)
  ou absence de Web Share → repli `clipboard.writeText` + feedback « ✓ Copié ».

## Tests
- `logic.test.js` : `shareableMonth` (titre avec mois, `text` = `monthlyRecapText`,
  `null` → `null`).
- `renderer-smoke.cjs` : check `monthlyShare` (présence `#shareMonthlyRecap` +
  cohérence titre/texte).
- `npm run verify` : **313 tests + SMOKE OK** (`whatsNew` vert).
- Vérif navigateur (tab-8) : bouton partager visible, payload
  « 🏆 Mon bilan de juillet 2026 » / « Bilan de juillet 2026 : … ». ✔

## Fichiers
- `src/lib/logic.js` — `shareableMonth()` + export + CHANGELOG[0] 1.9.224.
- `src/app.js` — bouton dans `renderWeeklyReview()` + handler de partage.
- `src/index.html` — `#shareMonthlyRecap` avant `#copyMonthlyRecap`.
- `src/athlete.css` — règle `[hidden]` étendue au bouton partager.
- `src/test/logic.test.js`, `src/test/renderer-smoke.cjs`, `src/package.json`.
