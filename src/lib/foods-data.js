/*
 * foods-data.js — petite base d'aliments curée (valeurs approximatives pour 100 g,
 * cohérentes avec la table CIQUAL de l'ANSES — référence française, OpenData/Licence Ouverte).
 * Repères indicatifs, pas des valeurs officielles. Hors-ligne, aucune dépendance réseau.
 * Chargé AVANT app.js. Champs : n=nom, kcal, p=protéines(g), c=glucides(g), f=lipides(g).
 */
const FOODS = [
  { n: 'Blanc de poulet', kcal: 165, p: 31, c: 0, f: 3.6 },
  { n: 'Blanc de dinde', kcal: 135, p: 29, c: 0, f: 1.5 },
  { n: 'Steak haché 5%', kcal: 137, p: 21, c: 0, f: 5 },
  { n: 'Thon (au naturel)', kcal: 116, p: 26, c: 0, f: 1 },
  { n: 'Saumon', kcal: 208, p: 20, c: 0, f: 13 },
  { n: 'Œuf entier', kcal: 143, p: 13, c: 1, f: 10 },
  { n: 'Blanc d’œuf', kcal: 52, p: 11, c: 0.7, f: 0.2 },
  { n: 'Jambon blanc', kcal: 107, p: 18, c: 1, f: 3.5 },
  { n: 'Fromage blanc 0%', kcal: 47, p: 8, c: 4, f: 0.2 },
  { n: 'Skyr nature', kcal: 63, p: 11, c: 4, f: 0.2 },
  { n: 'Yaourt grec', kcal: 97, p: 9, c: 4, f: 5 },
  { n: 'Whey (poudre)', kcal: 400, p: 80, c: 8, f: 6 },
  { n: 'Lentilles cuites', kcal: 116, p: 9, c: 20, f: 0.4 },
  { n: 'Pois chiches cuits', kcal: 164, p: 9, c: 27, f: 2.6 },
  { n: 'Haricots rouges cuits', kcal: 127, p: 9, c: 23, f: 0.5 },
  { n: 'Tofu ferme', kcal: 144, p: 15, c: 3, f: 9 },
  { n: 'Riz blanc cuit', kcal: 130, p: 2.7, c: 28, f: 0.3 },
  { n: 'Riz complet cuit', kcal: 123, p: 2.7, c: 26, f: 1 },
  { n: 'Pâtes cuites', kcal: 158, p: 6, c: 31, f: 0.9 },
  { n: 'Semoule cuite', kcal: 112, p: 4, c: 23, f: 0.2 },
  { n: 'Quinoa cuit', kcal: 120, p: 4.4, c: 21, f: 1.9 },
  { n: 'Pomme de terre', kcal: 87, p: 2, c: 20, f: 0.1 },
  { n: 'Patate douce', kcal: 86, p: 1.6, c: 20, f: 0.1 },
  { n: 'Flocons d’avoine', kcal: 389, p: 17, c: 66, f: 7 },
  { n: 'Pain complet', kcal: 247, p: 13, c: 41, f: 3.4 },
  { n: 'Pain blanc', kcal: 265, p: 9, c: 49, f: 3.2 },
  { n: 'Banane', kcal: 89, p: 1.1, c: 23, f: 0.3 },
  { n: 'Pomme', kcal: 52, p: 0.3, c: 14, f: 0.2 },
  { n: 'Orange', kcal: 47, p: 0.9, c: 12, f: 0.1 },
  { n: 'Fruits rouges', kcal: 43, p: 1, c: 10, f: 0.3 },
  { n: 'Dattes', kcal: 282, p: 2.5, c: 75, f: 0.4 },
  { n: 'Raisins secs', kcal: 299, p: 3, c: 79, f: 0.5 },
  { n: 'Brocoli', kcal: 34, p: 2.8, c: 7, f: 0.4 },
  { n: 'Épinards', kcal: 23, p: 2.9, c: 3.6, f: 0.4 },
  { n: 'Carotte', kcal: 41, p: 0.9, c: 10, f: 0.2 },
  { n: 'Tomate', kcal: 18, p: 0.9, c: 3.9, f: 0.2 },
  { n: 'Courgette', kcal: 17, p: 1.2, c: 3.1, f: 0.3 },
  { n: 'Amandes', kcal: 579, p: 21, c: 22, f: 50 },
  { n: 'Noix', kcal: 654, p: 15, c: 14, f: 65 },
  { n: 'Beurre de cacahuète', kcal: 588, p: 25, c: 20, f: 50 },
  { n: 'Huile d’olive', kcal: 884, p: 0, c: 0, f: 100 },
  { n: 'Avocat', kcal: 160, p: 2, c: 9, f: 15 },
  { n: 'Lait demi-écrémé', kcal: 47, p: 3.4, c: 5, f: 1.6 },
  { n: 'Comté', kcal: 410, p: 27, c: 0, f: 34 },
  { n: 'Mozzarella', kcal: 280, p: 22, c: 2.2, f: 22 },
  { n: 'Miel', kcal: 304, p: 0.3, c: 82, f: 0 },
  { n: 'Chocolat noir 70%', kcal: 598, p: 7.8, c: 46, f: 43 },
  { n: 'Gel énergétique', kcal: 250, p: 0, c: 62, f: 0 },
  { n: 'Barre de céréales', kcal: 380, p: 6, c: 70, f: 8 },
  { n: 'Compote de pomme', kcal: 42, p: 0.2, c: 11, f: 0.1 },
  { n: 'Pois cassés cuits', kcal: 118, p: 8, c: 21, f: 0.4 },
  { n: 'Maïs doux', kcal: 96, p: 3.4, c: 21, f: 1.5 },
  { n: 'Sardines (boîte)', kcal: 208, p: 25, c: 0, f: 11 },
  { n: 'Cabillaud', kcal: 82, p: 18, c: 0, f: 0.7 }
];

// Recherche insensible à la casse et aux accents. Renvoie jusqu'à `limit` aliments.
function searchFoods(query, limit) {
  const norm = s => String(s || '').toLowerCase().replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '');
  const q = norm(query).trim();
  const max = Number(limit) || 8;
  if (!q) return FOODS.slice(0, max);
  return FOODS.filter(x => norm(x.n).includes(q)).slice(0, max);
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { FOODS, searchFoods }; }
