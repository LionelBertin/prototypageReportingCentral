
###########################################################
# P1

pour les insertions des valeurs applicables à une date pour les contrats/postes des collaborateurs impliqués dans données des rapports, on va remplacer les boutons d'insertion rapide contrat/poste en bas de la zone "Colonnes du rapport" par des tuiles supplémentaires qu'on affiche dans la liste des "Données disponibles" juste après chacun des objets collaborateurs.
On les affiche avec la hiérarchie et dans l'ordre suivant :
- Postes 
-- Contrat
-- Département
-- Etablissement
--- Entreprise





###########################################################
# P2
## catégorie pour regrouper des attributs
ajouter une notion de catégorie pour regrouper des attributs
ex : Axes analytiques pour les dépenses, qui regroupe Centre de coût, Clients, et Projets

## Filtrage intélligent
"Mes managés" => postes où j'apparais comme manager
Ajouter une filtre sur les managers dans le Contexte collaborateur (avant filtrage)




###########################################################
# P3

###########################################################
# QUESTIONS EN SUSPENS
## réduction des cardinalités 
Faut-il réintégrer "opération" et "valeur spéciale" suite à l'insertion par défaut de la liste détaillée ?


###########################################################

***************** AJOUT DES PAGES PERIPHERIQUES ***************** 

Ajouter une page qui fait office de page d'accueil du module de rapport.
Elle liste dans plusieurs zones :
- mes rapports fraichements générés
- mes rapports favoris
- mes rapports enregistrés
- des rapports préconçus par les BU
- des rapports qu’on m’a partagé
- les rapports que j’ai exécuté par le passé
un bouton "configurer nouveau rapport" est disponible

Si je clique sur une des entrées des zones de rapports listés, j'arrive directement en consultation du rapport.
Si je clique sur "configurer nouveau rapport" j'arrive sur la page de sélection de l'objet principal du rapport puis ça déroule sur la configuration et génération/consultation du rapport. 

Depuis la page de consultation du rapport, je peux revenir à la configuration du rapport


Permissions à faire apparaitre en mode débug dans la "conf proto" pour conditionner les comportements : 
- Créer des rapports
- Editer des rapports
- Partager des rapports
- Générer automatiquement des rapports
- Diffuser des rapports
