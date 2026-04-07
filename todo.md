



###########################################################
# P1

## valeur applicable
pouvoir insérer la valeur courante du contrat/poste à la date du rapport.

## réduction des cardinalités
réintégrer "opération" et "valeur spéciale" suite à l'insertion par défaut de la liste détaillée ?



###########################################################
# P2


###########################################################
# P3

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