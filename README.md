# Application mobile Logigramme BT/HT

Application mobile installable de type PWA pour le logigramme de coupure générale BT/HT.

## Installation sur téléphone

### Android / Chrome
1. Ouvrir l’adresse GitHub Pages de l’application.
2. Appuyer sur le menu Chrome `⋮`.
3. Choisir **Ajouter à l’écran d’accueil** ou **Installer l’application**.

### iPhone / Safari
1. Ouvrir l’adresse GitHub Pages dans Safari.
2. Appuyer sur le bouton **Partager**.
3. Choisir **Sur l’écran d’accueil**.
4. Valider avec **Ajouter**.

## Mise en ligne GitHub Pages

1. Créer un dépôt GitHub.
2. Envoyer tout le contenu de ce dossier.
3. Aller dans **Settings > Pages**.
4. Choisir :
   - Source : **Deploy from a branch**
   - Branch : **main**
   - Folder : **/root**
5. Ouvrir l’URL GitHub Pages générée.

## Contenu

- `index.html` : application complète
- `manifest.webmanifest` : configuration application mobile
- `service-worker.js` : cache hors ligne
- `icons/` : icônes mobile
- `.nojekyll` : compatibilité GitHub Pages

## Notes

L’application fonctionne sans dépendance externe.
