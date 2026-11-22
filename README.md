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
- **Les coups se voient et s'entendent** : chaque attaque a son son (d'après son geste et son élément), la cible recule et blanchit sous le coup, plus fort pour un coup critique ou très efficace. En garde, la créature s'accroupit. Les statuts se voient sur le corps : la brûlure clignote en orange, le gel bleuit et ralentit, le poison verdit, le sommeil ferme les yeux et fait respirer lentement, avec des « z ». Une attaque **épique ou légendaire** fige l'image un instant, assombrit l'arène et zoome sur le lanceur.

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

## Les équipes de 3

Dans le menu, « Format : Équipes de 3 » fait choisir trois créatures à chaque camp. En combat, le bouton « Changer » fait entrer une créature de la réserve : elle prend le tour, et celle qui sort perd ses crans de statistiques. Après un K.O., on choisit qui la remplace ; le combat se finit quand un camp n'a plus personne debout. L'ordinateur change quand l'adversaire est très efficace contre sa créature, et fait entrer celle qui le craint le moins.

## Les talents

Chaque créature a un talent passif : celui de sa fiche du Studio s'il y en a un, sinon il vient de sa meilleure statistique et de son type. Rage (plus fort sous le quart des PV), Carapace (moins de dégâts au-dessus de la moitié des PV), Éclaireur (vitesse +1 en entrant), Régénération (1/16 des PV par tour), Chanceux (deux fois plus de critiques), Épines (l'attaquant au contact perd 1/8 des dégâts), Intimidation (attaque de l'adversaire -1 à l'entrée) et Esprit clair (ni sommeil ni confusion). Le talent s'affiche sur la fiche et dans la barre de vie.

## Le Draft

« Format : Draft » tire 9 créatures au sort. Chaque camp en prend 3 à tour de rôle (1, 2, 2, 1), contre l'ordinateur ou à deux, puis le combat en équipes de 3 commence.
