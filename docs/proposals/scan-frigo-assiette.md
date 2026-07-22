# Proposition — Scan frigo / assiette : photo → aliments (CAP 3.0, chantier 6)

_Rédigé le 2026-07-22 · statut : ⏳ **en attente de décision d'Adrien** · CAP 3.0 chantier 6
(« 📷 Scan frigo / assiette — en dernier », `ROADMAP.md:22`)._

> **Pourquoi cette proposition maintenant.** C'est le **seul** chantier du Cap 3.0 sans document de
> design (Coaching ✅, Fondations / Sécurité / Sync / Planning ont chacun le leur dans
> `docs/proposals/`). Le code porte déjà la promesse en clair — `index.html:177` : « **Le scan du
> frigo par photo viendra plus tard.** » — et `SECURITE-RESEAU-S8.md:34` exige explicitement une
> **décision de confidentialité avant tout code**. Cette proposition **ne code rien** : elle cadre la
> décision pour qu'elle ne soit pas prise à la va-vite au moment d'implémenter. Le VPS n'ajoute ni
> dépendance ni surface réseau (§3) ; il documente.

## 1. Le besoin réel

La saisie nutrition est **100 % manuelle** aujourd'hui, et volontairement **agrégée par jour** —
`state.nutrition` = `{date, protein, water, fruit}` (`app.js:22-23`), pas de repas horodaté ni de
calories par aliment. Le frigo (`state.pantry`) se remplit à la main via la recherche d'aliments
(`#foodSearch` → `searchFoods`, `app.js:780/535`, base CIQUAL 2265 aliments dans
`lib/foods-data.js`). Il alimente ensuite le générateur de repas et la liste de courses
(`generateMeals`, `buildShoppingList`).

Le rêve de la roadmap (`AUDIT-ET-ROADMAP-3.0.md:86`) : **« photo → aliments détectés → remplit "Mon
frigo" »**. La valeur pour Adrien : **supprimer la corvée de saisie** du frigo, pas remplacer le
comptage calorique (qui n'existe pas et n'est pas demandé). C'est un **accélérateur de saisie du
pantry**, pas un journal alimentaire par vision.

## 2. Le vrai nœud — la reconnaissance heurte DEUX piliers de l'app à la fois

L'app a deux identités non négociables qui, ensemble, ferment presque toutes les portes classiques :

- **100 % locale, réseau confiné, opt-in strict.** CSP `default-src 'self'` sans `connect-src`
  (`index.html:6`) → **le renderer ne peut appeler aucun hôte externe**. Tout le réseau vit dans le
  process principal Electron, sur **hôtes allowlistés** (calendrier .ics, Google Sheets, OSM/OSRM —
  `electron-main.cjs:59-141`), avec anti-SSRF testé. `SECURITE-RESEAU-S8.md` : « Rien d'autre. Pas
  d'analytics, pas de télémétrie, pas de CDN. »
- **Zéro dépendance runtime, pas de bundler.** 5 scripts en globals, aucun `node_modules` au runtime
  (§3, `CLAUDE.md`).

Or la « reconnaissance d'image d'aliments » n'a que deux familles de solutions, et **chacune casse un
pilier** :

