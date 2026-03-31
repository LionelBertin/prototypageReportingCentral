
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
--- rue (*)
--- complément
--- code postal (*)
--- ville (*)
--- pays
-- Informations contact
--- email personnel
--- téléphone personnel (*)
-- Contact d'urgence
--- nom (*)
--- relation
--- téléphone (*)
-- Documents d'identité 1..n <> 1 Collaborateur
--- type de document
--- document (*)
--- date émission
--- date expiration (*)
-- Enfants à charge 0..n <> 1 Collaborateur
--- nom
--- prénom (*)
--- genre
--- date de naissance (*)
-- Taille goodies
--- taille en cm
--- taille tshirt (*)
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

Légende :
- Niveau 1 : Thématique
- Niveau 2 : Objet
- Niveau 3 : Attribut
- (*) pour matérialiser les attributs à insérer lors de la sélection magique
- <> permet d'indiquer une relation entre les objets. Les valeurs affichées de part et d'autres servent à renseigner la cardinalité. one-to-many, many-to-one, ...
