# CAPB - Site de procedures d'urgence

## Objectif
Ce depot contient le site statique des consignes d'urgence CAPB.

Le site donne un acces rapide a 4 procedures :
- coupure de courant site avec poste HT / BT
- coupure de courant site BT
- panne sur le systeme d’information industrielle et de supervision
- incendie

Chaque procedure existe en 2 formats :
- une version interactive pas-a-pas
- une version statique telechargeable et imprimable

Le site est maintenant protege par une authentification par code a 6 chiffres envoye par email.
L'acces est reserve aux adresses `@communaute-paysbasque.fr`.
La session se ferme automatiquement apres `1 heure d’inactivite`.

## Structure du depot

### Accueil
- `index.html`
  - page d'accueil du site
  - titre principal : `Situation d'urgence`
  - cards de consignes
  - logo CAPB centre en haut
  - favicon visible sur chaque card de consigne en haut a droite

### Authentification Vercel
- `auth/index.html`
  - page de connexion passwordless
  - saisie de l'email professionnel
  - saisie du code OTP a 6 chiffres
- `middleware.js`
  - protege les pages du site
  - redirige vers `/auth/` si la session n'est pas presente
- `api/auth/send-otp.js`
  - verifie le domaine email autorise
  - genere le code OTP
  - envoie le code par email via SMTP
- `api/auth/verify-otp.js`
  - verifie le code saisi
  - cree la session securisee
  - peut accepter un acces de secours si les variables Vercel dediees sont activees
- `api/auth/session.js`
  - expose l'etat de session courant
- `api/auth/touch.js`
  - prolonge la session uniquement en cas d’activite utilisateur
- `api/auth/logout.js`
  - ferme la session
- `api/_lib/auth.js`
  - fonctions partagees : signature, cookies, tokens, validation email
- `api/contacts.js`
  - expose les contacts metier apres authentification
  - lit les donnees depuis la variable Vercel `CAPB_CONTACTS_JSON`

### Procedures interactives
- `pshtbt/index.html`
  - procedure interactive coupure de courant site avec poste HT / BT
- `psbt/index.html`
  - procedure interactive coupure de courant site BT
- `psii/index.html`
  - procedure interactive panne sur le systeme d’information industrielle et de supervision
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
- `psii/procedure-statique.html`
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
  - cache offline limite aux assets publics
  - ne doit plus mettre en cache les pages protegees

## URLs a conserver
Ne pas casser ces routes :
- `/`
- `/auth/`
- `/pshtbt/`
- `/psbt/`
- `/psii/`
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
- ambre pour la procedure systeme d’information industrielle
- rouge pour incendie
- logo CAPB centre en haut
- favicon sur les cards de consigne de l'accueil

Taille actuelle du favicon sur les cards d'accueil :
- desktop : `110x110`
- mobile : `75x75`

### 6. Mobile first
Toute modification doit rester lisible sur mobile.
Ne pas ajouter de mise en page qui casse les cards, les boutons ou les textes sur petit ecran.

### 7. Authentification
L'authentification actuelle suit cette architecture :
1. l'utilisateur saisit son email
2. le serveur verifie que l'adresse finit par `@communaute-paysbasque.fr`
3. le serveur genere un code a 6 chiffres
4. le serveur envoie le code par email
5. l'utilisateur saisit le code
6. le serveur cree une session securisee en cookie HTTP-only signe
7. la session expire apres 1 heure sans activite
8. l'activite utilisateur prolonge la session via `api/auth/touch.js`

Contraintes de maintenance :
- ne pas exposer le secret de signature dans le code
- garder les cookies de session en `HttpOnly`, `Secure`, `SameSite=Strict`
- ne pas remettre les pages protegees dans le cache offline
- ne pas remplacer ce mecanisme par un stockage local JavaScript pour la session
- conserver la duree d’inactivite a `1 heure` sauf decision explicite

## Variables d'environnement Vercel
Configurer au minimum ces variables dans le projet Vercel :
- `AUTH_SECRET`
  - secret aleatoire fort utilise pour signer les tokens OTP et session
- `SMTP_HOST`
  - valeur recommandee : `smtp.communaute-paysbasque.fr`
- `SMTP_PORT`
  - valeur recommandee : `25`
- `SMTP_FROM`
  - valeur recommandee : `no-reply@procedureurgence-capb.fr`
- `CAPB_CONTACTS_JSON`
  - JSON complet des contacts metier charge par `api/contacts.js`
  - a maintenir cote Vercel, pas dans le depot

Variables optionnelles si le relais SMTP demande une authentification :
- `SMTP_USER`
- `SMTP_PASSWORD`
- `SMTP_TLS_REJECT_UNAUTHORIZED`

Variables optionnelles pour l’acces de secours :
- `EMERGENCY_ACCESS_ENABLED`
  - `true` pour activer le mode secours
- `EMERGENCY_ACCESS_EMAIL`
  - adresse CAPB autorisee pour le mode secours
