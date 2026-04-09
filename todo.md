 passe l'option Bouton "autre cardinalités" à OFF par défaut dans la conf proto


###########################################################
# P1

Avant le filtrage sur les attributs, lorsque l'objet principal est lié à au moins un collaborateur (targetObject=Collaborateur), il faut ajouter une possibilité de filtrer sur certains attribut du contrat et du poste de l'unique collaborateur lié ou de celui marqué isMainCollaborator=true s'il y en a plusieurs (ex : "Bénéficiaire")

L'utilisateur peut changer le collaborateur ciblé s'il y en a plusieurs (ex:  "Demandeur", ou "Approbateur"), et peut filtrer facilement sur les attributts Type de contrat, Département, et Etablissement.
Pour les types de contrat, on utilise l'enum
Pour département, on présente la liste hiérarchique des départements avec la possiblité d'en sélectionner plusieurs.
Pour les établissements on utilise la liste à plat 


"Mes managés" => postes où j'apparais comme manager

Ajouter une filtre sur les managers dans le Contexte collaborateur (avant filtrage)



## liaison implicite à collaborateur
proposer filtre rapide 
- "Mes managés" (direct / indirects)
- "Mon département" (direct / indirects)

dès qu'un collaborateur est impliqué dans le rapport


## valeur applicable

- defaultDateFiltering" :"date de début et fin"
on utiliser les attributs dans le filtrage
    => dateDebutRapport < date1 & date2 < dateFinRapport 
    => dateDebutRapport < dateX  & dateX < dateFinRapport

    attrDate1 > dateDebutRapport ET  attrdate2<dateFinRapport

- defaultDateFiltering" :"none"
    Collaborateur
    DossierRH
    Paliers d'objectifs
    Candidats
    Département
    Etablissement
    Organisation
- defaultDateFiltering" :"chooseOne"
    Solde de congés
- defaultDateFiltering"  "dateDebutRapport":dateDebutRapport & dateFinRapport":dateFinRapport
    Évolution des soldes
    Suivi forfaits jours
    Statistiques des absences

On a toujours deux dates de début/fin pour borner le rapport (la seule exception serait pour les soldes de congés)
La question est de savoir comment permettre de cibler 
Pour un objet par défaut on peut présupposer des dates à utiliser, mais il faut laisser à l'utilisateur la possibliité de changer d'attribut ciblé (ex : date de la dépense ou date de déclaration ou d'approbation de la dépense)



## objets liés
Si l'objet principal est en lien avec le Collaborateur, ajoute un bouton en bas des Colonnes du rapport pour "ajouter des objets spéciaux".
Dans le fenêtre qui s'ouvre l'utilisateur commnence par choisir l'objet à travailler (tous les objetd sont proposés)
puis il doit choisir entre
- une instance en particulier : il indique alors l'attribut sur lequel trier et l'ordre (première/dernière) et les attributs qu'il veut ajouter au rapport
- le résultat d'une opération : il indique alors sur lequel appliquer l'opération et en choisissant l'opérateur selon le format de colonne (Nombre, Somme, Min, Max, Concat, ...)




## réduction des cardinalités
réintégrer "opération" et "valeur spéciale" suite à l'insertion par défaut de la liste détaillée ?



###########################################################
# P2
ajouter une notion de catégorie pour regrouper des attributs
ex : Axes analytiques pour les dépenses, qui regroupe Centre de coût, Clients, et Projets

###########################################################
# P3

# Affichage fusionner mais export dissocié
pour afficher un montant et une devise dans une même cellule à l'écran, mais en exportant bien dans deux cellules différentes pour pouvoir trier/filtrer.
idem avec le format de présnetation numérique avec séparateur de millier à l'écrna, mais pas en export.

###########################################################


TODO
Vérifier dans génération spec la présence des règles
=> Pour objet applicable 
    - requirementMode=period alors choix date début et date fin
    - sinon choix date jour uniquement
        -- possibilité date libre autre que rapport et conditionner date à autre attribut du rapport.

=> Pour un objet applicable avec requirementMode=period on ne laisse pas d'autre possibilité que le choix de "Date de valeur du rapport"

=> Si l'objet principal du rapport n'est pas lié à un collaborateur, alors il n'y a pas de "Contexte temporel du rapport"

