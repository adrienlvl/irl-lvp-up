# Installer IRL LVP UP sur iPhone (et iPad)

**Adresse de l'app : https://adrienlvl.github.io/irl-lvp-up/**

Pas d'App Store, pas de compte, pas d'abonnement. L'app s'installe directement depuis
Safari et fonctionne ensuite comme une vraie application iPhone : icône sur l'écran
d'accueil, plein écran, et **utilisable sans connexion**.

---

## 1. L'installation, en 5 étapes

> ⚠️ **Il faut absolument utiliser Safari.** Sur iPhone, Chrome et Firefox **ne
> savent pas** installer une app sur l'écran d'accueil — c'est une restriction
> d'Apple, pas un bug de l'app. Si tu ne vois pas l'option, c'est presque toujours
> parce que tu n'es pas dans Safari.

1. **Ouvre Safari** et va sur **https://adrienlvl.github.io/irl-lvp-up/**
2. Appuie sur le bouton **Partager** (le carré avec une flèche vers le haut, en bas
   de l'écran).
3. Fais défiler le menu vers le bas et appuie sur **« Sur l'écran d'accueil »**.
4. Le nom proposé est **IRL LVP UP** — tu peux le garder. Appuie sur **Ajouter**
   (en haut à droite).
5. C'est fait. L'icône est sur ton écran d'accueil. **Lance l'app depuis cette
   icône**, plus depuis Safari.

### Vérifier que c'est bien installé
Ouvre l'app depuis l'icône : tu ne dois **plus voir la barre d'adresse de Safari**.
Si tu la vois encore, tu es dans le navigateur, pas dans l'app installée.

---

## 2. Ce que ça change (et pourquoi c'est important)

| | Depuis Safari | Depuis l'icône (installée) |
|---|---|---|
| Plein écran, sans barre d'adresse | ❌ | ✅ |
| Fonctionne hors connexion | ✅ | ✅ |
| Notifications | ❌ | ✅ (iOS 16.4 ou plus) |
| Données mieux protégées | ⚠️ | ✅ |

Le dernier point est le plus important, et j'y reviens ci-dessous.

---

## 3. Où sont tes données — à lire vraiment

Tes données ne sont **jamais envoyées nulle part**. Il n'y a aucun serveur, aucun
compte. Tout est stocké **dans le navigateur, sur l'appareil**, dans ce qu'on appelle
le `localStorage`.

Trois conséquences concrètes, que je préfère te dire franchement :

### ⚠️ Tes données ne se synchronisent PAS entre appareils
L'app sur ton iPhone et l'app sur ton PC sont **deux copies indépendantes**. Ce que
tu saisis sur l'une n'apparaît pas sur l'autre. Pour transférer, il faut passer par
l'export/import JSON (voir plus bas).

### ⚠️ Le stockage du navigateur n'est pas éternel
iOS peut effacer les données d'un site web s'il manque de place, ou si le site n'a
pas été ouvert depuis longtemps. **Installer l'app sur l'écran d'accueil protège
beaucoup mieux** tes données que de la laisser en simple onglet Safari — c'est la
raison principale de l'installer. Mais aucune méthode n'est garantie à 100 %.

### ✅ Donc : fais des sauvegardes
Dans l'app : **Réglages → Sauvegarde & données → « ⬇️ Exporter mes données (.json) »**.
Ça télécharge un fichier avec **tout** ton contenu. Range-le dans iCloud Drive ou
envoie-le-toi par mail de temps en temps.

Pour le restaurer (nouvel iPhone, données perdues, transfert depuis le PC) :
**Réglages → Sauvegarde & données → « ⬆️ Importer une sauvegarde »**.

> **Mon conseil :** exporte une sauvegarde une fois par mois, et avant tout
> changement de téléphone. Ça prend dix secondes et ça t'évite de tout reperdre.

---

## 4. Les raccourcis

L'app déclare des raccourcis (Ma journée, Séance, Coach Poids, Agenda, Nutrition,
Bien-être). Sur Android, un appui long sur l'icône les affiche.

**Sur iPhone, Apple ne les prend pas en charge** — l'appui long n'affichera pas ces
raccourcis. Ce n'est pas un défaut de l'app, c'est une limite d'iOS. Tu navigues
simplement via les onglets à l'intérieur de l'app.

---

## 5. Les notifications

Les notifications web sur iPhone existent **depuis iOS 16.4**, et **uniquement pour
les apps installées sur l'écran d'accueil**. Si tu es sur une version plus ancienne
d'iOS, ou si tu ouvres l'app depuis Safari, elles ne fonctionneront pas.

Vérifie ta version : **Réglages iPhone → Général → Informations → Version du logiciel**.

---

## 6. Les mises à jour

Tu n'as **rien à faire**. L'app se met à jour toute seule : à chaque amélioration que
je publie, la version en ligne est reconstruite automatiquement, et ton app récupère
la nouveauté au prochain lancement (parfois au second, le temps que le cache se
rafraîchisse).

L'écran **« Nouveautés »** dans l'app te dit ce qui a changé depuis ta dernière visite.

Si tu veux forcer une mise à jour : ferme complètement l'app (glisse-la vers le haut
depuis le sélecteur d'apps) et rouvre-la.

---

## 7. Ça ne marche pas ?

**« Je ne vois pas "Sur l'écran d'accueil" »**
→ Tu n'es pas dans Safari. Chrome et Firefox sur iPhone ne peuvent pas installer de
PWA. Rouvre le lien dans Safari.

**« L'app est vide, j'ai perdu mes données »**
→ Vérifie que tu lances bien l'app **depuis l'icône** et non depuis Safari : ce sont
potentiellement deux stockages distincts. Sinon, réimporte ta dernière sauvegarde
JSON.

**« Mes données du PC ne sont pas là »**
→ Normal, il n'y a pas de synchronisation. Exporte le JSON depuis le PC, envoie-le
sur ton iPhone (mail, AirDrop, iCloud), puis importe-le dans l'app.

**« L'app ne se met pas à jour »**
→ Ferme-la complètement et rouvre-la. Si ça persiste, désinstalle l'icône (appui long
→ Supprimer l'app) et réinstalle depuis Safari. ⚠️ **Exporte tes données avant**, par
sécurité.

---

## 8. Et sur les autres appareils ?

- **Android (Chrome)** : ouvre le lien, une bannière « Installer l'application »
  apparaît, ou passe par le menu ⋮ → « Installer l'application ». Les raccourcis
  fonctionnent, eux.
- **PC / Mac (Chrome, Edge)** : une icône d'installation apparaît dans la barre
  d'adresse. Tu as aussi la **vraie application Windows** (Electron), installée via
  le fichier `.exe` des releases — c'est celle que tu utilises déjà sur ton PC.

Rappel : chaque appareil garde ses propres données. Le pont entre eux, c'est
l'export/import JSON.
