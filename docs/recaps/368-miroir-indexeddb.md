# #368 — Fondations : miroir IndexedDB + récupération automatique (3.0 · Vague 2, tranche 1) (2.0.12)

Ouverture de la **Vague 2 (Fondations techniques)**, en tranches sûres : première brique = résilience
du stockage, SANS migration — localStorage reste la source de vérité.

## Ce qui est livré

- **Miroir IndexedDB** (`idbOpen`/`idbMirrorState`/`idbReadState` dans app.js — API navigateur, pas
  de logique pure) : chaque `save()` programme une copie de l'état complet dans IndexedDB (débounce
  800 ms). Sans IDB disponible, tout fonctionne comme avant.
- **Récupération automatique** (`restoreFromIdbIfEmpty`) : si localStorage était **vide au
  chargement** (`bootWasEmpty` — éviction, nettoyage, saturation) et que le miroir contient de
  vraies données (xp/séances/candidatures/onboarding), l'état est restauré, re-rendu, avec un toast
  « 🛟 Données restaurées… ». **PWA seulement** — le desktop garde ses sauvegardes disque.
- **`navigator.storage.persist()`** demandé au boot (best-effort, renforce la persistance PWA).
- Smoke : le wrapper d'injection passe en **async IIFE** → check `idbMirror` **bloquant**
  (écriture + relecture d'une sonde réelle dans le renderer Electron, puis remise du vrai état).

## Deux bugs attrapés par le test d'éviction (avant livraison)

1. Le test de fraîcheur utilisait `!automaticBackupReady`… que `offerLocalBackupRestore` repasse à
   `true` au boot → restauration jamais tentée. Corrigé : drapeau **`bootWasEmpty`** capturé à la
   lecture initiale de localStorage.
2. **Le miroir initial du boot écrasait la sauvegarde avec l'état vide** avant que la restauration
   ait décidé. Corrigé : **verrou `idbMirrorAllowed`** — aucun miroir tant que
   `restoreFromIdbIfEmpty()` n'a pas conclu (`.then` ouvre le verrou puis programme le 1er miroir).

## Vérification navigateur (scénario complet)

Seed (xp 1234, 1 séance, candidature « TestCorp Recovery ») → miroir écrit → `localStorage` vidé →
rechargement → **tout restauré** (xp/séance/candidature), localStorage repeuplé, toast 🛟 affiché ✅.
Aucune erreur console.

## Tests

384 tests + smoke `idbMirror` bloquant (wrapper async).

## Contexte

Build **2.0.12**. Pas de Release (v2.0.11 publiée aujourd'hui ; celle-ci part dans le prochain lot).
Suite de la Vague 2 : archivage/allègement de l'état (688+ candidatures dans un seul JSON), puis
schéma de stockage préparant la Sync (Vague 4).
