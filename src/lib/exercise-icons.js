/*
 * exercise-icons.js — pictogrammes SVG par schéma de mouvement (Vague coaching).
 * Remplace les anciennes planches photo (mal découpées). Chargé AVANT app.js.
 * Chaque exercice est mappé à un "pattern" ; l'icône hérite de la couleur (currentColor).
 */
const EXERCISE_PATTERN = {
  'Goblet squat kettlebell':'squat','Chaise au mur':'squat','Squat cosaque':'squat',
  'Soulevé de terre kettlebell':'hinge','Soulevé de terre une jambe kettlebell':'hinge','Kettlebell swing':'hinge',
  'Pont fessier':'bridge',
  'Fentes arrière':'lunge','Step-up gilet':'lunge','Step-down latéral':'lunge','Split squat bulgare':'lunge',
  'Pompes inclinées':'push','Pompes classiques':'push','Pompes diamants':'push','Pompes gilet lesté':'push','Floor press kettlebell':'push',
  'Pike push-up':'pushv','Développé militaire kettlebell':'pushv',
  'Rowing kettlebell un bras':'pull','Tractions':'pull','Tractions supination':'pull','Tractions négatives':'pull','Rowing australien':'pull','Suspension barre':'pull','Relevés de genoux suspendu':'pull',
  'Marche fermier kettlebell':'carry',
  'Élévations mollets':'calf','Relevés tibiaux au mur':'calf',
  'Gainage planche':'core','Gainage latéral':'core','Hollow hold':'core','Dead bug':'core','Bird dog':'core','Superman':'core','Mountain climbers':'core','Bear crawl':'core'
};
const EX_ICONS = {
  squat:'<circle cx="26" cy="16" r="4.5" fill="currentColor" stroke="none"/><circle cx="40" cy="27" r="3" fill="currentColor" stroke="none"/><path d="M26 20 L29 33 M29 33 L21 34 L21 52 M29 33 L37 35 L37 52 M27 24 L38 26 M12 52 L46 52"/>',
  hinge:'<circle cx="15" cy="22" r="4.5" fill="currentColor" stroke="none"/><circle cx="27" cy="45" r="3" fill="currentColor" stroke="none"/><path d="M19 24 L38 30 M38 30 L38 52 M27 27 L27 43 M10 52 L50 52"/>',
  bridge:'<circle cx="12" cy="45" r="4.5" fill="currentColor" stroke="none"/><path d="M16 46 L34 34 L42 46 L42 52 M16 46 L23 47 M8 52 L52 52"/>',
  lunge:'<circle cx="30" cy="13" r="4.5" fill="currentColor" stroke="none"/><path d="M30 17 L30 31 M30 31 L22 40 L22 52 M30 31 L40 44 L46 52 M30 22 L24 29 M14 52 L50 52"/>',
  push:'<circle cx="14" cy="30" r="4.5" fill="currentColor" stroke="none"/><path d="M18 32 L46 42 M46 42 L52 52 M22 33 L22 52 M8 52 L56 52"/>',
  pushv:'<circle cx="30" cy="22" r="4.5" fill="currentColor" stroke="none"/><rect x="22" y="9" width="16" height="4" rx="1.5" fill="currentColor" stroke="none"/><path d="M30 26 L30 44 M30 44 L24 52 M30 44 L36 52 M30 28 L27 14 M30 28 L33 14 M16 52 L44 52"/>',
  pull:'<path d="M10 10 L54 10"/><circle cx="32" cy="22" r="4.5" fill="currentColor" stroke="none"/><path d="M29 19 L25 11 M35 19 L39 11 M32 26 L32 45 M32 45 L28 55 M32 45 L36 55"/>',
  carry:'<circle cx="30" cy="13" r="4.5" fill="currentColor" stroke="none"/><circle cx="25" cy="43" r="3" fill="currentColor" stroke="none"/><circle cx="35" cy="43" r="3" fill="currentColor" stroke="none"/><path d="M30 17 L30 42 M30 42 L26 54 M30 42 L34 54 M25 22 L25 40 M35 22 L35 40 M14 56 L46 56"/>',
  calf:'<circle cx="27" cy="13" r="4.5" fill="currentColor" stroke="none"/><path d="M27 17 L27 40 M27 40 L24 50 M27 40 L30 50 M20 52 L25 50 M29 50 L34 52 M45 24 L45 15 M42 18 L45 15 L48 18"/>',
  core:'<circle cx="13" cy="31" r="4.5" fill="currentColor" stroke="none"/><path d="M17 33 L47 42 M47 42 L53 52 M18 34 L13 44 L25 44 M8 52 L56 52"/>'
};
function exerciseIcon(name) {
  const p = EXERCISE_PATTERN[name] || 'core';
  return '<svg viewBox="0 0 64 64" class="ex-svg" fill="none" stroke="currentColor" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (EX_ICONS[p] || EX_ICONS.core) + '</svg>';
}
if (typeof module !== 'undefined' && module.exports) { module.exports = { EXERCISE_PATTERN, EX_ICONS, exerciseIcon }; }
