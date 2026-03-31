

################################################################################################
# P1
Dans la structure des données, dans les objets liées, l'affichage ne doit pas être cyclique.
Par exemple, quand on démarre depuis les "absences validées", on a le "Collaborateur approbation", qui est lié à son "contact d'urgence". L'affichage devrait s'arrêter là, mais on continue avec un "Collaborateur", puis son "Contact d'urgence" et tous les autres objets..


On ne doit pas proposer l'agrégation sur les objets liés de cardinalité 1.

On ne doit proposer l'insertion d'une valeure spéciale que pour les objets marqués avec "applicationDate" dans la structure des données





################################################################################################
# P2
Lors d'une recherche des attributs dans la structure des données, il faut déplier et les objets liés dont un sous objet lié ou attributs correspondent à la recherche, et ne conserver que ces sous-objets conformes à la recherhce (masquer les autres qui ne correspondent pas et ne contiennent aucun sous objet qui corresponde).
Par exemple, depuis une absence validée, si on cherche "adresse", il faut déplier "Collaborateur de l'absence" et "Collaborateur approbation" pour révéler "Adresse de résidence"


################################################################################################
# P3
Supprime le tag "Liste détaillée"

C'est bien de pouvoir ordonner les attributs au sein d'un objet. En revanche pour l'ordonnancement des objets entre eux, je voudrais que le curseur "main" soit visible au clic sur la tuile de l'objet lui même


################################################################################################
