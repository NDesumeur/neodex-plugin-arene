# NeoBestiary Arène

Les créatures que tu as inventées dans **NeoBestiary Studio** s'affrontent au tour par tour dans une arène en pixel art.

## Ce qu'elle sait faire

- **Combat contre l'ordinateur** ou **duel à deux joueurs** sur le même ordinateur.
- **Choix des créatures** : toutes celles du Studio qui ont une fiche de combat, et chacune de leurs variantes de couleur. Pour chacune : portrait de combat, rareté, statistiques, faiblesses, résistances et attaques. « Au hasard » tire une créature au sort.
- **Combat** : les créatures entrent en marchant, puis chacune choisit une de ses attaques (2 à 4 selon sa rareté, touches 1 à 4) ou la **garde** (moitié moins de dégâts au prochain coup). La plus rapide frappe la première. Les attaques au contact foncent sur l'adversaire, celles à distance lancent leur projectile à travers l'arène, celles de zone éclatent autour de la créature. Le **soin** rend des PV (certains guérissent aussi les statuts), le **renfort** monte une ou deux statistiques. Chaque attaque suit sa technique du Studio (204 en tout) : un **statut** avec sa chance, des **crans** de statistiques (attaque, défense, vitesse, précision, de -3 à +3, affichés sous la barre de PV), une **précision** (une attaque peut rater), des **coups multiples**, la **priorité** (la rafale part avant tout), le **vol de vie**, le **contrecoup** (qui peut mettre K.O. le lanceur) et les **coups critiques** fréquents des griffes.

Les statuts : brûlure (perd des PV à chaque tour et frappe moins fort), poison (perd des PV à chaque tour), saignement (perd des PV et sa défense baisse), gel (ne peut plus agir jusqu'à ce que la glace fonde), sommeil (dort 1 à 3 tours), paralysie (deux fois plus lente, et parfois incapable d'agir), confusion (se frappe parfois elle-même), éblouissement (rate plus souvent) et peur (perd son action si elle n'a pas encore joué). Une attaque d'un élément auquel l'adversaire est faible fait 1,5 fois plus mal, et 1 coup sur 16 est critique. Les créatures d'anciennes versions du Studio combattent comme avant.
- **Animations** : celles faites par le Studio (marche, attente, attaques avec leurs effets, dégâts, K.O.), avec la foule, les torches et l'écran qui tremble.
- **Palmarès** : victoires et défaites de chaque créature et de chaque variante.

Raccourcis : touches **1**, **2** et **3** pour les actions, **Échap** pour revenir au menu.

- **Doubles types** : une créature sur deux a deux types, affichés côte à côte ; ses attaques des deux éléments profitent de son type.
- **NeoMe, n° 0** : toujours en tête de la liste, avec sa rareté **???** et son type double ombre et lumière (ses attaques d'ombre comme de lumière profitent de son type). Lui seul a des **attaques signature**, dessinées par le modèle d'image de NeoBestiary Studio et jouées en grand : l'arène s'assombrit, Éclipse s'embrase autour de lui puis balaie l'arène, Regard d'aurore lance deux rayons jusqu'à l'ennemi, Mélodie du casque envoie une onde de notes, Coquille d'origine referme un dôme d'éclats qui le soigne.

## Ce qu'il faut

- **NeoBestiary Studio** 1.1.0 ou plus récent (installé avec l'Arène). Les créatures sont lues dans `Documents\NeoBestiary Studio\creatures`, sans jamais être modifiées.
- Une créature apparaît dans l'Arène dès qu'elle a sa fiche de combat. Pour une créature faite avec une version plus ancienne du Studio, ouvre-la et clique « Réécrire la fiche » : elle reçoit alors ses 2 à 4 attaques et sa rareté d'après son prestige.

L'Arène n'a besoin ni de carte graphique ni d'Ollama : tout est déjà dessiné par le Studio.

## Permissions

Accès complet : l'Arène lit le dossier des créatures du Studio, dans tes Documents. Elle n'écrit que son palmarès, dans ses propres données.
