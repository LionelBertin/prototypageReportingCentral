- Les collaborateurs
-- Collaborateur (magicSel)
--- photo
--- titre
--- nom (magicSel)
--- prénom (magicSel)
--- genre
--- date de naissance
--- âge
-- Matricules et Login
  1 <> 1 Collaborateur
--- userId
--- login
--- matricule de paie
-- Adresse de résidence
  1 <> 1 Collaborateur
--- rue (magicSel)
--- complément
--- code postal (magicSel)
--- ville (magicSel)
--- pays
-- Informations contact
  1 <> 1 Collaborateur
--- email personnel
--- téléphone personnel (magicSel)
-- Contact d'urgence
  1 <> 1 Collaborateur
--- nom (magicSel)
--- relation
--- téléphone (magicSel)
-- Documents d'identité
  1..n <> 1 Collaborateur
--- type de document
--- document (magicSel)
--- date émission
--- date expiration (magicSel)
-- Enfants à charge
  0..n <> 1 Collaborateur
--- nom
--- prénom (magicSel)
--- genre
--- date de naissance (magicSel)
-- Taille goodies 
  1 <> 1 Collaborateur
--- taille en cm
--- taille tshirt (magicSel)
- Les contrats
-- Contrats [applicationDate]
  1..n <> 1 Collaborateur (RécursiveMagicSel)
--- type de contrat (magicSel)
--- document
--- date signature
--- date début (magicSel)
--- date fin (magicSel)
--- motif début
--- motif fin
-- Postes [applicationDate]
  1..n <> 1 Contrat (RécursiveMagicSel)
  0..n <> 1 Collaborateur as "Manager"
  0..n <> 1 Département (RécursiveMagicSel)
  0..n <> 1 Etablissement (RécursiveMagicSel)
--- intitulé (magicSel)
--- document
--- date début (magicSel)
--- date fin (magicSel)
--- qualifications
--- csp
--- modalité de temps de travail
- Les absences
-- Absences
  0..n <> 1 Collaborateur as "Demandeur"
  0..n <> 1 Collaborateur as "Absent" (RécursiveMagicSel)
  0..n <> 1 Collaborateur as "Approbateur"
  0..n <> 1 Collaborateur as "Refuser" (magicSel)
--- statut ["à traiter","refusé","approuvé"] (magicSel)
--- date demande
--- date refus (magicSel)
--- motivation du refus (magicSel)
--- date approbation
--- date début (magicSel)
--- date fin (magicSel)
--- durée réelle
--- durée ouvrée (magicSel)
-- Solde de congés [applicationDate]
  0..n <> 1 Collaborateur (RécursiveMagicSel)
--- type compte (magicSel)
--- solde (magicSel)
smartObjects:{
    {
    title:"Absences approuvées futures",
    columns:["type compte","date début","date fin", "Collaborateur_Absence.nom", "Collaborateur_Absence.prénom", "Collaborateur_Approbation.nom", "Collaborateur_Approbation.prénom"],
    filters:{statut="approuvé" and "date début" > dateDuJour}
    },
    {
    title:"Absences passées",
    columns:["type compte","date début","date fin", "Collaborateur_Absence.nom", "Collaborateur_Absence.prénom", "Collaborateur_Approbation.nom", "Collaborateur_Approbation.prénom"],
    filters:{statut="approuvé" and "date début" <= dateDuJour}
    },
    {
    title:"Absences à traiter",
    columns:["date demande","type compte","durée ouvrée", "Collaborateur_Absence.nom", "Collaborateur_Absence.prénom", "Collaborateur_Absence.poste[applicable].manager.nom", "Collaborateur_Absence.poste[applicable].manager.prénom"],
    filters:{statut="à traiter"}
    }, 
    {
    title:"Absences refusées futures",
    columns:["date refus","motivation du refus", "durée ouvrée", "Collaborateur_Absence.nom", "Collaborateur_Absence.prénom", "Collaborateur_Refus.nom", "Collaborateur_Refus.prénom"],
    filters:{"statut"="refusé" and "date début" > dateDuJour}
    }
  }
- Les dépenses
-- Dépenses
  0..n <> 1 Collaborateur as "Collaborateur dépense" (RécursiveMagicSel)
  0..n <> 1 Collaborateur as "Refus dépense"
  0..n <> 1 Collaborateur as "Approbation dépense"
