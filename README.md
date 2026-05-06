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

Le site est maintenant protege par une authentification OAuth2 / SSO.
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

### Authentification
- `auth/index.html`
  - page de connexion SSO / OAuth2
- `php/auth.php`
  - fonctions partagees PHP : signature, cookies, session, validation email, helpers OAuth2
- `api/auth/oauth-start.php`
  - construit la redirection OAuth2
  - signe l'etat de retour
- `api/auth/oauth-callback.php`
  - recupere le code OAuth2
  - echange le code contre un token
  - extrait l'email autorise et cree la session
- `api/auth/session.php`
  - expose l'etat de session courant
- `api/auth/touch.php`
  - prolonge la session uniquement en cas d’activite utilisateur
- `api/auth/logout.php`
  - ferme la session

### Base de donnees contacts
- `php/db.php`
  - connexion base de donnees
  - lecture des contacts metier
- `api/contacts.php`
  - expose les contacts metier apres authentification
  - lit les donnees depuis la base MySQL
- `database/schema.mysql.sql`
  - schema MySQL 8 de la table `contacts_secu`
- `database/schema.sql`
  - schema SQLite de secours pour un usage local si necessaire

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

### Assets communs
- `icons/favicon.png`
- `icons/logo capb.png`

### PWA / offline
- `manifest.webmanifest`
- `service-worker.js`

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

## Variables d'environnement serveur
Configurer au minimum ces variables :
- `AUTH_SECRET`
- `OAUTH2_ENABLED=true`
- `OAUTH2_CLIENT_ID`
- `OAUTH2_CLIENT_SECRET`
- `OAUTH2_REDIRECT_URI`
- `APP_BASE_PATH`

## Variables d'environnement base de donnees
Le site est maintenant prevu pour MySQL 8.

Variables supportees par `php/db.php` :
- `CAPB_DB_DRIVER`
  - par defaut : `mysql`
- `CAPB_DB_HOST`
  - par defaut : `192.168.15.253`
- `CAPB_DB_PORT`
  - par defaut : `3306`
- `CAPB_DB_NAME`
  - par defaut : `exploitation`
- `CAPB_DB_USER`
- `CAPB_DB_PASSWORD`
- `CAPB_DB_CHARSET`
  - par defaut : `utf8mb4`
- `CAPB_DB_CONTACTS_TABLE`
  - par defaut : `contacts_secu`

Option avancee :
- `CAPB_DB_DSN`
  - si definie, remplace la construction automatique de la connexion

## Parametrage Portainer attendu
Exemple de variables a poser dans le conteneur :

```env
APP_BASE_PATH=/secu
AUTH_SECRET=remplacer-par-une-cle-longue
OAUTH2_ENABLED=true
OAUTH2_CLIENT_ID=situation-urgence
OAUTH2_CLIENT_SECRET=remplacer-par-le-secret-oidc
OAUTH2_REDIRECT_URI=https://elmn.communaute-paysbasque.fr/secu/api/auth/oauth-callback
CAPB_DB_DRIVER=mysql
CAPB_DB_HOST=192.168.15.253
CAPB_DB_PORT=3306
CAPB_DB_NAME=exploitation
CAPB_DB_USER=secu
CAPB_DB_PASSWORD=remplacer-par-le-mot-de-passe
CAPB_DB_CONTACTS_TABLE=contacts_secu
```

## Structure attendue de la table contacts
La table `contacts_secu` doit contenir au minimum :
- `procedure_key`
- `group_key`
- `name`
- `role`
- `tel`
- `label`
- `link`
- `link_label`
- `sort_order`
- `is_active`

Cles procedures attendues :
- `pshtbt`
- `psbt`
- `psii`
- `pi`

Groupes attendus selon les procedures :
- `pshtbt` : `enedis`, `maintenance`, `process`
- `psbt` : `enedis`, `maintenance`, `process`
- `psii` : `processDay`, `regulation`, `maintenance`, `dsi`, `dqfs`, `dqfsDuty`
- `pi` : `emergency`, `siteAlert`

## Creation de la table MySQL
Executer `database/schema.mysql.sql` dans la base `exploitation`.

## Exemple d'insertion
```sql
INSERT INTO contacts_secu (procedure_key, group_key, name, role, tel, label, link, link_label, sort_order, is_active)
VALUES
('psbt', 'enedis', 'Depannage ENEDIS', 'Site panne et interruption', '0972675064', '09 72 67 50 64', 'https://www.enedis.fr/panne-et-interruption', 'Ouvrir le site ENEDIS', 10, 1),
('psbt', 'maintenance', 'Responsable maintenance', 'Maintenance', '0600000000', '06 00 00 00 00', NULL, NULL, 20, 1),
('psbt', 'process', 'Responsable process', 'Process', '0611111111', '06 11 11 11 11', NULL, NULL, 30, 1);
```

## Check-list avant validation
Avant de considerer une modification comme terminee, verifier :
- l'accueil s'affiche correctement apres connexion
- la page `/auth/` fonctionne
- le callback OAuth2 ouvre bien une session pour un compte autorise
- la deconnexion automatique apres 1 heure d’inactivite fonctionne
- chaque procedure interactive avance correctement etape par etape
- les contacts s'affichent dans les bonnes etapes
- les appels telephoniques utilisent bien `tel:`
- `api/contacts.php` renvoie bien un JSON valide
- la table `contacts_secu` contient bien des lignes actives
- le service worker ne met pas les pages protegees en cache

## Philosophie de maintenance
Le site doit rester :
- simple
- lisible
- stable
- modifiable rapidement
- sans framework
- sans dependance externe inutile

Eviter :
- les abstractions inutiles
- les dependances ajoutees sans necessite
- les changements de structure qui cassent les URLs ou le mode de fonctionnement actuel
- le stockage de secrets dans le depot
