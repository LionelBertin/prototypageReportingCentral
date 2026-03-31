# structuration des données
La structuration des données est Thématiques > Objets > Attributs
La liste des Thématiques, Objets et Attributs n'est pas exhaustive. J'ai indiqué les principaux, mais la liste finale pourrait être plus longue.

- Collaborateurs
-- Matricules et Login
--- userId
--- login
--- matricule de paie
-- Etat civil
--- photo
--- titre (*)
--- nom (*)
--- prénom (*)
--- genre
--- date de naissance
--- âge
-- Adresse de résidence
--- rue
--- complément
--- code postal
--- ville
--- pays
-- Informations contact
--- email personnel
--- téléphone personnel
-- Contact d'urgence
--- nom
--- relation
--- téléphone
-- Documents d'identité 1..n <> 1 Collaborateur
--- type de document
--- document
--- date émission
--- date expiration
-- Enfants à charge 0..n <> 1 Collaborateur
--- nom
--- prénom
--- genre
--- date de naissance
-- Taille goodies
--- taille en cm
--- taille tshirt
- Contrats
-- Contrats 1..n <> 1 Collaborateur
--- type de contrat (*)
--- document
--- date signature
--- date début (*)
--- date fin (*)
--- motif début
--- motif fin
-- Postes
  1..n <> 1 Contrat
  0..n <> 1 Collaborateur manager
--- intitulé (*)
--- document
--- date début (*)
--- date fin (*)
--- établissement (*)
--- département (*)
--- qualifications
--- csp
--- modalité de temps de travail
- Absences
-- Absences validées
  0..n <> 1 Collaborateur de l'absence
  0..n <> 1 Collaborateur approbation
--- type compte (*)
--- date demande
--- date approbation
--- date début (*)
--- date fin (*)
--- durée réelle
--- durée ouvrée (*)
-- Absences refusées
  0..n <> 1 Collaborateur de l'absence
  0..n <> 1 Collaborateur refus
--- type compte (*)
--- date demande (*)
--- date refus (*)
--- date début (*)
--- date fin (*)
--- durée réelle
--- durée ouvrée (*)
-- Absences en attente de validation
  0..n <> 1 Collaborateur de l'absence
--- type compte (*)
--- date demande (*)
--- date début
--- date fin
--- durée réelle
--- durée ouvrée (*)
- Dépenses
-- liste dépenses validées
  0..n <> 1 Collaborateur de la dépense
  0..n <> 1 Collaborateur approbation
--- date dépense (*)
--- date approbation (*)
--- nature de dépense (*)
--- devise (*)
--- montant HT
--- montant TTC (*)
-- liste dépenses refusées
  0..n <> 1 Collaborateur de la dépense
  0..n <> 1 Collaborateur refus
--- date dépense (*)
--- date refus (*)
--- nature de dépense (*)
--- devise (*)
--- montant HT
--- montant TTC (*)
- Entretiens
-- Entretiens
  0..n <> 1 Collaborateur concerné
  0..n <> 1 Collaborateur manager
--- date de préparation collaborateur
--- date de préparation manager
--- date de validation collaborateur
--- date de validation manager (*)
--- commentaire final (*)
- Formations
-- Formations refusées
  0..n <> 1 Collaborateur formé
  0..n <> 1 Collaborateur demande
  0..n <> 1 Collaborateur refus
--- date demande (*)
--- date refus (*)
-- Formations suivies
  0..n <> 1 Catalogue de formation
  0..n <> 1 Collaborateur formé
  0..n <> 1 Collaborateur demande
  0..n <> 1 Collaborateur approbation
--- date demande
--- date approbation
--- date de début (*)
--- date de fin (*)
--- date certification
--- date expiration
-- Catalogue de formation
--- nom (*)
--- description
--- organisme
--- obligatoire (*)
- Objectifs
-- Objectifs
  0..n <> 1 Collaborateur concerné
  0..n <> 1 Collaborateur manager