--- statut ["à traiter","refusé","approuvé"] (magicSel)
--- date dépense (magicSel)
--- date refus (magicSel)
--- motif de refus (magicSel)
--- date approbation (magicSel)
--- nature de dépense (magicSel)
--- devise (magicSel)
--- montant HT
--- montant TTC (magicSel)
smartObjects:{
    {
    title:"Dépenses approuvées",
    columns:["nature de dépense","date dépense", "Collaborateur dépense.nom", "Collaborateur dépense.prénom", "Approbation dépense.nom", "Approbation dépense.prénom"],
    filters:{statut="approuvé"}
    },
    {
    title:"Dépenses refusées",
    columns:["date refus","motif de refus","Collaborateur dépense.nom", "Collaborateur dépense.prénom", "Refus dépense.nom", "Refus dépense.prénom"],
    filters:{"statut"="refusé"}
    },
    {
    title:"Dépenses en attente de validation",
    columns:["date dépense","nature de dépense","Collaborateur dépense.nom", "Collaborateur dépense.prénom", "Collaborateur dépense.poste[applicable].manager.nom", "Collaborateur dépense.poste[applicable].manager.prénom"],
    filters:{statut="à traiter"}
    }
  }
- Les entretiens
-- Entretiens
  0..n <> 1 Collaborateur concerné (RécursiveMagicSel)
  0..n <> 1 Collaborateur manager
--- type d'entretien ["Entretien préalable","Entretien annuel","Entretien retour maternité"] (magicSel)
--- date de préparation collaborateur
--- date de préparation manager
--- date de validation collaborateur
--- date de validation manager (magicSel)
--- commentaire final (magicSel)
- Les formations
-- Formations refusées
  0..n <> 1 Collaborateur formé (RécursiveMagicSel)
  0..n <> 1 Collaborateur demande
  0..n <> 1 Collaborateur refus
--- date demande (magicSel)
--- date refus (magicSel)
-- Formations suivies
  0..n <> 1 Catalogue de formation (RécursiveMagicSel)
  0..n <> 1 Collaborateur formé (RécursiveMagicSel)
  0..n <> 1 Collaborateur demande
  0..n <> 1 Collaborateur approbation
--- date demande
--- date approbation
--- date de début (magicSel)
--- date de fin (magicSel)
--- date certification
--- date expiration
-- Catalogue de formation
--- nom (magicSel)
--- description
--- organisme
--- obligatoire (magicSel)
- Les objectifs
-- Objectifs
  0..n <> 1 Collaborateur concerné (RécursiveMagicSel)
  0..n <> 1 Collaborateur manager
--- description (magicSel)
--- date début (magicSel)
--- date fin (magicSel)
- Les rémunérations
-- Rémunération théorique fixe
  0..n <> 1 Collaborateur (RécursiveMagicSel)
--- date début (magicSel)
--- date fin (magicSel)
--- montant (magicSel)
--- périodicité (magicSel)
-- Rémunération théorique variable
  0..n <> 1 Collaborateur (RécursiveMagicSel)
--- date début (magicSel)
--- date fin (magicSel)
--- montant (magicSel)
--- périodicité (magicSel)
-- Rémunération réelle
  0..n <> 1 Collaborateur (RécursiveMagicSel)
--- type de rémunération (magicSel)
--- date début (magicSel)
--- date fin (magicSel)
--- montant (magicSel)
- Les documents partagés 
-- Documents partagés 
  0..n <> 1 Département (RécursiveMagicSel)
  0..n <> 1 Etablissement (RécursiveMagicSel)
--- date publication (magicSel)
--- document
--- nom du document (magicSel)
- Les enquête engagement
-- Enquête engagement
  0..n <> 1 Département (RécursiveMagicSel)
  0..n <> 1 Etablissement (RécursiveMagicSel)
--- date enquête (magicSel)
--- titre enquête (magicSel)
--- nombre interrogés
--- nombre répondants
--- score moyen (magicSel)
- Les factures
-- Factures
--- date facture (magicSel)
--- date réception
--- date règlement
--- statut (magicSel) ["à vérifier","rejetée","à régler","réglée"]
--- devise (magicSel)
--- montant HT
--- montant TTC (magicSel)
- Le Recrutement
-- Postes à pourvoir
  0..n <> 1 Département (RécursiveMagicSel)
  0..n <> 1 Etablissement (RécursiveMagicSel)
--- Intitulé (magicSel)
--- Date ouverture poste (magicSel)
--- Date fermeture poste
-- Candidats
  1 <> 1..n Candidatures
--- nom
--- prénom
-- Candidature
  0..n <> 1..n Postes à pourvoir (RécursiveMagicSel)
  1 <> 1..n Historique de Candidature
--- date candidature (magicSel)
--- statut candidature (magicSel)
-- Historique de Candidature
  0..n <> 1 Collaborateur recruteur
--- statut
--- commentaire
-- Entretiens
  0..n <> 1 Candidature
--- date entretien (magicSel)
--- type d'entretien (magicSel)
--- score (magicSel)
--- synthèse
- Référentiels
-- Département
--- Nom (magicSel)
--- Code
-- Etablissement
  0..n <> 1 Organisation
--- Nom (magicSel)
--- Code
-- Organisation
--- Nom (magicSel)
--- Code
--- Pays