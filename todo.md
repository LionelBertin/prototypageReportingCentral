
###########################################################
# P1




Pouvoir insérer 
- ✅le nom du manager au début de la formation.
- le dernier justificatif de transport
- le nombre d'enfant à charge
- la rémunération théorique au jour du solde de congés en ayant considéré que certaines natures de rem et certains compte de congés


Comment connaitre le nombre de formation obligatoire suivi dans un département l'année dernière ?

###########################################################
# P2


###########################################################
# P3
Lorsque l'option est activée le compartimentage doit être possible aussi sur les attributs des instances applicable insérées.
Utiliser le même nommage de présentation des attributs dans les listes d'attributs pour les  colonnes conditionnelles et colonnes calculées.
Déplace l'info "XX champs dans le rapport" juste avant le bouton "Générer le rapport".
Au lieu d'être dans le footer, intègre dans le bas de la colonne des "colonnes du rapport" les deux boutons pour ajouter des  colonnes conditionnelles et colonnes calculées lorsqu'ils sont affichés.

###########################################################

Améliorer la reprise du ciblage et filtrage sur la page de consultation/génération

***************** AJOUT DES PAGES PERIPHERIQUES *****************

Je voudrais intégrer tout ce qu'on a fait dans une application un peu plus vaste.
VOici les différentes pages de l'application avec pour chacunes quelques explications des données affichées et du fonctionnement attendu.
Tu peux rester très simple sur le contenu des nouvelles pages. On complètera progressivement plus tard. L'important c'est qu'on voit les éléments et qu'on puisse naviguer pour bien se rendre compte.

Avant d'évoquer les pages, voici quelques permissions (code et description) à rendre configurable dans une zone dédiée de la "conf proto" : 
- [CREATEREPORT]Créer des rapports
- [EDITREPORT]Editer des rapports
- [SHAREREPORT]Partager des rapports
- [AUTOREPORT]Générer automatiquement des rapports
- [SENDREPORT]Diffuser des rapports
Cest permissions seront utilisées pour conditionner certains comportements.


# HomeRapport
## explications
C'est une nouvelle page à créer. Celle sur laquelle on arrive par défaut au chargement de l'application.
## titre
Rapports Lucca
## contenu
Affiche plusieurs tableaux successifs affichant des listes de :
- mes rapports fraichements générés
- mes rapports favoris
- mes rapports enregistrés
- des rapports préconçus par les BU
- des rapports qu’on m’a partagé
- les rapports que j’ai exécuté par le passé


Les rapports ont tous uņ titre et un bouton "voir"
pour mes rapports, il y  a un bouton "supprimer"

## actions disponibles
cliquer sur "voir" pour un des rapports des tableaux => page:ConsultationRapport
bouton pour "Créer un nouveau rapport" =>  page:NouveauRapport (si permission [CREATEREPORT])

# NouveauRapport
## explications
C'est la page actuelle de sélection de l'objet principal

On ne change rien au comportement actuel

# ConfigurationRapport
## explications
C'est la page qui suit l'étape actuelle après la page:NouveauRapport

On ne change rien au comportement actuel

# ConsultationRapport
## explications
C'est la page qui suit l'étape actuelle après la page:ConfigurationRapport
On ne change rien au comportement actuel
## titre
utiliser le nom du rapport s'il exsite sinon "Rapport : <Objet principal>"

## actions disponibles
- Je peux aller à la page:ConfigurationRapport pour éditer le rapport que je consulte (si permission [EDITREPORT])
- Un bouton "partager" dans le footer me permet de sélectionner un ou plusiuers Collaborateur à qui partager le rapport (si permission [SHAREREPORT])
- Enregistrer le modèle si c'est un rapport qui m'appartient.
- Enregistrer ce rapport si permission [SENDREPORT]