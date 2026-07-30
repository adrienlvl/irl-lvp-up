'use strict';
// Garde-fou CSS : détecte les déclarations à parenthèses déséquilibrées (ex. le bug
// width:min(440px,calc(100% - 32px) corrigé en 1.9.109) et les accolades non fermées.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const dir = path.join(__dirname, '..');
const cssFiles = fs.readdirSync(dir).filter(f => f.endsWith('.css'));

test('CSS : au moins un fichier de style présent', () => {
  assert.ok(cssFiles.length > 0);
});

test('CSS : parenthèses équilibrées dans chaque déclaration', () => {
  const offenders = [];
  for (const f of cssFiles) {
    const clean = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    for (const part of clean.split(/[{};]/)) {
      const idx = part.indexOf(':');
      if (idx < 0) continue;
      const prop = part.slice(0, idx);
      // ignore les at-règles et conditions media (le « ( » est côté propriété)
      if (prop.includes('(') || prop.trim().startsWith('@')) continue;
      const val = part.slice(idx + 1);
      const open = (val.match(/\(/g) || []).length, close = (val.match(/\)/g) || []).length;
      if (open !== close) offenders.push(`${f} → ${prop.trim()}:${val.trim().slice(0, 60)} (${open} vs ${close})`);
    }
  }
  assert.deepEqual(offenders, [], 'déclarations CSS à parenthèses déséquilibrées');
});

