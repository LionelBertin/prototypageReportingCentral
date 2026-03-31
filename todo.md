

###########################################################
# P1

Dans la structure des données:
- On ne doit pas proposer l'agrégation sur les objets liés de cardinalité 1.
- On ne doit proposer l'insertion d'une valeure spéciale que pour les objets marqués avec "applicationDate" dans la structure des données





###########################################################
# P2

Lors d'une recherche des attributs dans la structure des données, il faut déplier et les objets liés dont un sous objet lié ou attributs correspondent à la recherche, et ne conserver que ces sous-objets conformes à la recherhce (masquer les autres qui ne correspondent pas et ne contiennent aucun sous objet qui corresponde).
Par exemple, depuis une absence validée, si on cherche "adresse", il faut déplier "Collaborateur de l'absence" et "Collaborateur approbation" pour révéler "Adresse de résidence"


###########################################################
# P3
j'ai encore des objets liés trop profonds qui sont proposés en passant par exemple via les postes à pourvoir, les doc partagés, les départements, les établissements...

###########################################################
