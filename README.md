# CAPB - Site de procedures d'urgence

## Objectif
Ce depot contient le site statique des consignes d'urgence CAPB.

Le site donne un acces rapide a 3 procedures :
- coupure de courant site avec poste HT / BT
- coupure de courant site BT
- incendie

Chaque procedure existe en 2 formats :
- une version interactive pas-a-pas
- une version statique telechargeable et imprimable

## Structure du depot

### Accueil
- `index.html`
  - page d'accueil du site
  - titre principal : `Situation d'urgence`
  - cards de consignes
  - logo CAPB centre en haut
  - favicon visible sur chaque card de consigne en haut a droite

### Procedures interactives
- `pshtbt/index.html`
  - procedure interactive coupure de courant site avec poste HT / BT
- `psbt/index.html`
  - procedure interactive coupure de courant site BT
- `pi/index.html`
  - procedure interactive incendie

Chaque page interactive contient :
- une barre de navigation
- le logo CAPB
- une hero card de procedure
- une card `Procedure`
- un logigramme pas-a-pas en JavaScript
- un bouton `Retour`
- un bouton `Recommencer`
- des cards contacts quand il faut prevenir ou alerter

### Procedures statiques
- `pshtbt/procedure-statique.html`
- `psbt/procedure-statique.html`
- `pi/procedure-statique.html`

Ces pages servent a :
- telecharger la procedure
- imprimer la procedure en A4
- conserver une version lineaire et lisible

### Assets communs
- `icons/favicon.png`
  - favicon du site
  - utilise aussi comme icone visuelle sur les cards de l'accueil
- `icons/logo capb.png`
  - logo CAPB affiche en haut des pages

### PWA / offline
- `manifest.webmanifest`
  - configuration de l'application web
- `service-worker.js`
  - cache offline de l'accueil, des procedures et des assets principaux

## URLs a conserver
Ne pas casser ces routes :
- `/`
- `/pshtbt/`
- `/psbt/`
- `/pi/`

## Regles de fonctionnement

### 1. Accueil
L'accueil doit rester simple :
- titre principal
- cards de consignes
- acces direct aux procedures

Chaque nouvelle consigne ajoutee au site doit apparaitre ici.

### 2. Procedure interactive
Chaque procedure interactive doit rester un vrai logigramme pas-a-pas :
- une seule etape visible a la fois
- des questions avec boutons de reponse
- navigation `Retour`
- navigation `Recommencer`
- affichage du parcours deja suivi
- affichage des contacts au bon moment

### 3. Contacts
Pour les contacts :
- afficher le nom
- afficher le role
- afficher le numero en lien `tel:`
- separer clairement les liens web et les numeros de telephone
- utiliser `🔗` pour un lien web
- utiliser `📞` pour un numero de telephone

### 4. Versions statiques
Les versions statiques doivent :
- reprendre la meme logique metier
- rester lisibles sans interaction
- conserver la coherence graphique du site
- rester propres a l'impression A4

### 5. Identite visuelle
A conserver :
- vert pour HT / BT
- bleu / jaune pour BT
- rouge pour incendie
- logo CAPB centre en haut
- favicon sur les cards de consigne de l'accueil

Taille actuelle du favicon sur les cards d'accueil :
- desktop : `110x110`
- mobile : `75x75`

### 6. Mobile first
Toute modification doit rester lisible sur mobile.
Ne pas ajouter de mise en page qui casse les cards, les boutons ou les textes sur petit ecran.

## Ajouter une nouvelle consigne
Pour ajouter une nouvelle consigne, faire systematiquement les 5 blocs suivants.

### 1. Ajouter la card sur l'accueil
Modifier `index.html` :
- ajouter une nouvelle card dans la grille
- ajouter son titre
- ajouter son texte de presentation
- ajouter son lien vers la nouvelle page
- ajouter l'icone favicon comme sur les autres cards

### 2. Creer la page interactive
Creer un nouveau dossier, par exemple :
- `nouvelle-consigne/index.html`

La page doit contenir :
- navigation retour accueil et autres procedures si necessaire
- logo CAPB
- hero de procedure
- bloc `Procedure`
- etapes en JavaScript
- boutons `Retour` et `Recommencer`
- cards contacts si necessaire

### 3. Creer la page statique
Creer :
- `nouvelle-consigne/procedure-statique.html`

La page doit :
- reprendre la procedure sous forme lineaire
- etre telechargeable
- rester imprimable en A4

### 4. Mettre a jour le cache offline
Modifier `service-worker.js` :
- ajouter la nouvelle route interactive
- ajouter la page statique
- ajouter les nouveaux assets si besoin
- incrementer `CACHE_NAME`

### 5. Verifier le manifest si necessaire
Modifier `manifest.webmanifest` seulement si :
- le nom global du site change
- l'identite de l'application change
- les icones changent

## Modifier une procedure existante
Quand une procedure change :
- ne pas casser sa route
- conserver le mode pas-a-pas
- mettre a jour aussi la version statique si la logique metier change
- verifier les contacts associes a chaque branche
- verifier que les liens `tel:` sont corrects
- verifier les liens externes

## Check-list avant validation
Avant de considerer une modification comme terminee, verifier :
- l'accueil s'affiche correctement
- les 3 cards principales sont visibles et cliquables
- les icones d'accueil restent bien positionnees
- chaque procedure interactive avance correctement etape par etape
- `Retour` fonctionne
- `Recommencer` fonctionne
- les contacts s'affichent dans les bonnes etapes
- les appels telephoniques utilisent bien `tel:`
- les versions statiques sont a jour
- l'impression A4 reste lisible
- le service worker reference bien les nouvelles pages
- le manifest reste coherent avec le site reel

## Mise en ligne GitHub Pages
Le site est compatible avec GitHub Pages.

Configuration classique :
1. pousser le depot sur GitHub
2. aller dans `Settings > Pages`
3. choisir :
   - source : `Deploy from a branch`
   - branch : `main`
   - folder : `/root`

## Philosophie de maintenance
Le site doit rester :
- simple
- lisible
- stable
- modifiable rapidement
- sans framework
- sans dependance externe

Si une evolution importante est demandee, preferer :
- du HTML clair
- du CSS local par page si besoin
- du JavaScript simple, lisible et structure

Eviter :
- les abstractions inutiles
- les dependances ajoutees sans necessite
- les changements de structure qui cassent les URLs ou le mode de fonctionnement actuel
