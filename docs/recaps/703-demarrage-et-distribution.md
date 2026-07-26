# 703 — Lot P0 : démarrage, mémoire de fenêtre et distribution allégée (2.0.302)

## Contexte

Suite directe de l'audit design & contenu du 2026-07-27. Adrien : « fais les premières améliorations
possibles et qui peuvent rapporter le plus ». J'ai pris les six premières lignes du tableau
valeur/effort de l'audit, celles qui touchent le **démarrage** et la **distribution** — c'est-à-dire
ce que l'utilisateur subit à chaque lancement et à chaque mise à jour.

## Ce qui change

### 1. Ménage disque — 42,3 Go rendus (hors dépôt)

`build-dist/` contenait **325 installeurs** accumulés depuis le 9 juillet, ~135 Mio pièce.
644 fichiers supprimés (exe + blockmaps), 3 builds conservés : **43,1 Go → 0,8 Go**.
Artefacts régénérables par `npm run dist`, aucun n'était la version courante.

### 2. Illustrations en WebP — 38,4 Mio → 2,6 Mio (−93 %)

Les 24 planches `exercise-illustrations-v*.png` pesaient **~30 % de l'installeur** et sont **toutes
utilisées** (sprites 3×2 déclarés dans `strength.css`) — donc changement de format, pas suppression.

Le point délicat : **je ne peux pas juger de la qualité à l'œil** (le canal de capture est bloqué).
Donc je l'ai mesurée. `tools/png-to-webp.cjs` (Electron déjà en devDependency, **zéro nouvelle
dépendance** — Chromium sait encoder le WebP via `canvas.toDataURL`) encode chaque planche, **la
redécode, et compare pixel à pixel à l'original** :

| Qualité | Taille finale | Écart moyen | Sous-pixels au-delà du seuil de perception (>16/255) |
|---|---|---|---|
| 0,90 | 1,6 Mio | 1,16/255 | 0,243 % |
| **0,95** ✅ | **2,6 Mio** | **1,07/255** | **0,211 %** |
| 0,98 | 4,4 Mio | 0,96/255 | 0,208 % |

**Résultat mesuré sur l'installeur réel : 135,2 Mio (v2.0.299) → 106,2 Mio (v2.0.302), −29,1 Mio,
−21 %.** Autant en moins à télécharger à l'installation *et* à chaque mise à jour.

Retenu **q=0,95** : au-delà, l'erreur ne baisse plus (elle est structurelle — anneaux de compression
sur les bords francs), on ne paierait que des octets. Le gain de 1 Mio entre 0,90 et 0,95 est du bruit
sur un installeur de 135 Mio, donc j'ai pris la marge de sécurité.

Note de méthode : mon premier seuil portait sur l'**écart ponctuel maximal** et rejetait 17 planches
sur 24. C'était le mauvais juge — un pixel isolé très écarté sur un bord franc ne se voit pas. Le
critère qui correspond à la perception, c'est la **proportion** de sous-pixels déviants ; changé.

### 3. Démarrage sans flash + mémoire de fenêtre

- `show: false` + `ready-to-show` : la fenêtre n'apparaît qu'une fois la page peinte (avant :
  rectangle vide au lancement). **Filet à 8 s** : si `ready-to-show` ne part jamais (page en échec),
  on montre quand même la fenêtre plutôt que de laisser l'app invisible.
- `backgroundColor` accordé au thème système (`nativeTheme.shouldUseDarkColors`) au lieu du
  `#0d1220` codé en dur — plus de rectangle bleu nuit pendant les redimensionnements en thème clair.
- **Géométrie mémorisée** (taille, position, état agrandi) dans un `window-state.json` dédié — pas
  dans `notifications.json`, pour ne jamais risquer les réglages de rappels. Écriture différée de
  400 ms (`resize`/`move` partent en rafale pendant un glisser).

### 4. Le thème « selon l'heure » ne clignote plus

**Correction d'une erreur de mon propre audit.** J'avais écrit que l'app ignorait
`prefers-color-scheme` : faux — j'avais grepé les CSS, alors que l'app l'implémente en JS
(`matchMedia`, mode `auto`, écouteur live). Le vrai défaut était ailleurs : le script anti-flash
acceptait `light|dark|auto` mais **pas `time`**, alors que `currentThemeMode()` l'accepte → un
utilisateur en mode horaire partait en sombre puis basculait, **à chaque lancement**.

Le défaut sans préférence stockée passe de `dark` à `auto`, **mais uniquement à la toute première
ouverture** (aucun `irl-level-up` ni `irl-install-date`). Une installation existante garde `dark` :
basculer le thème sous les pieds de quelqu'un serait une régression, pas une amélioration.

### 5. Une seule identité + notifications correctement attribuées

