# NeoBestiary Arène

Les créatures que tu as inventées dans **NeoBestiary Studio** s'affrontent au tour par tour. Choisis ta créature, une adversaire (l'ordinateur ou un ami sur le même PC), et mène le combat attaque par attaque jusqu'au K.O.

*English version: [README.en.md](README.en.md)*

## Préparer un combat

1. Choisis le mode : **contre l'ordinateur** ou **duel à deux joueurs** sur le même ordinateur.
2. Choisis ta créature et celle d'en face parmi toutes les créatures du Studio qui ont une fiche de combat, et chacune de leurs variantes de couleur. La fiche montre son portrait, sa rareté, son ou ses types, ses statistiques, ses faiblesses et résistances avec leur multiplicateur, et ses attaques. **Au hasard** tire une créature au sort.
3. Choisis la musique du combat si tu en veux une, puis lance.

## Pendant le combat

- Les deux créatures entrent dans l'arène. À chaque tour, chacune choisit une action ; **la plus rapide agit la première**.
- **Attaquer** : chaque créature a 2 à 4 attaques selon sa rareté (touches **1** à **4**). Les attaques au contact foncent sur l'adversaire, celles à distance traversent l'arène, celles de zone éclatent autour de la créature.
- **Se mettre en garde** : le prochain coup reçu fait moitié moins de dégâts.
- **Soin** : rend des PV, et certains soins guérissent aussi les statuts. **Renfort** : monte une ou deux statistiques.
- **Échap** revient au menu.

## Ce que fait chaque attaque

Chaque attaque suit sa technique du Studio (204 techniques en tout) :

- **Statut** infligé avec une certaine chance.
- **Crans de statistiques** : attaque, défense, vitesse et précision, de -3 à +3, affichés sous la barre de PV.
- **Précision** : une attaque peut rater.
- **Coups multiples**.
- **Priorité** : par exemple la rafale, qui part avant tout le reste.
- **Vol de vie**.
- **Contrecoup** : il peut mettre K.O. le lanceur.
- **Coups critiques**, plus fréquents pour les griffes.

## Les types

- Une créature sur deux a **deux types** ; ses attaques des deux éléments profitent de son type.
- Les dégâts suivent une table des types : de **×4** (« C'est super efficace ! ») à **×¼**.
- Une **immunité** annule l'attaque et son statut (« Ça n'affecte pas… »).
- Un coup sur 16 est critique.

## Les neuf statuts

- **Brûlure** : perd des PV à chaque tour et frappe moins fort.
- **Poison** : perd des PV à chaque tour.
- **Saignement** : perd des PV et sa défense baisse.
- **Gel** : ne peut plus agir jusqu'à ce que la glace fonde.
- **Sommeil** : dort 1 à 3 tours.
- **Paralysie** : deux fois plus lente, et parfois incapable d'agir.
- **Confusion** : se frappe parfois elle-même.
- **Éblouissement** : rate plus souvent.
- **Peur** : perd son action si elle n'a pas encore joué.

## NeoMe, n° 0

NeoMe est toujours en tête de la liste, avec la rareté **???** et le double type ombre et lumière. C'est la seule créature à avoir des **attaques signature**, jouées en grand :

- **Éclipse** : l'arène s'assombrit, puis Éclipse s'embrase autour de lui et balaie l'arène.
- **Regard d'aurore** : deux rayons jusqu'à l'adversaire.
- **Mélodie du casque** : une onde de notes.
- **Coquille d'origine** : un dôme d'éclats qui le soigne.

Une créature qui a reçu une **attaque créée** dans le Studio la joue avec sa propre mise en scène : le lancer, le trajet et l'impact.

## Palmarès

L'Arène compte les victoires et les défaites de chaque créature et de chaque variante.

## Ce qu'il faut

- **NeoBestiary Studio** 1.1.0 ou plus récent (installé avec l'Arène). Les créatures sont lues dans `Documents\NeoBestiary Studio\creatures`, sans jamais être modifiées.
- Une créature apparaît dès qu'elle a sa fiche de combat. Pour une créature faite avec une ancienne version du Studio, ouvre-la dans le Studio et clique **Réécrire la fiche** : elle reçoit ses 2 à 4 attaques et sa rareté d'après son prestige.
- Ni carte graphique ni Ollama : les animations sont déjà faites par le Studio.

## Autorisations

L'Arène a un volet système (accès complet) pour lire le dossier des créatures du Studio dans tes Documents. Elle n'écrit que son palmarès, dans ses propres données, sauvegardées et synchronisées par NeoDex.

## Installer

Dans NeoDex : **NeoStore → À découvrir → NeoBestiary Arène → Installer**.
