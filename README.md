# Donjon 3D (démo Three.js)

Cette petite démonstration rend un donjon 3D minimaliste inspiré de l'ambiance **Donjons & Dragons**. Elle repose uniquement sur du HTML + JavaScript (Three.js via CDN) et tourne dans un navigateur moderne.

## Lancer la démo

1. Servez le dossier avec n'importe quel serveur statique (par exemple `python -m http.server 8000`).
2. Ouvrez [http://localhost:8000](http://localhost:8000) dans votre navigateur.

## Tests

Une vérification rapide existe pour s'assurer que les éléments HUD et les mécaniques clés sont bien présents :

- Installez Node.js (aucune dépendance externe n'est requise).
- Lancez `npm test` à la racine du projet.

## Contrôles

- **Z / S** : Avancer / Reculer (AZERTY)
- **Q / D** : Tourner le personnage
- **Flèches gauche / droite** : Pas latéraux
- **Espace** : Sauter
- **Shift** : Sprint
- **F** : Basculer la vue FPS / troisième personne (capture souris en FPS)
- **Clic** : Viser en vue FPS
- **Clic gauche** : Tir arcanique (après avoir ramassé le grimoire)

## Fonctionnalités

- Plateau 3D texturé avec éclairage dynamique et torches vacillantes.
- Héros stylisé avec caméra suiveuse, saut et sprint.
- Collisions simples avec les murs du donjon pour éviter de traverser les cloisons.
- Orbes hostiles qui patrouillent et infligent des dégâts, avec affichage de la vie restante.
- Potion verte à collecter pour regagner de la vie en pleine exploration.
- Clé dorée à récupérer pour ouvrir une porte levante et atteindre un coffre au trésor.
- Coffre animé rapportant du butin, et pièges à pointes qui blessent au moindre contact.
- Cristal de mana violet offrant un bouclier temporaire et un bonus de butin.
- Spectres bleus flottants qui poursuivent le héros et infligent des dégâts au contact.
- Sprint avec jauge d'endurance : courir consomme l'énergie qui se régénère lorsque tu marches.
- Runes mystiques à lier pour invoquer un portail bonus et gagner du butin supplémentaire.
- Tourelles arcanes qui verrouillent leur cible et tirent des projectiles d'énergie à esquiver.
- Feu de camp réparateur : approche-toi pour récupérer un peu de vie et recharger toute ton endurance.
- Vue FPS optionnelle avec pointeur de visée, souris capturée pour tourner la caméra et immersion façon donjon crawler.
- Décors supplémentaires (colonnes, bannières) pour densifier les couloirs et donner des repères visuels.
- Grimoire arcanique à trouver pour débloquer un tir magique, utile pour dissiper spectres, tourelles et orbes.
- Golem gardien patrouillant : ses charges blessent mais il peut être neutralisé avec les traits arcaniques.

Cette base peut servir de point de départ pour ajouter des quêtes, des combats au tour par tour ou un maître du jeu numérique.
