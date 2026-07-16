# #358 — Alternance : nudge quotidien + import CSV (tranche 2, module complet) (2.0.2)

Complète le module « Recherche d'alternance » (tranche 1 = #357).

## Ce qui change

- **Nudge quotidien sur l'accueil** : `attentionDigest` gagne un signal **alternance** (priorité
  haute). Dès qu'il y a ≥ 1 candidature et que tu n'as **pas postulé aujourd'hui**, « À rattraper »
  affiche « 💼 Postule aujourd'hui — une candidature suffit à avancer », clic → onglet Alternance.
  S'arrête dès qu'une alternance est **acceptée**. C'est la vraie pousse quotidienne demandée.
- **Import CSV** (`parseApplicationsCsv`, pur + testé) : détecte les colonnes (entreprise, poste,
  statut, date, source, note), tolère l'absence d'en-tête (1re colonne = entreprise), mappe les
  statuts FR (« postulé », « à postuler », « entretien », « accepté », « refusé »…) et les dates
  (ISO ou JJ/MM/AAAA), gère guillemets/virgules. Bouton « 📥 Importer un CSV » → sélecteur de fichier
  → ajout dédoublonné (par entreprise+date). Récupère les candidatures du Google Sheets sans OAuth.

## Vérification navigateur

- Candidature postulée hier, rien aujourd'hui → digest accueil : « 💼 Postule aujourd'hui… » ✅ ;
  clic → onglet Alternance (`aria-current`) ✅.
- Bouton d'import présent ✅ ; parse CSV : « Cabinet X → postulé », « Boite Y → à postuler » ✅.

## Tests

375 tests `node:test` (parseApplicationsCsv : colonnes/statuts FR/dates/guillemets/sans-en-tête ;
attentionDigest alternance : nudge si commencé & pas fait, pas de nudge si postulé aujourd'hui ou
accepté) + smoke `alternance` **bloquant** étendu (parseur + bouton import + signal digest).

## Bug corrigé en cours de route

Le smoke injecte le bloc CHECKS dans un **template literal** : un `\n` dans une chaîne de test y
devient un vrai saut de ligne (→ chaîne single-quote multi-ligne → SyntaxError). Corrigé en `\\n`
(comme les checks existants type `\\r\\n`).

## Contexte

Build **2.0.2**. **Module Alternance terminé.** La boucle reste **en pause** — Adrien a demandé le
module complet puis son feu vert avant d'entamer la 3.0 (ordre validé : Coaching adaptatif → Sync
→ Fondations → Sécurité/public → Planning multi-échéances → Scans).