`APP_NAME = 'IRL LVP UP'` unique (le tray disait encore « Level Up IRL » alors que l'installeur disait
« IRL LVP UP »), et `app.setAppUserModelId('com.adrien.irllvpup')` — sans lui, Windows attribue les
notifications à « Electron ».

### 6. Installeur moins générique

`installerIcon` / `uninstallerIcon` / `installerHeaderIcon` / `shortcutName` / `uninstallDisplayName`
ajoutés, et `irl-lvp-up-logo-source.png` (1,06 Mio, référencé nulle part) exclu du build tout en
restant dans le dépôt. `artifactName` **volontairement pas touché** : le gain serait cosmétique et
le nom du fichier est sur le chemin de l'auto-update.

## Non-régression

- **`sanitizeWindowBounds`** en logique pure + 13 assertions : entrées inexploitables → `null`,
  clamp aux minima et à la zone de travail, position à moitié définie ignorée, **fenêtre perdue
  hors écran** (moniteur débranché) → position oubliée mais taille gardée, chevauchement partiel
  accepté, coordonnées négatives (écran secondaire à gauche) acceptées, `maximized` strictement `true`.
- Check smoke **bloquant `webpArt`** : le CSS doit pointer des `.webp`, plus aucun `.png`, et l'image
  doit **réellement se charger** (planches 1 et 24). Sans backslash — le littéral de gabarit les mange
  (VPS-AUTOPILOT §6).
- Check smoke **bloquant `themeTimeMode`** : `themeModeStored` doit rendre `'time'` et non `'dark'`.
- Test **node bloquant : chaque `url()` du CSS doit pointer un fichier existant**. Trou découvert
  pendant la revue — les 594 tests passaient avec une planche manquante ; seul le smoke sondait
  les planches 1 et 24. Désormais les 24 (et toutes les autres `url()` locales) sont couvertes.
- **595 tests + SMOKE OK.**

## La revue adversariale a rattrapé 8 défauts — dont 4 que j'avais introduits

Le diff est passé par une revue multi-axes (Electron / thème / assets / logique), chaque piste étant
ensuite confiée à un second relecteur chargé de la **réfuter**. Sur 13 pistes : **8 confirmées,
5 réfutées**. Ce n'était pas de la formalité — les quatre premières sont des régressions réelles de
mon propre lot :

1. **Le filet de 8 s rouvrait une fenêtre volontairement mise au tray.** `hide()` *et* `minimize()`
   mettent `isVisible()` à `false` sous Windows : mon filet, jamais désarmé, appelait `show()` — juste
   après que l'app ait promis « je reste active pour tes rappels ». Confirmé par sonde Electron.
   → timer annulé sur `ready-to-show`, `hide`, `minimize`, `closed`.
2. **`win.maximize()` annulait tout l'intérêt de `show:false`.** `maximize()` **affiche** la fenêtre,
   même créée invisible : pour quiconque quitte en fenêtre agrandie — le cas courant — le rectangle
   vide était de retour. → `maximize()` déplacé **dans** `ready-to-show`, juste avant `show()`.
3. **Multi-écran : position jetée et fenêtre rognée à chaque lancement.** Je validais la géométrie
   contre l'écran **principal** uniquement. → `screen.getDisplayMatching()` pour valider contre
   l'écran où était réellement la fenêtre.
4. **Fond blanc derrière une interface sombre.** Je déduisais `backgroundColor` du thème **de
   Windows**, alors que le thème réel vient du `localStorage` du renderer. → le renderer annonce
   désormais le thème appliqué (`theme:effective`), persisté et relu au lancement suivant.
5. **Le thème d'un nouvel utilisateur basculait tout seul entre le 1er et le 2e lancement** : la sonde
   « installation neuve » teste l'absence de `irl-level-up`/`irl-install-date`… qui sont écrites dès
   le premier rendu. → le défaut calculé est **persisté immédiatement**.
6. **`sanitizeWindowBounds` acceptait une position dont la barre de titre est hors écran** — fenêtre
   visible mais impossible à déplacer à la souris. → le bord haut doit être dans la zone de travail.
7. **`invoke` rejette de façon asynchrone** : mon `try/catch` ne l'attrapait pas, et le smoke est
   tombé sur un « unhandled rejection ». → rejet avalé explicitement (important aussi pour la PWA,
   où `window.desktop` n'existe pas).
8. Le trou de couverture des `url()` CSS, ci-dessus.

Réfutées après vérification : le cache du service worker (les planches n'y ont jamais été
préchargées, aucun invariant hors-ligne cassé), la non-réexécutabilité de l'outil de conversion (les
PNG sont dans l'historique git), la publication du logo source par le workflow Pages (sans
conséquence), et deux griefs de couverture de tests sur du code correct.

Domaine : distribution
