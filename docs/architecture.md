# Architecture

## Objectif

Construire `tfto` comme un auto-battler 2D data-driven, avec une séparation nette entre :
- données de contenu
- logique métier
- systèmes de simulation
- rendu UI et scène

## Découpage

### `src/bootstrap`
Initialisation du jeu, assemblage des modules, point d’entrée runtime.

### `src/config`
Configuration globale du prototype, flags, constantes de tuning.

### `src/core`
Orchestration haut niveau du jeu.

### `src/data`
Contenu déclaratif : unités, synergies, arènes, objets.

### `src/domain`
Règles métier pures : plateau, unités, économie, rounds, joueur.

### `src/engine`
Boucle de jeu, état global, événements, outils runtime.

### `src/rendering`
Affichage scène + UI.

### `src/systems`
Systèmes transverses : IA, combat, ciblage, pathfinding, progression.

### `src/shared`
Constantes et utilitaires communs.

## Règle de croissance

Tout nouveau comportement doit d’abord être classé :
- donnée
- règle métier
- système runtime
- rendu

Sinon le projet va tourner au spaghetti, et ça, c’est non.
