- Les collaborateurs
-- Collaborateur (magicSel)
--- photo
--- titre
--- nom (magicSel)
--- prénom (magicSel)
--- genre
--- date de naissance
--- âge
-- Matricules et Login 1 <> 1 Collaborateur
--- userId
--- login
--- matricule de paie
-- Adresse de résidence 1 <> 1 Collaborateur
--- rue (magicSel)
--- complément
--- code postal (magicSel)
--- ville (magicSel)
--- pays
-- Informations contact 1 <> 1 Collaborateur
--- email personnel
--- téléphone personnel (magicSel)
-- Contact d'urgence 1 <> 1 Collaborateur
--- nom (magicSel)
--- relation
--- téléphone (magicSel)
-- Documents d'identité 1..n <> 1 Collaborateur
--- type de document
--- document (magicSel)
--- date émission
--- date expiration (magicSel)
-- Enfants à charge 0..n <> 1 Collaborateur
--- nom
--- prénom (magicSel)
--- genre
--- date de naissance (magicSel)
-- Taille goodies  1 <> 1 Collaborateur
--- taille en cm
--- taille tshirt (magicSel)
- Les contrats
-- Contrats [applicationDate] 1..n <> 1 Collaborateur (RécursiveMagicSel)
--- type de contrat (magicSel)
--- document
--- date signature
--- date début (magicSel)
--- date fin (magicSel)
--- motif début
--- motif fin
-- Postes [applicationDate]
  1..n <> 1 Contrat (RécursiveMagicSel)
  0..n <> 1 Collaborateur manager
  0..n <> 1 Département
  0..n <> 1 Etablissement
--- intitulé (magicSel)
--- document
--- date début (magicSel)
--- date fin (magicSel)
--- qualifications
--- csp
--- modalité de temps de travail
- Les absences
-- Absences validées
  0..n <> 1 Collaborateur de l'absence  (RécursiveMagicSel)
  0..n <> 1 Collaborateur approbation
--- type compte (magicSel)
--- date demande
--- date approbation
--- date début (magicSel)
--- date fin (magicSel)
--- durée réelle
--- durée ouvrée (magicSel)
-- Absences refusées
  0..n <> 1 Collaborateur de l'absence (RécursiveMagicSel)
  0..n <> 1 Collaborateur refus
--- type compte (magicSel)
--- date demande (magicSel)
--- date refus (magicSel)
--- motivation du refus (magicSel)
--- date début
--- date fin
--- durée réelle
--- durée ouvrée
-- Absences en attente de validation
  0..n <> 1 Collaborateur de l'absence (RécursiveMagicSel)
--- type compte (magicSel)
--- date demande (magicSel)
--- date début
--- date fin
--- durée réelle
--- durée ouvrée (magicSel)
-- Absences_mod_alt
  0..n <> 1 Collaborateur qui a posé l'absence
  0..n <> 1 Collaborateur qui bénéficie de l'absence (RécursiveMagicSel)
  0..n <> 1 Collaborateur qui a approuvé l'absence
  0..n <> 1 Collaborateur qui a refusé l'absence
--- type compte (magicSel)
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
- Les dépenses
-- Dépenses validées
  0..n <> 1 Collaborateur de la dépense (RécursiveMagicSel)
  0..n <> 1 Collaborateur approbation
--- date dépense (magicSel)
--- date approbation (magicSel)
--- nature de dépense (magicSel)
--- devise (magicSel)
--- montant HT
--- montant TTC (magicSel)
-- Dépenses refusées
  0..n <> 1 Collaborateur de la dépense (RécursiveMagicSel)
  0..n <> 1 Collaborateur refus
--- date dépense (magicSel)
--- date refus (magicSel)
--- motif de refus (magicSel)
--- nature de dépense (magicSel)
--- devise (magicSel)
--- montant HT
--- montant TTC (magicSel)
-- Dépenses _mod_alt
  0..n <> 1 Collaborateur de la dépense (RécursiveMagicSel)
  0..n <> 1 Collaborateur refus
  0..n <> 1 Collaborateur approbation
--- statut ["à traiter","refusé","approuvé"] (magicSel)
--- date dépense (magicSel)
--- date refus (magicSel)
--- motif de refus (magicSel)
--- date approbation (magicSel)
--- nature de dépense (magicSel)
--- devise (magicSel)
--- montant HT
--- montant TTC (magicSel)
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
  0..n <> 1 Département (RécursiveMagicSel)
  0..n <> 1 Etablissement (RécursiveMagicSel)
-- Postes à pourvoir
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