--- description (*)
--- date début (*)
--- date fin (*)
- Rémunérations
-- Rémunération théorique fixe 0..n <> 1 Collaborateur
--- date début (*)
--- date fin (*)
--- montant (*)
--- périodicité (*)
-- Rémunération théorique variable 0..n <> 1 Collaborateur
--- date début (*)
--- date fin (*)
--- montant (*)
--- périodicité (*)
-- Rémunération réelle 0..n <> 1 Collaborateur
--- type de rémunération (*)
--- date début (*)
--- date fin (*)
--- montant (*)
- Documents partagés 
-- Documents partagés 
--- date publication (*)
--- document
--- nom du document (*)
- Enquête engagement
-- Enquête engagement
--- date enquête (*)
--- titre enquête (*)
--- nombre interrogés
--- nombre répondants
--- score moyen (*)
- Facture 
-- Factures
--- date facture (*)
--- date réception
--- date règlement
--- devise (*)
--- montant HT
--- montant TTC (*)
- Recrutement
-- Postes à pourvoir
--- Intitulé (*)
--- Etablissement
--- Département (*)
--- Date ouverture poste (*)
--- Date fermeture poste
-- Candidats 0..n <> 1..n Postes à pourvoir
-- Entretiens 0..n <> 1 Candidat
--- date entretien (*)
--- type d'entretien (*)
--- score (*)
--- synthèse
- Objets applicables
-- Poste 0..1 <> 1 Collaborateur
--- intitulé
--- document
--- date début
--- date fin
--- établissement (*)
--- département (*)
--- qualifications
--- csp
--- modalité de temps de travail
--- manager
-- Solde de congés 0..n <> 1 Collaborateur
--- type compte (*)
--- solde (*)


# Sélection des attributs à afficher dans le rapport 

## Insertion normale
L'utilisateur sélectionne un à uņ les attributs ou les objets à intégrer au rapport.
L'utilisatuer peut déselectionner un attribut pour ne plus qu'il apparaisse dans le rapport
Chaque objets est dispose d'un bouton "sélection magique" qui sélectionne automatiquement tous les champs marqués (*).

## Insertion spéciale

L'utilisateur peut demander à insérer une valeur particulière de la collection
### première ou dernière instance (first/last)
Il indique alors sur quel attribut doit se faire le tri pour sélectionn la première ou la dernière de la liste.
Ex : le plus vieux enfant à charge = tri décroissant sur la date de naissance
Cela réduit la liste à une unique occurence, et l'utilisateur peut alors sélectionner les attributs qu'il souhaite afficher dans son rapport pour cette occurence.

### une agrégation
Il indique alors sur l'attribut et l'opération à appliquer (CONCAT, COUNT, SUM, MIN, MAX, AVG). L'utilisateur doit pouvoir insérer plusieurs agrégations différentes basées sur un même attribut ou des attributs différents. Les opérations proposées tiennent compte du type d'attribut (ex : SUM uniquement sur les valeurs numériques,...)
ex : 
  - CONCAT : liste des motifs de primes versées
  - COUNT : nombre de primes versées
  - SUM : somme des primes versées
  - MIN : prime la plus basse
  - MAX : prime le plus élevée
  - AVG : moyenne des primes versées



## Filtrage
Lorsqu'il insère un attribut (insertion normale ou spéciale), l'utilisateur a la possibilité de renseigner des filtres pour limiter les données remontées dans le rapport
ex : 
- Date de naissance à partir du 27/03/2000
- somme des primes versées >= 3000

# Règle pour la "réduction de la cardinalité" 
Pour les sous objets associés,  si la cardinalité est multiple seule la sélection spéciale est possible afin éviter le cartésiens. 
ex : Une fois des attributs de "Formations suivies" sélectionné, via "Collaborateur formé" on peut atteindre les "enfants à charge" mais l'utilisateur doit impérativement sélectionner une instance en particulier (first/last) ou indiquer la/les agrégations à effectuer (toujours dans l'objectif de réduire la cardinalité à 1 et ainsi éviter le produit cartésien).

# Objets applicables
Les "objets applicables" dans la structure sont des objets spéciaux, pour lesquels il est impératif de donner la date d'application pour l'afficher.
Lorsqu'il insère une instance d'objet applicable, l'utilisateur peut 
- laisser la date par défaut (date du jour)
- choisir la date de son choix
- indiquer un autre attribut de type "date" déjà sélectionné dans le rapport, qui sera utilisé comme référence

L'utilisateur peut insérer plusieurs instances d'un même objet et faire référence à des dates différentes.
Ex: Partant de la liste des "Formations suivies", il peut insérer plusieurs applicables :
- le département et l'établissement du poste d'un collaborateur formé basé sur la date de demande
- le département et l'établissement du poste d'un collaborateur formé basé sur la date de début de la formation
- le département et l'établissement du poste d'un collaborateur formé à la date du jour (qui sera donc identique pour toutes les lignes pour ce collaborateur)
- le solde de congés basé sur la date de début de la formation
- le solde de congés à la date du jour (qui sera donc identique pour toutes les lignes pour ce collaborateur