- `EMERGENCY_ACCESS_CODE`
  - code a 6 chiffres du mode secours

## Contacts a maintenir
Les contacts ne doivent plus etre stockes dans le depot public.
La source de verite est maintenant la variable Vercel `CAPB_CONTACTS_JSON`.

Structure attendue :
```json
{
  "pshtbt": {
    "enedis": [],
    "maintenance": [],
    "process": []
  },
  "psbt": {
    "enedis": [],
    "maintenance": [],
    "process": []
  },
  "psii": {
    "processDay": [],
    "regulation": [],
    "maintenance": [],
    "dsi": [],
    "dqfs": [],
    "dqfsDuty": []
  },
  "pi": {
    "emergency": [],
    "siteAlert": []
  }
}
```

Format d'un contact :
```json
{
  "name": "Nom Prenom",
  "role": "Fonction",
  "tel": "0612345678",
  "label": "06 12 34 56 78"
}
```

Format ENEDIS avec lien web :
```json
{
  "name": "Depannage ENEDIS",
  "role": "Site panne et interruption",
  "tel": "0972675064",
  "label": "09 72 67 50 64",
  "link": "https://www.enedis.fr/panne-et-interruption",
  "linkLabel": "Ouvrir le site ENEDIS"
}
```

### Points d'attention
- un contact masque ne fait pas partie des contacts maintenance.
- un contact masque doit apparaitre dans les cards d'alerte metier, sauf pour ENEDIS et les secours incendie.
- Les secours incendie et ENEDIS doivent rester dans des cards dediees, sans melange avec les contacts metier.
- Pour la procedure systeme d’information industrielle, utiliser la DSI si le site n’a plus acces a Internet public, sinon orienter la verification vers un service metier masque / serveur masque a Bidart.
- Pour cette meme procedure :
  - regulation d’astreinte = `numero masque`
  - astreinte DQFS = `contact masque`

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
- ajouter seulement les nouveaux assets publics si besoin
- ne pas ajouter les pages protegees dans le cache
- incrementer `CACHE_NAME`

### 5. Verifier le manifest si necessaire
Modifier `manifest.webmanifest` seulement si :
- le nom global du site change
- l'identite de l'application change
- les icones changent

### 6. Mettre a jour les contacts si necessaire
Si la nouvelle consigne affiche des contacts :
- ajouter la nouvelle structure dans `CAPB_CONTACTS_JSON`
- conserver les memes champs (`name`, `role`, `tel`, `label`)
- ne pas remettre de numeros en dur dans le HTML public

## Modifier une procedure existante
Quand une procedure change :
- ne pas casser sa route
- conserver le mode pas-a-pas
- mettre a jour aussi la version statique si la logique metier change
- verifier les contacts associes a chaque branche
- verifier que les liens `tel:` sont corrects
- verifier les liens externes
- si les contacts changent, mettre a jour `CAPB_CONTACTS_JSON`

## Check-list avant validation
Avant de considerer une modification comme terminee, verifier :
- l'accueil s'affiche correctement apres connexion
- la page `/auth/` fonctionne
- l'envoi du code OTP fonctionne
- le code a 6 chiffres est bien verifie
- une session est bien creee apres verification
- une adresse hors domaine `@communaute-paysbasque.fr` est refusee
- la deconnexion automatique apres 1 heure d’inactivite fonctionne
- les cards principales sont visibles et cliquables
- les icones d'accueil restent bien positionnees
- chaque procedure interactive avance correctement etape par etape
- `Retour` fonctionne
- `Recommencer` fonctionne
- les contacts s'affichent dans les bonnes etapes
- les appels telephoniques utilisent bien `tel:`
- les versions statiques sont a jour
- l'impression A4 reste lisible
- le service worker ne met pas les pages protegees en cache
- le manifest reste coherent avec le site reel
- `CAPB_CONTACTS_JSON` est configuree sur Vercel

## Mise en ligne Vercel
Le site est maintenant prevu pour Vercel avec pages statiques + fonctions `api/`.

A faire cote projet Vercel :
1. connecter le depot GitHub au projet Vercel
2. definir les variables d'environnement listees plus haut
3. verifier que le relais SMTP accepte les emails emis depuis Vercel
4. renseigner `CAPB_CONTACTS_JSON`
5. redeployer en production
6. tester `/auth/`, puis l'acces a `/`, `/pshtbt/`, `/psbt/`, `/psii/` et `/pi/`

## Philosophie de maintenance
Le site doit rester :
- simple
- lisible
- stable
- modifiable rapidement
- sans framework
- sans dependance externe inutile

Si une evolution importante est demandee, preferer :
- du HTML clair
- du CSS local par page si besoin
- du JavaScript simple, lisible et structure
- des fonctions Vercel courtes et explicites pour la partie serveur

Eviter :
- les abstractions inutiles
- les dependances ajoutees sans necessite
- les changements de structure qui cassent les URLs ou le mode de fonctionnement actuel
- le stockage de secrets dans le depot
