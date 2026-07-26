# 🔍 Audit complet — design & contenu (2026-07-27, build 2.0.301)

_Demandé par Adrien : « audit de l'application entière, niveau design et contenu ». Tout ce qui suit est
**mesuré dans le dépôt**, pas estimé. Chaque constat porte sa preuve (commande ou fichier:ligne).
La dernière release publiée est **v2.0.299** — 2.0.300 et 2.0.301 sont sur master **sans tag**._

---

## 📊 L'app en chiffres (relevé du 2026-07-27)

| Mesure | Valeur | Source |
|---|---|---|
| Onglets | 8 (dashboard, poids, athlete, nutrition, focus, library, alternance, settings) | `grep data-page= index.html` |
| Sections / panneaux | 52 `<section>`, 47 `.panel-heading` | `index.html` |
| Feuilles CSS chargées | **17** | `ls src/*.css` |
| `logic.js` | **1,05 Mo / 11 201 lignes** (un seul fichier) | `wc` |
| `app.js` | 385 Ko / 1 199 lignes (lignes très longues) | `wc` |
| Exercices | **104**, avec 4 champs de coaching chacun | `exercises-data.js` |
| Aliments | table CIQUAL, 255 Ko | `foods-data.js` |
| Assets embarqués | **41 Mio** (24 planches PNG + logo) | `du -sh src/assets` |
| **Installeur v2.0.299** | **141 795 629 o ≈ 135 Mio** | `gh release view` |
| `build-dist/` sur le disque | **44 Go — 325 installeurs conservés** | `du -sh build-dist` |
| Tests | 593 + smoke bloquant | `npm run verify` |

---

## 🎨 Volet DESIGN — 8 constats

### D1. 17 feuilles CSS, aucune couche de tokens — les overrides gagnent par ordre de chargement
`style.css`, `theme.css`, `polish.css`, `pages.css`, `extras.css` (49 Ko), `athlete.css` (32 Ko),
`strength.css` (41 Ko), `ultra.css`, `companion.css`, `calendar.css`, `calendar-page.css`, `trail.css`,
`growth.css`, `mission-control.css`, `roadmap.css`, `desktop.css`, `print.css`.

