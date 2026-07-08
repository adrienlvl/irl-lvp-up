/*
 * exercise-icons.js — figures SVG ANIMÉES par schéma de mouvement.
 * But : montrer la BONNE EXÉCUTION — chaque figure parcourt le mouvement entre
 * sa position de départ (A) et sa position travaillée (B), avec une flèche de
 * mouvement (orange). Auto-contenu, sans réseau, hérite de la couleur du thème
 * (currentColor) ; jamais tronqué (viewBox avec marge). Chargé AVANT app.js.
 */
const EXERCISE_PATTERN = {
  'Goblet squat kettlebell': 'squat', 'Chaise au mur': 'squat', 'Squat cosaque': 'squat',
  'Soulevé de terre kettlebell': 'hinge', 'Soulevé de terre une jambe kettlebell': 'hinge', 'Kettlebell swing': 'hinge',
  'Pont fessier': 'bridge',
  'Fentes arrière': 'lunge', 'Step-up escalier': 'lunge', 'Step-up gilet': 'lunge', 'Step-down escalier': 'lunge', 'Step-down latéral': 'lunge', 'Split squat bulgare': 'lunge',
  'Pompes inclinées': 'push', 'Pompes classiques': 'push', 'Pompes diamants': 'push', 'Pompes gilet lesté': 'push', 'Pompes déficit': 'push', 'Floor press kettlebell': 'push',
  'Pike push-up': 'pressv', 'Développé militaire kettlebell': 'pressv',
  'Tractions': 'pullup', 'Tractions supination': 'pullup', 'Tractions négatives': 'pullup', 'Suspension barre': 'pullup', 'Relevés de genoux suspendu': 'pullup',
  'Rowing kettlebell un bras': 'row', 'Rowing australien': 'row',
  'Marche fermier kettlebell': 'carry',
  'Élévations mollets': 'calf', 'Relevés tibiaux au mur': 'calf',
  'Gainage planche': 'plank', 'Gainage latéral': 'plank', 'Hollow hold': 'plank',
  'Dead bug': 'coredyn', 'Bird dog': 'coredyn', 'Superman': 'coredyn', 'Mountain climbers': 'coredyn', 'Bear crawl': 'coredyn'
};