| Voie | Ce qu'elle exige | Pilier heurté |
|---|---|---|
| **API vision cloud** (envoyer la photo à un service) | nouvelle sortie réseau + clé API en `safeStorage` + **la photo du frigo/de l'assiette quitte l'appareil** | confidentialité + posture « 100 % local, zéro télémétrie ». Sur **web/PWA**, il faut en plus **relâcher la CSP** (`connect-src` vers l'hôte API) — pas de main pour proxifier. |
| **Modèle on-device** (TF.js / ONNX Runtime Web) | **dépendance runtime** (violée §3) + **fichier modèle de plusieurs Mo** dans une app volontairement légère et offline + CSP `script-src` à relâcher (`wasm-unsafe-eval`) | zéro-dépendance + poids du bundle |

Et même en acceptant l'un des deux : **la reconnaissance générique d'aliments est peu fiable**
(un frigo réel = objets qui se chevauchent, emballages, lumière) et **l'estimation de quantité est
non résolue** (combien de grammes sur la photo ?). Le résultat scientifique/technique est **nuancé**,
pas « scanne et c'est rempli » — exactement le genre de sur-promesse que le mandat élite dit de ne pas
cranker.

## 3. Options

| | Option | Ce que ça livre | Coût / risque |
|---|---|---|---|
| **A** | **API vision cloud, opt-in** — IPC dans le main → POST photo vers un hôte allowlisté ; clé en `safeStorage` ; désactivé par défaut. | La vraie « reconnaissance » multi-aliments. | Casse « 100 % local » : la photo sort. Coût récurrent/clé. **Web = CSP relâchée** (pas de main-proxy). Précision et quantités faibles. C'est une **décision de vie privée**, pas juste technique. |
| **B** | **Modèle on-device** (classif. via WASM) — tout reste sur l'appareil. | Reconnaissance sans fuite de données. | **Dépendance runtime + modèle multi-Mo** (double violation §3 / légèreté). CSP `wasm` à relâcher. Précision réelle sur frigo médiocre ; quantités toujours non résolues. |
| **C** | **Code-barres on-device + confirmation CIQUAL** — `BarcodeDetector` natif (zéro dép, on-device, là où dispo : Chromium/Electron) décode l'EAN d'un produit emballé → on **propose** une correspondance dans la base CIQUAL locale, l'utilisateur **confirme** avant ajout au frigo. | Ajout **exact et rapide** pour les produits emballés, **sans cloud ni dépendance ni modèle**. | Ne marche que sur l'**emballé** (pas les légumes en vrac) ; `BarcodeDetector` **absent sur iOS Safari** → repli manuel ; le mapping EAN→aliment CIQUAL est **approximatif** (CIQUAL indexe des aliments génériques, pas des références commerciales) → **confirmation humaine obligatoire**. |
| **D** | **Capture assistée, sans reconnaissance** — bouton « prendre une photo » (`<input capture>`), la photo sert d'aide-mémoire ; la saisie reste la recherche CIQUAL existante, juste mieux mise en avant. | Zéro risque, zéro dép, livrable en autonomie. | Ne tient **pas** la promesse « aliments détectés » — c'est un pas, pas le scan. |
| **E** | **Ne rien faire maintenant** — garder le placeholder honnête, rester 100 % local. | Préserve l'identité de l'app intacte. | La promesse `index.html:177` reste non tenue (mais elle dit déjà « plus tard »). |

## 4. Recommandation — **E aujourd'hui ; C comme premier pas si Adrien veut avancer ; A/B seulement sur décision explicite de vie privée**

- **La reconnaissance vraie (A/B) n'est pas mûre pour cette app aujourd'hui.** A fait sortir tes
  photos de nourriture vers un tiers et relâche la CSP web ; B ajoute une dépendance + un modèle lourd
  à une app dont la légèreté et le offline sont un choix. Et **les deux** butent sur la quantité
  (grammes non estimables de façon fiable) — donc même livrés, ils ne remplissent le frigo qu'à moitié
  et exigent une correction manuelle. Le rapport valeur/risque est **mauvais maintenant**.
- **Si tu veux un pas concret, C est le meilleur compromis** : le **code-barres** est le seul canal
  où « photo → aliment » est **exact**, et `BarcodeDetector` le fait **on-device, sans dépendance,
  sans cloud, sans toucher la CSP**. Il dégrade proprement (pas de caméra/API → saisie manuelle
  actuelle). Limite assumée : produits **emballés** seulement, et **confirmation** contre CIQUAL
  obligatoire (pas d'ajout aveugle). C'est ambitieux **mais sûr**, dans l'esprit du reste de l'app.
- **A/B ne se décident pas en autonomie** : ils engagent ta vie privée et l'identité « 100 % local »
  de l'app (`SECURITE-RESEAU-S8.md:34` l'exige noir sur blanc). Le VPS **n'implémentera ni l'un ni
  l'autre seul**, même règle que P1.2 (IndexedDB) et le chantier sécurité.

> Note de séquencement : ce chantier est **le dernier** du Cap 3.0 (`ROADMAP.md:22`). Rien ici ne
> presse ; l'intérêt de la proposition est de **fermer la porte proprement** (E/C) plutôt que de
> laisser un « plus tard » flou déclencher, un jour de disette de backlog, un bricolage cloud non
> décidé.

## 5. Risques

- **Vie privée (A)** : une photo de repas/frigo est une donnée personnelle qui, envoyée à une API,
  peut être mise en cache/indexée côté tiers. Irréversible une fois partie. À trancher **avant** tout
  code, pas après.
- **Posture web (A)** : ajouter `connect-src <hôte>` à la CSP est une **régression de posture**
  mesurable côté PWA (le desktop peut proxifier par le main ; le web non). À ne pas faire à la légère.
- **Dépendance / poids (B)** : un modèle WASM multi-Mo alourdit le premier chargement et le cache
  offline d'une app qui se veut instantanée ; et c'est une dépendance runtime, interdite (§3).
- **Sur-promesse (A/B/C)** : « scanne ton frigo » laisse croire à un remplissage automatique complet.
  La quantité n'est pas résolue et la reconnaissance générique se trompe → **frustration** si l'UX ne
  dit pas clairement « propose, tu confirmes ». Toute UI de scan doit rester **une proposition à
  valider**, jamais un ajout automatique.
- **Fragmentation plateforme (C)** : `BarcodeDetector` n'existe pas sur iOS Safari → prévoir le repli
  dès la conception, sinon l'iPhone d'Adrien (cible Sync du Cap 3.0) n'en profite pas.
- **Faux départ de schéma** : si un jour on veut logger des repas détaillés (calories par aliment), le
  modèle actuel `{date,protein,water,fruit}` ne suffit pas. À **ne pas** improviser sous prétexte de
  scan — c'est une décision de schéma séparée, à cadrer avec la réécriture IndexedDB (P1.2) si elle a
  lieu.

## 6. Ce qui dépend d'Adrien

1. **Périmètre : E, C, A ou B ?** (ma reco : **E maintenant** ; **C** si tu veux un premier pas sûr ;
   **A/B** seulement si tu assumes la contrepartie explicitement.)
2. **Acceptes-tu, pour A, que des photos de nourriture quittent l'appareil** vers une API de vision —
   et **relâcher la CSP web** pour ça ? (c'est LA décision de vie privée bloquante, `S8:34`)
3. **Acceptes-tu, pour B, une dépendance runtime + un modèle de plusieurs Mo** dans une app
   volontairement zéro-dépendance et offline ? (ça contredit §3 — donc décision explicite requise)
4. Si **C** : le périmètre « **produits emballés uniquement, confirmation CIQUAL obligatoire, repli
   manuel hors Chromium** » te convient-il comme **v1 honnête** ? (l'option réalisable **en étapes
   autonomes** — `BarcodeDetector` est natif, zéro dép, on-device — façon P6 : logique pure de mapping
   EAN→CIQUAL testée d'abord, puis UI + smoke.)
5. Confirmes-tu que **A et B se décident et s'implémentent en session supervisée**, jamais en
   autonomie de nuit (même règle que P1.2 et le socle sécurité) ?
