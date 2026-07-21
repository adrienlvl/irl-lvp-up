# #651 — Priorité du jour : l'habitude en jeu n'est plus rappelée deux fois (build 2.0.259)

## Rotation (§4 bis)

Priorité de nuit = coaching. Contrôle des 5 derniers recaps **par numéro** :
`650 sommeil · 649 athlete · 648 focus · 647 coach · 646 athlete`.
→ `sommeil`/`athlete` (2 derniers) exclus, `athlete` aussi 2× → exclu ; `focus` (1×) et **`coach`** (1×,
hors 2 derniers) permis. **`coach`** pris, aligné priorité de nuit. Angle NEUF trouvé par exploration
ciblée (agent Explore) sur `adaptiveCoachFocus`/`attentionDigest`/`coachDayPriority` — distinct des
contradictions insight↔action déjà closes (#588/#647/#648), des milestones (déjà dédupliqués en 2.0.207/
2.0.240) et du recadrage santé↔momentum (#607/#614). Quota §4 bis.4 non déclenché (#645 = proposition dans
les 10 derniers recaps).

## Le défaut (redondance §3 inter-cartes, prouvée en rendu chargé §4 ter)

`coachDayPriority` a pour rôle de **débarrasser** le bandeau « À rattraper » (`attentionDigest`, réactif)
de ce que la carte « Le focus du moment » (`adaptiveCoachFocus`, proactif) **porte déjà** — la dédup
transversale de la « priorité du jour » (#606/#607). Or elle rate **l'habitude en jeu** :

- **Carte focus** — `adaptiveCoachFocus` (`logic.js:8006`) appende
  `« Ne casse pas la chaîne : ton habitude « Méditation » tient depuis 12 jours… »` et renvoie le champ
  `habitAtRisk` (`logic.js:8044`). Cette note est **orthogonale au pilier** : elle s'ajoute quel que soit
  le pilier choisi (commentaire `logic.js:7992`).
- **Bandeau « À rattraper »** — `attentionDigest` (`logic.js:5432`) pousse la ligne
  `« 1 habitude à relancer avant de perdre la série »` (clé `habits`, sév `med`).

Les deux sont rendus **sur le même dashboard au même instant** (`renderCoachFocus` / `renderAttention`,
`app.js`) et pointent le **même geste** (aller cocher l'habitude aujourd'hui) → double rappel dos à dos.

**Pourquoi la dédup les rate** (`logic.js:8074`+`8106`) : `covered = focus.pillar`, et le filtre retire
`d` si `KEY_TO_PILLAR[d.key] === covered`. Mais le coach **ne choisit jamais** le pilier `'habits'` (c'est
une note en plus, pas un pilier) → `KEY_TO_PILLAR['habits'] = 'habits'` ne vaut jamais `covered`, la ligne
`habits` du digest survit **toujours** au filtre. L'entrée `habits:'habits'` de `KEY_TO_PILLAR` était du
**code mort** pour ce chemin. `d.key !== primaryKey` ne la sauve pas non plus (en cas normal `primaryKey`
reste `null`, posé seulement dans les branches recadrage-santé / digest-promu).

**État déclencheur vérifié en Node** (rendu réel, aujourd'hui) : une habitude « Méditation » prévue tous
les jours, série 12, non cochée aujourd'hui + assez de séances de focus récentes pour que le coach choisisse
le pilier `focus` en `rebuild` → `habitAtRisk = { name:'Méditation', streak:12 }`, `primary.source='focus'`,
et `deduped` contenait **encore** `habits` (« 1 habitude à relancer… »). Cas ultra-courant (n'importe quel
jour où une série d'habitude est en jeu et où le coach parle d'un autre pilier).

## Le correctif (curation §3, zéro champ ajouté)

`coachDayPriority` (`logic.js`) retire la ligne `habits` du digest **quand la carte la porte déjà** — mais
**uniquement** quand la n°1 rendue **est** le focus :

```js
const focusCarriesHabit = !!(focus && focus.habitAtRisk && primary && primary.source === 'focus');
const deduped = digest.filter(d => d && KEY_TO_PILLAR[d.key] !== covered && d.key !== primaryKey
  && !(d.key === 'habits' && focusCarriesHabit));
```

**Garde `source === 'focus'` — le point de correction clé.** Dans le **recadrage santé** (`reframed`,
`primary.source === 'health'`), la carte montre « récupère », **pas** l'insight du focus → la note
d'habitude n'y est plus visible. Dédupliquer la ligne digest dans ce cas ferait **disparaître le rappel des
deux surfaces**. On ne retire donc la ligne que lorsque l'insight du focus (qui la contient, visible ou sous
« ＋ plus de contexte ») est réellement rendu. Aucun champ ajouté : on lit le `habitAtRisk` déjà renvoyé.
Seuils compatibles (carte ≥ 3, digest ≥ 2 : quand `habitAtRisk` est posé la série est ≥ 3 → la ligne digest
est un sur-ensemble sûr à masquer).

## Contrôle §4 ter — rendu cumulé relu (sonde Node + smoke Electron)

- **Cas normal** (pilier focus, habitude en jeu) : bandeau « À rattraper » **après** = plus de
  « habitude à relancer » (seule « Sauvegarde tes données » reste), la carte focus porte bien
  « Ne casse pas la chaîne… ». Une seule voix pour le rappel d'habitude.
- **Non-régression recadrage santé** (forme basse → carte « récupère ») : la ligne « habitude à relancer »
  **reste** dans le bandeau (elle y est le seul rappel). Vérifié.
- **Non-régression sans note** (focus sans `habitAtRisk`) : la ligne digest survit (existant #607 intact).

## Vérification

- `cd src && xvfb-run -a npm run verify` → **100 % vert** (EXIT=0, css-lint vert).
- **576 tests** (+2 : dédup habitude portée par la carte / non-régression sans note ; recadrage santé
  garde la ligne).
- Check smoke **bloquant `coachDayPriority`** étendu : 3 volets LOGIQUE (`dpHab` retire `habits` + garde
  `backup` ; `dpHabNo` garde `habits` ; `dpHabRef` recadrage santé garde `habits`) **+** un volet RENDU
  réel (état chargé pilier focus : `#attentionDigest` sans « habitude », `#coachFocus`/`#coachMore` avec
  « Ne casse pas la chaîne »).
- Bump **2.0.258 → 2.0.259** : `package.json` + entrée CHANGELOG + 2 assertions `CHANGELOG[0].v`
  (`logic.test.js` + `renderer-smoke.cjs` check `whatsNew`).

Source de conception : une seule instruction actionnable prime ; « retirer une note en vaut souvent deux
ajoutées » (§3).

Domaine : coach