// Figure à partir de segments : head=[x,y,(r)], segs=[[[x,y],[x,y]],…]. Le remplissage
// des articulations (petits cercles) donne un rendu propre à toutes les tailles.
function figJ(head, segs, joints) {
  const r = head[2] || 5.4;
  const path = segs.map(s => `M${s[0][0]} ${s[0][1]}L${s[1][0]} ${s[1][1]}`).join('');
  const dots = (joints || []).map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="1.7" fill="currentColor" stroke="none"/>`).join('');
  return `<circle cx="${head[0]}" cy="${head[1]}" r="${r}" fill="currentColor" stroke="none"/><path d="${path}"/>${dots}`;
}
const kb = (x, y) => `<circle cx="${x}" cy="${y}" r="3.4" fill="none" stroke="currentColor" stroke-width="2.4"/>`; // poids

// Chaque pattern : base (sol/barre), poseA, poseB, flèche de mouvement.
const POSES = {
  squat: {
    base: '<line x1="12" y1="66" x2="68" y2="66"/>',
    a: figJ([36, 13], [[[36, 19], [36, 38]], [[36, 38], [36, 50]], [[36, 50], [36, 64]], [[36, 64], [43, 64]], [[36, 21], [30, 30]], [[30, 30], [36, 32]]], [[36, 38], [36, 50]]) + kb(33, 31),
    b: figJ([30, 22], [[[31, 27], [35, 43]], [[35, 43], [45, 49]], [[45, 49], [41, 64]], [[41, 64], [48, 64]], [[31, 28], [26, 36]], [[26, 36], [33, 37]]], [[35, 43], [45, 49]]) + kb(30, 36),
    arrow: 'M60 28 L60 44 M56 39 L60 44 L64 39'
  },
  hinge: {
    base: '<line x1="10" y1="66" x2="66" y2="66"/>',
    a: figJ([32, 13], [[[32, 19], [32, 37]], [[32, 37], [32, 50]], [[32, 50], [32, 64]], [[32, 64], [39, 64]], [[32, 20], [32, 41]]], [[32, 37]]) + kb(32, 44),
    b: figJ([18, 25], [[[21, 29], [40, 39]], [[40, 39], [41, 52]], [[41, 52], [40, 64]], [[40, 64], [47, 64]], [[24, 31], [26, 50]]], [[40, 39]]) + kb(26, 53),
    arrow: 'M52 26 Q60 36 52 46 M49 42 L52 46 L56 44'
  },
  bridge: {
    base: '<line x1="8" y1="64" x2="72" y2="64"/>',
    a: figJ([16, 52], [[[21, 52], [40, 54]], [[40, 54], [48, 47]], [[48, 47], [48, 63]], [[21, 52], [13, 55]]], [[40, 54], [48, 47]]),
    b: figJ([16, 50], [[[21, 50], [40, 44]], [[40, 44], [48, 47]], [[48, 47], [48, 63]], [[21, 50], [13, 52]]], [[40, 44], [48, 47]]),
    arrow: 'M40 61 L40 45 M36 50 L40 45 L44 50'
  },
  lunge: {
    base: '<line x1="12" y1="66" x2="68" y2="66"/>',
    a: figJ([32, 13], [[[32, 19], [32, 37]], [[32, 37], [32, 50]], [[32, 50], [32, 64]], [[32, 64], [39, 64]], [[32, 20], [32, 39]]], [[32, 37]]),
    b: figJ([35, 20], [[[35, 26], [35, 42]], [[35, 42], [47, 47]], [[47, 47], [47, 64]], [[35, 42], [25, 56]], [[25, 56], [19, 64]], [[35, 27], [35, 43]]], [[35, 42], [47, 47], [25, 56]]),
    arrow: 'M60 30 L60 46 M56 41 L60 46 L64 41'
  },
  push: {
    base: '<line x1="10" y1="62" x2="70" y2="62"/>',
    a: figJ([16, 40], [[[22, 42], [50, 48]], [[50, 48], [66, 54]], [[66, 54], [63, 61]], [[24, 43], [26, 61]]], [[50, 48]]),
    b: figJ([16, 48], [[[22, 50], [50, 54]], [[50, 54], [66, 58]], [[66, 58], [63, 61]], [[23, 51], [19, 56]], [[19, 56], [26, 61]]], [[50, 54], [19, 56]]),
    arrow: 'M12 40 L12 56 M9 51 L12 56 L15 51'
  },
  pressv: {
    base: '<line x1="18" y1="66" x2="62" y2="66"/>',
    a: figJ([40, 16], [[[40, 22], [40, 44]], [[40, 44], [34, 55]], [[34, 55], [34, 66]], [[40, 44], [46, 55]], [[46, 55], [46, 66]], [[34, 24], [28, 31]], [[28, 31], [34, 22]], [[46, 24], [52, 31]], [[52, 31], [46, 22]]], [[34, 24], [46, 24], [28, 31], [52, 31]]) + kb(34, 21) + kb(46, 21),
    b: figJ([40, 16], [[[40, 22], [40, 44]], [[40, 44], [34, 55]], [[34, 55], [34, 66]], [[40, 44], [46, 55]], [[46, 55], [46, 66]], [[34, 24], [32, 13]], [[32, 13], [34, 6]], [[46, 24], [48, 13]], [[48, 13], [46, 6]]], [[34, 24], [46, 24], [32, 13], [48, 13]]) + kb(34, 5) + kb(46, 5),
    arrow: 'M62 30 L62 14 M58 19 L62 14 L66 19'
  },
  pullup: {
    base: '<line x1="18" y1="9" x2="62" y2="9"/>',
    a: figJ([40, 22], [[[40, 27], [40, 45]], [[40, 45], [37, 58]], [[37, 58], [37, 66]], [[40, 45], [43, 58]], [[43, 58], [43, 66]], [[36, 25], [34, 17]], [[34, 17], [34, 9]], [[44, 25], [46, 17]], [[46, 17], [46, 9]]], [[34, 17], [46, 17]]),
    b: figJ([40, 14], [[[40, 19], [40, 36]], [[40, 36], [37, 48]], [[37, 48], [38, 58]], [[40, 36], [43, 48]], [[43, 48], [42, 58]], [[36, 18], [31, 14]], [[31, 14], [34, 9]], [[44, 18], [49, 14]], [[49, 14], [46, 9]]], [[31, 14], [49, 14]]),
    arrow: 'M62 30 L62 15 M58 20 L62 15 L66 20'
  },
  row: {
    base: '<line x1="10" y1="66" x2="66" y2="66"/>',
    a: figJ([18, 25], [[[21, 29], [42, 39]], [[42, 39], [43, 52]], [[43, 52], [42, 64]], [[42, 64], [49, 64]], [[24, 31], [25, 51]]], [[42, 39]]) + kb(25, 54),
    b: figJ([18, 25], [[[21, 29], [42, 39]], [[42, 39], [43, 52]], [[43, 52], [42, 64]], [[42, 64], [49, 64]], [[24, 31], [31, 30]], [[31, 30], [30, 40]]], [[42, 39], [31, 30]]) + kb(30, 43),
    arrow: 'M20 52 L20 36 M16 41 L20 36 L24 41'
  },
  carry: {
    base: '<line x1="14" y1="66" x2="66" y2="66"/>',
    a: figJ([40, 14], [[[40, 20], [40, 42]], [[40, 42], [35, 54]], [[35, 54], [35, 66]], [[40, 42], [45, 54]], [[45, 54], [45, 66]], [[34, 22], [33, 41]], [[46, 22], [47, 41]]], [[40, 42]]) + kb(33, 44) + kb(47, 44),
    b: figJ([40, 14], [[[40, 20], [40, 42]], [[40, 42], [33, 52]], [[33, 52], [31, 64]], [[40, 42], [46, 55]], [[46, 55], [48, 66]], [[34, 22], [33, 41]], [[46, 22], [47, 41]]], [[40, 42]]) + kb(33, 44) + kb(47, 44),
    arrow: 'M56 30 L64 30 M60 27 L64 30 L60 33'
  },
  calf: {
    base: '<line x1="14" y1="64" x2="60" y2="64"/>',
    a: figJ([32, 15], [[[32, 21], [32, 40]], [[32, 40], [32, 54]], [[32, 54], [32, 63]], [[24, 63], [40, 63]], [[32, 22], [32, 42]]], [[32, 40], [32, 54]]),
    b: figJ([32, 11], [[[32, 17], [32, 36]], [[32, 36], [32, 50]], [[32, 50], [32, 59]], [[26, 59], [40, 63]], [[32, 18], [32, 38]]], [[32, 36], [32, 50]]),
    arrow: 'M52 40 L52 26 M48 31 L52 26 L56 31'
  },
  plank: {
    base: '<line x1="8" y1="62" x2="72" y2="62"/>',
    a: figJ([16, 42], [[[22, 44], [48, 50]], [[48, 50], [66, 55]], [[66, 55], [63, 61]], [[24, 45], [26, 61]], [[26, 61], [36, 61]]], [[48, 50], [26, 61]]),
    b: figJ([16, 42], [[[22, 44], [48, 50]], [[48, 50], [66, 55]], [[66, 55], [63, 61]], [[24, 45], [26, 61]], [[26, 61], [36, 61]]], [[48, 50], [26, 61]]),
    cue: '<line x1="16" y1="41" x2="66" y2="55" stroke="#e5843a" stroke-width="1.8" stroke-dasharray="3 3" opacity="0.9"/>'
  },
  coredyn: {
    base: '<line x1="10" y1="62" x2="70" y2="62"/>',
    a: figJ([26, 40], [[[30, 43], [46, 43]], [[46, 43], [46, 60]], [[30, 43], [28, 60]], [[46, 43], [46, 43]]], [[30, 43], [46, 43]]),
    b: figJ([26, 40], [[[30, 43], [46, 43]], [[46, 43], [46, 60]], [[30, 43], [16, 37]], [[46, 43], [62, 39]]], [[30, 43], [46, 43]]),
    arrow: 'M60 30 L66 34 M63 30 L66 34 L62 35'
  }
};

// animated=true (grandes vues : détail, séance guidée) → la figure va-et-vient entre
// les deux positions du mouvement. Sinon (cartes/vignettes) : rendu statique lisible,
// position travaillée pleine + autre position en fantôme + flèche → montre déjà le geste.
function exerciseIcon(name, animated) {
  const p = POSES[EXERCISE_PATTERN[name]] ? EXERCISE_PATTERN[name] : 'plank';
  const P = POSES[p];
  const arrow = P.arrow ? `<path d="${P.arrow}" fill="none" stroke="#e5843a" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>` : '';
  let layers;
  if (animated) {
    const kt = 'keyTimes="0;0.42;0.5;0.92;1"', dur = 'dur="2.8s" repeatCount="indefinite"';
    layers = `<g opacity="1"><animate attributeName="opacity" values="1;1;0.16;0.16;1" ${kt} ${dur}/>${P.a}</g>`
      + `<g opacity="0.16"><animate attributeName="opacity" values="0.16;0.16;1;1;0.16" ${kt} ${dur}/>${P.b}</g>`;
  } else {
    layers = `<g opacity="0.32">${P.b}</g><g opacity="1">${P.a}</g>`;
  }
  return '<svg viewBox="0 0 80 76" class="ex-svg" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
    + `<g opacity="0.35" stroke-width="2">${P.base || ''}</g>`
    + (P.cue || '')
    + layers
    + arrow
    + '</svg>';
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { EXERCISE_PATTERN, POSES, exerciseIcon }; }
