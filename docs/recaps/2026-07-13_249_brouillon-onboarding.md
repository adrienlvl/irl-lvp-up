# Boucle #249 (autonome) — 10ᵉ rotation #2 : brouillon d'onboarding + reprise · build 1.9.183

**10ᵉ rotation, #2 (onboarding).** Si on fermait l'onboarding sans finir, tout était perdu. Désormais l'app **sauvegarde un brouillon** et le **reprend** à la réouverture.

## Livré

- **Sauvegarde auto** : à la fermeture de l'onboarding **sans avoir terminé** (Échap / clic sur le fond), les saisies validées sont enregistrées en brouillon (localStorage).
- **Reprise** à la réouverture : les champs sont repré-remplis et une note **« 📝 Brouillon repris »** s'affiche.
- Bouton **« Repartir de zéro »** : efface le brouillon et repart des valeurs du profil.
- Le brouillon est **effacé** quand l'onboarding est finalisé (« Démarrer »).

## Détail technique

- **`lib/logic.js`** : `sanitizeOnboardingDraft(raw)` — ne garde que les champs connus et valides (objectif, poids, taille, âge, sexe, niveau, séances, créneau, jours triés/dédupliqués), ou null. Pur + testé.
- **`app.js`** : flag `_onbFinishing` ; écouteur `close` du dialogue (sauve si pas en train de finir) ; `openOnboarding` applique le brouillon + note + « Repartir de zéro » ; `finishOnboarding` efface le brouillon.
- **`index.html`** : `#onbDraftNote` / `#onbDraftClear`. **`companion.css`** : `.onb-draft-note`.

## Vérifs

- `npm run verify` → **279 tests / 279 pass** (+1 `sanitizeOnboardingDraft`), garde-fou CSS vert, **SMOKE OK** (`onboardingDraft:true`).
- **Navigateur** : modif objectif→seche + créneau→matin + poids 73, fermeture (event `close`) → brouillon sauvé ; réouverture → note affichée + champs repris ; « Repartir de zéro » → brouillon effacé + note masquée. ✓ _(La sauvegarde repose sur l'événement `close` du dialogue — émis par Échap/backdrop dans les vrais navigateurs ; le navigateur d'automatisation ne l'émet pas sur close() programmatique, d'où le test via event synthétique.)_
- `npm run dist` → **Setup 1.9.183.exe** (app d'Adrien jamais fermée).

## Suite (rotation 10)

#1 ✅ (#248), #2 ✅ (#249). Prochain : #3 bien-être, #4 coaching. Boucle autonome continue. _(Option B release : workflow en place, en attente qu'Adrien branche le remote GitHub ; ne rien publier sans « publie ».)_
