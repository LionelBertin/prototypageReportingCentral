



###########################################################
# P1

## valeur applicable


Si l'objet principal est en lien avec le Collaborateur, ajoute un bouton en bas des Colonnes du rapport pour "ajouter des objets spéciaux".
Dans le fenêtre qui s'ouvre l'utilisateur commnence par choisir l'objet à travailler (tous les objetd sont proposés)
puis il doit choisir entre
- une instance en particulier : il indique alors l'attribut sur lequel trier et l'ordre (première/dernière) et les attributs qu'il veut ajouter au rapport
- le résultat d'une opération : il indique alors sur lequel appliquer l'opération et en choisissant l'opérateur selon le format de colonne (Nombre, Somme, Min, Max, Concat, ...)




# Uniquement pour les objets avec resultingSingleLine=true dans applicationDate on propose en plus
## Si on est dans un rapport en mode "jour" avec une date au format dd/mm/yyyy
### Si requirementMode = period
on utilise la date du rapport comme date de fin, et on place la date de début 11 mois plus tôt
### Sinon
on utilise par défaut la date du rapport (l'utilisateur pourra changer pour cibler une colonne  date du rapport ex:  date début absence)
## Si on est dans un rapport en mode "période" avec une date de début et fin
### Si requirementMode = period
on utilise par défaut les dates du rapport
### Sinon
on utilise par défaut la date de fin du rapport (l'utilisateur pourra changer pour cibler une colonne  date du rapport ex:  date début absence)


Collaborateur Demandeur, Bénéficiaire, Approbateur, ou Refusant


## réduction des cardinalités
réintégrer "opération" et "valeur spéciale" suite à l'insertion par défaut de la liste détaillée ?



###########################################################
# P2
Ajouter sous objet à Objectifs pour lister les seuils et description de chaque palier.

###########################################################
# P3

## dates filtres rapides pour les satuts collab sur période
Il faut affiner les formulations des filtres rapides pour les satuts collab sur une période car en l'état ça ne prend pas toujours la bonne date de début ou fin..
• Partis: collaborateurs ayant un poste avec Date fin <= 24/04/2026 et n'ayant aucun poste avec Date début >= 24/04/2026.
• Présents: collaborateurs ayant un poste avec Date début <= 24/04/2026 et (Date fin >= 24/04/2026 ou Date fin vide).
• Nouveaux: collaborateurs ayant un poste futur (Date début > 24/04/2026) sans poste passé (Date fin < 24/04/2026).
• Retours: collaborateurs ayant un poste futur (Date début > 24/04/2026) et aussi un poste passé (Date fin < 24/04/2026), sans poste présent à la date 24/04/2026.

###########################################################


TODO
Vérifier dans génération spec la présence des règles
=> Pour objet applicable 
    - requirementMode=period alors choix date début et date fin
    - sinon choix date jour uniquement
        -- possibilité date libre autre que rapport et conditionner date à autre attribut du rapport.

=> Pour un objet applicable avec requirementMode=period on ne laisse pas d'autre possibilité que le choix de "Date de valeur du rapport"

=> Si l'objet principal du rapport n'est pas lié à un collaborateur, alors il n'y a pas de "Contexte temporel du rapport"


# avec Romain  7 avril
dataValue+dataAnalysis 