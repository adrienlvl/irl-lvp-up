# Boucle #228 (autonome) — 5ᵉ rotation #1 : partage natif du programme · build 1.9.162

**5ᵉ rotation, #1 (mobile/PWA).** Le programme se copiait déjà en presse-papier. Ajout du **partage natif Web Share** — sur mobile, la feuille de partage du système (Messages, WhatsApp, Notes, mail…) s'ouvre pour envoyer ton programme à un coach/pote.

## Livré

- **Bouton « 📤 Partager »** dans les actions du programme par objectif.
  - Mobile / navigateur compatible → `navigator.share({title, text})` (feuille de partage OS).
  - Sinon (desktop, Electron) → **repli automatique** : copie dans le presse-papier + « ✓ Copié ».
  - Annulation du partage gérée silencieusement (pas de repli intempestif).
  - Sûr : le contenu ne part que si **toi** choisis un destinataire dans la feuille OS ; rien n'est envoyé en réseau par l'app.

## Détail technique

- **`lib/logic.js`** : `shareableProgram(program, {nutri})` → `{ title, text }` (titre = emoji + nom + « ma semaine d'entraînement », texte = `objectiveProgramText`). `null` si vide. Pur + testé.
- **`app.js`** : bouton `#objectiveShare` + handler async (share natif → repli presse-papier, gestion `AbortError`).

## Vérifs

- `npm run verify` → **260 tests / 260 pass** (assertions `shareableProgram` ajoutées), garde-fou CSS vert, **SMOKE OK** (`objectiveShare:true`).
- **Navigateur** : programme généré → bouton « 📤 Partager » présent ; `navigator.share` absent ici → clic = repli « ✓ Copié ». ✓
- `npm run dist` → **Setup 1.9.162.exe** (app d'Adrien jamais fermée).

## Suite (rotation 5)

#1 ✅ (#228). Prochain : #2 onboarding, #3 bien-être, #4 coaching.
