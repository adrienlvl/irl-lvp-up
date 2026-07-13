# Boucle #252 (autonome) — 11ᵉ rotation #1 : partage d'une routine bien-être · build 1.9.186

**11ᵉ rotation, #1 (mobile/PWA).** On pouvait déjà partager le programme, le bilan hebdo et la progression de bloc. Ajout du **partage d'une routine bien-être précise** (ses mouvements) via Web Share.

## Livré

- **Bouton « 📤 »** sur la carte de suggestion bien-être du jour → partage la routine (titre, but, liste numérotée des mouvements avec durée + repère).
  - Mobile → `navigator.share` (feuille OS) ; sinon → repli presse-papier (« ✓ »).

## Détail technique

- **`lib/logic.js`** : `shareableRoutine(key)` → `{ title, text }` (mouvements de `wellnessRoutine`) ou null. Pur + testé.
- **`app.js`** : bouton `.ws-share` dans `renderWellnessSuggest` + handler (share natif → repli copie).
- **`strength.css`** : `.wellness-suggest .ws-share`.

## Vérifs

- `npm run verify` → **282 tests / 282 pass** (+1 `shareableRoutine`), garde-fou CSS vert, **SMOKE OK** (`wellnessRoutineShare:true`).
- **Navigateur** (suggestion = Mobilité hanches) : clic 📤 → `navigator.share({title:"🦵 Routine bien-être : Mobilité hanches", text:"…6 min…\n1. Fente basse + rotation — 45 s : …"})`. ✓
- `npm run dist` → **Setup 1.9.186.exe** (app d'Adrien jamais fermée).

## Suite (rotation 11)

#1 ✅ (#252). Prochain : #2 onboarding, #3 bien-être, #4 coaching. Boucle autonome continue. _(Publication option B active ; nouveau tag uniquement si Adrien dit « publie ».)_