`pages.css` ne gagne pas parce qu'il est *plus spécifique* mais parce qu'il charge **en dernier**. C'est
exactement ce qui a produit le bug des eyebrows (une règle a aplati la hiérarchie de 47 panneaux sans
qu'aucun test ne le voie). **C'est la cause structurelle du « le design est toujours mauvais »** : il n'y
a pas de système, il y a une sédimentation.

### D2. Le thème ne suit jamais le système
**0 occurrence de `prefers-color-scheme`** dans les 17 feuilles. Seul `:root[data-theme=…]` existe. Au
tout premier lancement, l'app ne respecte donc pas la préférence claire/sombre de Windows ou d'iOS.

### D3. Flash au lancement du .exe
`BrowserWindow` est créé sans `show:false` ni `ready-to-show` (**0 occurrence**, `electron-main.cjs:26`),
avec `backgroundColor:'#0d1220'` codé en dur. En thème clair, la fenêtre s'ouvre bleu nuit puis bascule.
C'est la première demi-seconde que voit l'utilisateur, à chaque lancement.

### D4. La fenêtre ne mémorise ni sa taille ni sa position
Aucun `getBounds`/`setBounds`/`isMaximized` dans `electron-main.cjs`. Chaque lancement repart à
1120×820 centré, même si Adrien l'avait maximisée la veille.

### D5. Hiérarchie typographique plate
**62 `<h2>` pour 8 `<h3>`** sur 52 sections. Presque tout est au même niveau : la page se lit comme une
liste de blocs équivalents. Un écran dense sans hiérarchie *est* un écran fatigant, indépendamment des
couleurs — c'est le vrai sujet derrière le retour d'Adrien.

### D6. États vides à deux vocabulaires
20 usages du composant `.empty-state`, mais **~34 messages « Aucun / Aucune / Pas encore / Rien à »**
écrits en texte brut ailleurs dans `app.js`. Même situation, deux traitements visuels.

### D7. Accessibilité : bien commencée, incomplète
- ✅ 69 `aria-label` pour 77 `<button>` — les boutons-icônes sont couverts.
- ⚠️ **163 `<input>` pour 142 `<label>`** → ~21 champs sans étiquette liée.
- ⚠️ **4 `aria-live` seulement** dans une app où presque tout se met à jour en direct (XP, toasts, coach,
  compteurs). Un lecteur d'écran rate l'essentiel des retours.
- ⚠️ 4 `role=` au total.

### D8. Trois noms pour une seule app
Tray : « Level Up IRL » (`electron-main.cjs:190`) · `productName` : « IRL LVP UP » · logo/manifest :
« IRL LVP UP ». L'identité n'est pas stabilisée.

---

## ✍️ Volet CONTENU — 4 constats

### C1. La base d'exercices est le meilleur actif de l'app — et elle est sous-exploitée
104 exercices, chacun avec **`cue` / `explain` / `goal` / `avoid`**. Le français est précis et orienté
sécurité (« genou avant qui part vers l'intérieur », « ajouter de la charge avant de maîtriser 10 pompes
propres »). C'est du contenu de coach, pas du remplissage. **Rien à réécrire.**

### C2. Mais aucun lien de progression n'existe *dans la donnée*
La chaîne `pompes inclinées → pompes classiques → pompes lestées` est écrite **en prose** dans les champs
`explain`, jamais déclarée en structure. L'arbre de skills (#701) le fait pour 4 familles ; les 104
exercices restent une liste plate. Conséquence : l'app ne peut pas dire « tu maîtrises A, essaie B ».

### C3. La science est dans le code, jamais sous les yeux de l'utilisateur
Israetel/RP, Zourdos, Seiler, Bosquet, Lauersen, Epley sont cités **en commentaires de `logic.js`**.
Pour un mandat « coaching élite fondé science », l'absence de sources visibles est un manque de
**contenu**, pas de code : un « pourquoi ce chiffre ? » par recommandation clé changerait la confiance.

### C4. La documentation projet a dépassé sa lisibilité
697 recaps · 15 documents d'audit/roadmap · `ROADMAP.md` à **3 746 lignes** mélangeant directives VPS,
archive, backlog et priorités. Le coût : chaque session doit re-trouver l'état réel.

---

## 💿 Volet .EXE / DISTRIBUTION — 5 constats

### E1. 41 Mio d'illustrations dans un installeur de 135 Mio
Les 24 planches `exercise-illustrations-v1..24.png` (~1,7 Mo chacune) sont **réellement utilisées** —
`strength.css:3` les monte en sprites 3×2 (`.sheet-1`…`.sheet-24`, `background-size:300% 200%`). Ce n'est
pas du mort à supprimer, c'est du **format à changer** : en **WebP q82**, ces 41 Mio tombent
vers ~6-9 Mio. Gain : **installeur ~105 Mio au lieu de 135**, et surtout ~30 Mio de moins à télécharger
à chaque mise à jour.

### E2. Aucune signature de code → SmartScreen à chaque installation
Ni `certificateFile` ni `signtoolOptions` dans `package.json`. Windows affiche « Windows a protégé votre
PC » à l'ouverture de l'installeur. **C'est le pire écran de l'expérience produit**, et le premier que
voit quiconque à qui Adrien montre l'app. Seule solution réelle : un certificat de signature (achat, ~200-400 €/an,
décision d'Adrien — pas quelque chose que je peux résoudre en code).

### E3. Assistant d'installation générique
Pas de `installerIcon`, `uninstallerIcon`, `installerHeaderIcon`, `shortcutName`, `artifactName`, ni
`license`. `oneClick:false` + `allowToChangeInstallationDirectory` + `perMachine:false` sont en revanche
les bons choix.

### E4. 44 Go de `build-dist/` sur le disque d'Adrien
**325 installeurs** conservés, du 1.8.1 (9 juillet) à aujourd'hui, ~135 Mio pièce. Nettoyage trivial,
impact immédiat.

### E5. L'auto-update, lui, est sain
`autoDownload`, installation à la fermeture, sondage 3 h, six états remontés au renderer, blockmap publié
pour les mises à jour différentielles. Rien à corriger. Seul point : **2.0.300 et 2.0.301 ne sont pas
taguées** — les utilisateurs sont encore sur 2.0.299 (arbre de skills et progression au gilet non livrés).

---

## 🎯 Ce que je recommande, par ordre de rapport valeur/effort

| # | Action | Volet | Effort | Impact |
|---|---|---|---|---|
| 1 | Nettoyer `build-dist/` (garder 3 installeurs) | .exe | 2 min | **44 Go rendus** |
| 2 | Taguer v2.0.301 → livrer skills + gilet | .exe | 5 min | Adrien reçoit ce qui est déjà écrit |
| 3 | `show:false` + `ready-to-show` + fond selon thème | design | 20 min | plus de flash au lancement |
| 4 | Mémoriser taille/position de fenêtre | design | 30 min | confort quotidien |
| 5 | PNG → WebP sur les 24 planches | .exe | 1 h | **−30 Mio** installeur *et* mises à jour |
| 6 | Unifier le nom (« IRL LVP UP » partout) | design | 15 min | cohérence d'identité |
| 7 | `prefers-color-scheme` comme thème par défaut | design | 30 min | respect de l'OS au 1er lancement |
| 8 | Passer les ~34 messages vides au composant `.empty-state` | design | 1 h | cohérence sur toute l'app |
| 9 | Étiqueter les ~21 `<input>` orphelins | a11y | 1 h | conformité réelle |
| 10 | `aria-live` sur XP, toasts, coach, compteurs | a11y | 1 h | l'app devient utilisable au lecteur d'écran |
| 11 | **Couche de tokens CSS** (`design-tokens.css` chargé en 1er, tout le reste consomme) | design | 1 jour | **fin des collisions de cascade** |
| 12 | Hiérarchie : h2 → h3 dans les panneaux, échelle typo assumée | design | 1 jour | l'écran redevient lisible |
| 13 | Déclarer `regression`/`progression` sur les 104 exercices | contenu | 1 jour | l'app peut enfin proposer la marche suivante |
| 14 | « Pourquoi ce chiffre ? » — sources visibles sur les recos clés | contenu | 1 jour | la promesse science-first devient visible |
| 15 | Signature de code | .exe | achat | **supprime SmartScreen** |

Les points 11 → 14 sont les seuls **vrais** chantiers ; 1 → 10 sont des corrections que les boucles
autonomes peuvent absorber une par une.

---

## ⚠️ Ce que cet audit ne couvre pas

- Je n'ai **pas** pu regarder l'app tourner : le canal de capture d'écran est bloqué depuis plusieurs
  sessions. Les constats de design sont tirés du **code et des mesures**, pas d'une observation visuelle.
  Un jugement esthétique fin (est-ce que ça *donne envie* ?) reste à faire écran par écran.
- Je n'ai pas audité la **qualité pédagogique** des ~2 265 aliments CIQUAL (données officielles, présumées
  saines).
- La sécurité a son propre document (`SECURITE-RESEAU-S8.md`) — non rejouée ici.

_Audit rédigé le 2026-07-27 sur le build 2.0.301._
