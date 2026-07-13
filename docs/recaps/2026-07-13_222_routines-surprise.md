# Boucle #222 (autonome) — 3ᵉ rotation #3 : routines ciblées + « Surprends-moi » · build 1.9.156

**3ᵉ rotation, #3 (mobilité & récup).** Le catalogue de routines couvrait échauffement/mobilité/étirements/récup/sommeil/dos. Ajout de **3 routines ciblées** (course + bureau) et d'un **tirage aléatoire** pour bouger différemment.

## Livré

- **3 nouvelles routines guidées** (catalogue 8 → **11**) :
  - 🦶 **Chevilles & pieds** (course/trail) — cercles, montées sur pointes, équilibre unipodal, mollets… moins d'entorses, meilleure poussée.
  - 💆 **Nuque & trapèzes** (bureau/écrans) — inclinaisons, rentrés de menton, étirement trapèze.
  - 🖐️ **Poignets & avant-bras** — prépare pompes/tractions, soulage le clavier.
- **🎲 Surprends-moi** : un bouton qui lance une routine au hasard (en évitant celle du jour et la précédente), pour découvrir les routines qu'on ne choisirait pas spontanément. Toast + lancement direct en mode guidé.

## Détail technique

- **`lib/logic.js`** : 3 entrées `WELLNESS_ROUTINES` + `surpriseRoutine(excludeKey, seed)` (pur, déterministe si seed, exclusion respectée). Export ajouté.
- **`app.js`** : handler `#wellnessSurprise` — calcule la suggestion du jour, exclut la dernière tirée, lance la routine.
- **`index.html`** : `.wellness-actions` + `#wellnessSurprise`. **`strength.css`** : `.wellness-actions`.

## Vérifs

- `npm run verify` → **254 tests / 254 pass** (+1 `surpriseRoutine`, `wellnessRoutine` enrichi), garde-fou CSS vert, **SMOKE OK** (`wellnessSurprise:true`, `wellness:true`).
- `npm run dist` → **Setup 1.9.156.exe** (app d'Adrien jamais fermée).

## Suite

#4 (comparaison de blocs : progression 1er → dernier bloc / rappel de fin de bloc), puis rotation 4 #1 (mobile/PWA) → point à Adrien.