// Les 594 tests passaient avec une planche d'illustration manquante : rien ne vérifiait que les
// url() du CSS pointent un fichier qui existe. Trou découvert lors du passage PNG → WebP (2.0.302).
test('CSS : chaque url(...) locale pointe un fichier qui existe', () => {
  const missing = [];
  for (const f of cssFiles) {
    const clean = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const refs = clean.match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/g) || [];
    for (const ref of refs) {
      const raw = ref.replace(/^url\(\s*['"]?/, '').replace(/['"]?\s*\)$/, '').trim();
      // On ne juge que les chemins locaux : ni data:, ni http(s):, ni #fragment.
      if (!raw || /^(data:|https?:|\/\/|#)/i.test(raw)) continue;
      const target = path.join(dir, raw.split('?')[0].split('#')[0]);
      if (!fs.existsSync(target)) missing.push(`${f} → ${raw}`);
    }
  }
  assert.deepEqual(missing, [], 'url() CSS pointant un fichier absent');
});

test('CSS : accolades équilibrées par fichier', () => {
  const offenders = [];
  for (const f of cssFiles) {
    const clean = fs.readFileSync(path.join(dir, f), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const open = (clean.match(/\{/g) || []).length, close = (clean.match(/\}/g) || []).length;
    if (open !== close) offenders.push(`${f} (${open} vs ${close})`);
  }
  assert.deepEqual(offenders, [], 'accolades déséquilibrées');
});

// Surfaces qui doivent basculer avec le thème. Chacune de ces règles est restée figée en
// bleu nuit pendant des mois : en thème clair, la barre de navigation restait sombre, et les
// listes déroulantes affichaient du texte sombre sur fond sombre (illisible).
test('CSS : les surfaces sensibles au thème passent par un token', () => {
  const lu = f => fs.readFileSync(path.join(dir, f), 'utf8');
  const attendus = [
    ['polish.css', /\.app-nav\{[^{}]*background:var\(--nav-bg\)/, 'barre de navigation'],
    ['style.css', /option\{background-color:var\(--dialog-bg\)/, 'options des listes déroulantes'],
    ['calendar-page.css', /\.calendar-form\{[^{}]*background:var\(--card\)/, 'formulaire du calendrier'],
    ['growth.css', /\.pc-tag\.pc-after\{background:var\(--accent\)[;}]/, 'badge APRÈS (fond plein, encre foncée dessus)'],
  ];
  const rates = attendus.filter(([f, re]) => !re.test(lu(f))).map(([f, , quoi]) => `${f} → ${quoi}`);
  assert.deepEqual(rates, [], 'surfaces figées en sombre');

  // Le repère « aujourd'hui » du calendrier doit rester distinct du simple survol.
  const cal = lu('calendar-page.css');
  const hover = (cal.match(/\.month-day:hover\{background:(var\([^)]*\))\}/) || [])[1];
  const today = (cal.match(/\.month-day\.today\{background:(var\([^)]*\))/) || [])[1];
  assert.ok(hover && today, 'les deux règles doivent exister');
  assert.notEqual(today, hover, '« aujourd’hui » ne doit pas se confondre avec le survol');
});

// Rendu iPhone : l'en-tête doit rendre la largeur au texte sous 560 px. Mesuré avant correctif
// sur 390 px de large : colonne de texte à 110 px, titre cassé sur 3 lignes, message sur 5.
// Garde STRUCTURELLE (elle vérifie que la règle existe, pas son rendu) — le rendu lui-même se
// mesure par sonde Electron, qui ne tient pas dans un test node.
test('CSS : l’en-tête rend la largeur au texte sur écran étroit', () => {
  const pages = fs.readFileSync(path.join(dir, 'pages.css'), 'utf8');
  const mq = pages.match(/@media\(max-width:560px\)\{[\s\S]*?\n\}/);
  assert.ok(mq, 'la requête média mobile de l’en-tête doit exister');
  const bloc = mq[0];
  assert.match(bloc, /\.hero\{[^}]*flex-wrap:wrap/, 'l’en-tête doit pouvoir passer à la ligne');
  assert.match(bloc, /\.hero>div:not\(\.hero-actions\)\{[^}]*flex:1 1 100%/, 'le texte doit prendre toute la largeur');
  assert.match(bloc, /\.player-card\{[^}]*flex-wrap:wrap/, 'la carte joueur aussi');
  // Le titre doit redescendre : à 2.5rem il cassait en trois lignes sur 348 px.
  const m = bloc.match(/\.hero h1\{[^}]*font-size:([\d.]+)rem/);
  assert.ok(m, 'le titre doit être redimensionné sur mobile');
  assert.ok(parseFloat(m[1]) <= 2.4, `titre mobile trop grand (${m[1]}rem)`);
});

// Grille semaine : les en-têtes de jour vivent HORS du conteneur défilant, donc leur première
// piste doit reproduire « gouttière + écart » du corps. Cet invariant a cassé trois fois en
// une soirée (44 px, puis 48 px, puis un override mobile) et se voit mal à l'œil : quelques
// pixels de décalage entre un jour et sa colonne. On l'exprime donc comme une règle.
test('CSS : la première piste des en-têtes de semaine = gouttière + écart du corps', () => {
  const css = fs.readFileSync(path.join(dir, 'pages.css'), 'utf8');
  const tokens = fs.readFileSync(path.join(dir, 'design-tokens.css'), 'utf8');
  const sp1 = Number((tokens.match(/--sp-1:\s*(\d+)px/) || [])[1]);
  assert.ok(Number.isFinite(sp1), '--sp-1 doit être défini en pixels');

  // On resout la cascade PAR PALIER de largeur au lieu d appairer par ordre d apparition :
  // deplacer une declaration d une requete media a l autre laissait le test au vert alors que
  // les jours se decalaient de 12 px entre 561 et 760 px.
  const src = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const segs = [];
  const re = /@media\(max-width:(\d+)px\)\{/g;
  let m, pos = 0;
  while ((m = re.exec(src))) {
    let d = 1, i = m.index + m[0].length;
    while (i < src.length && d > 0) { if (src[i] === "{") d++; else if (src[i] === "}") d--; i++; }
    segs.push({ max: Infinity, txt: src.slice(pos, m.index) });
    segs.push({ max: Number(m[1]), txt: src.slice(m.index + m[0].length, i - 1) });
    pos = i; re.lastIndex = i;
  }
  segs.push({ max: Infinity, txt: src.slice(pos) });

  const lireG = t => [...t.matchAll(/\.wt-body\{[^}]*grid-template-columns:(\d+)px 1fr/g)].map(x => Number(x[1])).pop();
  const lireE = t => [...t.matchAll(/\.wt-heads,\.wt-alldays[^{]*\{[^}]*grid-template-columns:(\d+)px repeat\(7/g)].map(x => Number(x[1])).pop();

  const paliers = segs.map(x => x.max).filter(Number.isFinite);
  const largeurs = [...new Set([1200, ...paliers.flatMap(p => [p, p + 1])])].sort((a, b) => b - a);
  const rates = [];
  for (const w of largeurs) {
    let g, e;
    for (const seg of segs) {          // cascade : le dernier segment applicable gagne
      if (w > seg.max) continue;
      const a = lireG(seg.txt); if (a !== undefined) g = a;
      const b = lireE(seg.txt); if (b !== undefined) e = b;
    }
    if (g === undefined || e === undefined) { rates.push(w + "px : gouttière ou piste d’en-tête non définie"); continue; }
    if (e !== g + sp1) rates.push(w + "px : en-tête " + e + "px pour une gouttière de " + g + "px + " + sp1 + "px d’écart → les jours se décalent de " + Math.abs(e - g - sp1) + "px");
  }
  assert.deepEqual(rates, [], "en-têtes de semaine désalignés du corps");
});

/* L'ATTRIBUT `hidden` DOIT CACHER — règle générale, pas liste de cas.
   Défaut mesuré à l'itération 96 : 14 classes posaient `display:flex` ou `display:grid` sans leur
   règle `[hidden]{display:none}`. L'attribut `hidden` (qui n'est qu'un `display:none` de la
   feuille de l'agent utilisateur) était donc écrasé par la règle d'auteur, et chaque élément
   « caché » gardait sa hauteur : ~300 px de bandes vides réparties sur les sept pages, dont 118 px
   au milieu du Plan de bataille et 50 px de carte d'installation sur CHAQUE page.
   Ce test ne connaît aucun nom : il lit les éléments porteurs de `hidden` dans index.html et exige
   une garde dès qu'un `display:` d'auteur les vise. Tout nouveau bloc caché est donc couvert
   d'office. Le pendant au RENDU vit dans le smoke (`hiddenCacheVraiment`) : lui seul voit les
   guerres de spécificité, que l'analyse statique ne peut pas trancher. */
test('CSS : un élément hidden ne doit pas garder un display d’auteur', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const css = cssFiles.map(f => fs.readFileSync(path.join(dir, f), 'utf8'))
    .join('\n').replace(/\/\*[\s\S]*?\*\//g, '');

  // Une règle vise-t-elle ce sélecteur avec un display autre que none ?
  const poseUnDisplay = sel => {
    let i = -1;
    while ((i = css.indexOf(sel, i + 1)) >= 0) {
      const suivant = css.charAt(i + sel.length);
      if (suivant !== '{' && suivant !== ',') continue;
      const fin = css.indexOf('}', i);
      if (fin < 0) break;
      const corps = css.slice(css.indexOf('{', i) + 1, fin);
      const d = /display\s*:\s*([a-z-]+)/.exec(corps);
      if (d && d[1] !== 'none') return true;
    }
    return false;
  };

  const fautifs = [];
  (html.match(/<[a-z][a-z0-9]*\s[^>]*\bhidden\b[^>]*>/g) || []).forEach(balise => {
    const id = (/\sid="([^"]+)"/.exec(balise) || [])[1];
    const classes = ((/\sclass="([^"]+)"/.exec(balise) || [])[1] || '').split(/\s+/).filter(Boolean);
    const selecteurs = (id ? ['#' + id] : []).concat(classes.map(c => '.' + c));
    if (!selecteurs.length) return;
    if (!selecteurs.some(poseUnDisplay)) return;
    // Une garde sur N'IMPORTE lequel de ses sélecteurs suffit : c'est le même élément.
    if (selecteurs.some(sel => css.indexOf(sel + '[hidden]') !== -1)) return;
    fautifs.push((id ? '#' + id : classes.join('.')) + ' → ' + selecteurs.filter(poseUnDisplay).join(' '));
  });

  assert.deepEqual(fautifs, [],
    'ces éléments portent hidden mais une règle d’auteur leur impose un display : ajoute SÉLECTEUR[hidden]{display:none} juste sous la règle');
});

/* UN SEUL CHECK-IN, VÉRIFIÉ DANS LE MARKUP (itération 102, étape A2 de la roadmap 714).
   Mesuré avant : le Compagnon (« Check-in avant de décider », 462 px, ZÉRO champ) disait
   « Renseigne sommeil, fatigue et courbatures » et offrait un bouton qui ne faisait que scroller
   572 px plus bas, jusqu'au formulaire — lequel vivait dans `recovery-panel`. Et sous ce
   formulaire, `#recoveryAdvice` réclamait une TROISIÈME fois « Fais un check-in ». Le geste était
   demandé à deux endroits et rempli dans un troisième.
   Les quatre champs vivent désormais là où la décision se prend. Ce test statique attrape un
   déplacement accidentel à l'écriture ; le check du smoke (`unSeulCheckIn`) vérifie en plus que le
   formulaire FONCTIONNE depuis sa nouvelle place — deux portées, comme la leçon de l'itération 96. */
test('markup : le check-in vit dans le panneau qui décide, et nulle part ailleurs', () => {
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const CHAMPS = ['sleepInput', 'bedtimeInput', 'fatigueInput', 'sorenessInput', 'saveRecovery'];

  // On DÉRIVE les bornes des deux panneaux du markup, on ne les déclare pas.
  const bornes = cls => {
    const debut = html.indexOf('class="panel ' + cls + '"');
    assert.ok(debut > 0, 'panneau ' + cls + ' introuvable');
    const fin = html.indexOf('</article>', debut);
    assert.ok(fin > debut, 'fin du panneau ' + cls + ' introuvable');
    return { debut, fin };
  };
  const compagnon = bornes('athlete-companion');
  const recup = bornes('recovery-panel');

  CHAMPS.forEach(id => {
    const at = html.indexOf('id="' + id + '"');
    assert.ok(at > 0, 'champ ' + id + ' absent du markup');
    assert.ok(at > compagnon.debut && at < compagnon.fin,
      id + ' doit vivre dans le panneau qui décide (athlete-companion), pas ailleurs');
    assert.ok(!(at > recup.debut && at < recup.fin),
      id + ' ne doit plus vivre dans recovery-panel : le check-in ne se demande qu’une fois');
  });

  /* Et le panneau qui reste ne doit plus se PRÉSENTER comme un check-in : il porte la lecture
     (score, conseil de charge, séances manquées, sommeil). Garder l'ancien titre serait exactement
     l'écart entre ce que l'app dit et ce qu'elle fait. */
  const titreRecup = html.slice(recup.debut, recup.debut + 260);
  assert.ok(titreRecup.indexOf('Check-in du jour') === -1,
    'recovery-panel ne contient plus de check-in : son titre ne doit plus l’annoncer');
});

test('un id ne vit qu’une fois : deux écrans ne peuvent pas écrire au même endroit', () => {
  /* ITÉRATION 110, mesuré dans le renderer. `id="weekBalance"` existait DEUX fois — dans le Plan de
     bataille (onglet Athlète) et dans la page « Ma semaine ». Or `$('#x')` rend TOUJOURS le premier
     élément du document, d'où trois conséquences constatées :
       1. la page « Ma semaine » n'affichait jamais ses chips — son élément restait vide ;
       2. `renderWeekPage()` écrasait l'équilibre course/muscu du Plan par « 1 Sport · 1 Focus ·
          1 Vie · 0 Révision » ;
       3. basculer l'agenda en vue « jour » posait `hidden` sur le bloc de l'onglet ATHLÈTE, qui
          tombait à 0 px (display:none).
     Même mécanisme que la classe `.coach-panel` dupliquée de l'itération 108, en pire : un id en
     double est en plus du HTML invalide.
     Le test DÉRIVE sa liste du markup — une liste écrite à la main raterait le doublon suivant. */
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  const compte = new Map();
  const re = /\sid="([A-Za-z0-9_-]+)"/g;
  let m;
  while ((m = re.exec(html))) compte.set(m[1], (compte.get(m[1]) || 0) + 1);

  assert.ok(compte.size > 300, 'témoin : le markup porte bien des centaines d’ids (' + compte.size + ')');
  const doubles = [...compte.entries()].filter(([, n]) => n > 1).map(([id, n]) => id + ' ×' + n);
  assert.deepEqual(doubles, [], 'ids présents plusieurs fois dans index.html : ' + doubles.join(', '));

  /* Et le bloc de l'onglet Athlète porte bien son id PROPRE, celui que `renderWeekBalance` vise.
     Sans cette seconde assertion, renommer l'élément côté Athlète sans corriger le rendu passerait
     le test ci-dessus tout en laissant le bloc vide. */
  assert.ok(compte.has('trainingWeekBalance'), 'le bloc équilibre du Plan de bataille garde son id propre');
  const app = fs.readFileSync(path.join(dir, 'app.js'), 'utf8');
  assert.ok(app.indexOf("renderWeekBalance(){const el=$('#trainingWeekBalance')") !== -1,
    'renderWeekBalance doit viser l’élément de l’onglet Athlète, pas celui de la page « Ma semaine »');
});
