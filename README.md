# Movinglist

Checklist mobile-first pour la liste d’achats d’emménagement à Limassol. Tout est en HTML/CSS/JS vanilla, sans dépendances externes.

## Contenu
- `index.html` : structure de la page
- `styles.css` : design responsive + dark mode
- `app.js` : logique (filtres, recherche, progression, localStorage, export/import)
- `data.js` : données de la checklist en français

## Utilisation rapide
- Ouvrez `index.html` dans un navigateur moderne.
- Cochez, filtrez par magasin/catégorie, utilisez "Manquants seulement".
- Exportez un JSON pour sauvegarder votre progression, ou importez-le sur un autre appareil.

## GitHub Pages
1. Poussez le dépôt sur GitHub.
2. Allez dans `Settings` → `Pages`.
3. `Build and deployment` → `Source`: choisissez `Deploy from a branch`.
4. Sélectionnez la branche `main` (ou `master`) et le dossier `/root`, puis sauvegardez.
5. GitHub fournit l’URL du site (ex: `https://<utilisateur>.github.io/<repo>/`).

## Ouvrir sur iPhone
1. Ouvrez l’URL GitHub Pages dans Safari.
2. Touchez `Partager` → `Sur l’écran d’accueil` pour un accès rapide.
3. L’état est stocké dans le navigateur via `localStorage`.

## Sauvegarde / restauration
- `Exporter JSON` génère un fichier avec votre progression.
- `Importer JSON` applique la progression sauvegardée (les cases non trouvées sont ignorées).
