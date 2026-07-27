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

  // Chaque déclaration de .wt-body porte la gouttière ; chaque .wt-heads porte la piste d'en-tête.
  const gouttieres = [...css.matchAll(/\.wt-body\{[^}]*grid-template-columns:(\d+)px 1fr/g)].map(m => Number(m[1]));
  const entetes = [...css.matchAll(/\.wt-heads,\.wt-alldays[^{]*\{[^}]*grid-template-columns:(\d+)px repeat\(7/g)].map(m => Number(m[1]));
  assert.ok(gouttieres.length >= 1, 'au moins une gouttière déclarée');
  assert.equal(entetes.length, gouttieres.length,
    `autant de pistes d’en-tête que de gouttières (${entetes.length} vs ${gouttieres.length}) — sinon une requête média en redéfinit une sans l’autre`);

  // Les déclarations se suivent dans le même ordre (défaut, puis requêtes média).
  gouttieres.forEach((g, i) => {
    assert.equal(entetes[i], g + sp1,
      `en-tête ${entetes[i]}px pour une gouttière de ${g}px + ${sp1}px d’écart → ${g + sp1}px attendus (les jours se décaleraient de ${Math.abs(entetes[i] - g - sp1)}px)`);
  });
});
