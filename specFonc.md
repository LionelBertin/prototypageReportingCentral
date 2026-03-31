# Spécification fonctionnelle - Constructeur de rapport

## 1. Objet du document
Ce document décrit les règles de gestion implémentées dans le constructeur de rapport.
Le périmètre couvre le choix de l'objet principal, la navigation dans la structure de données, les modes d'insertion, la configuration des colonnes, et les interactions de post-configuration (filtres, compartiments, colonnes dérivées).

## 2. Définitions
- Objet principal: objet de base du rapport, qui définit la granularité des lignes.
- Objet lié: objet accessible via relations depuis un autre objet.
- Liste détaillée: insertion de plusieurs lignes/valeurs de détail d'un objet.
- Ajouter des champs: insertion de champs d'un objet lié avec cardinalité fonctionnelle 1 par ligne du rapport.
- Agrégation: insertion d'une valeur agrégée calculée sur un objet.
- Valeur spéciale: insertion de première, dernière ou instance applicable.
- Chemin de navigation: historique de relations parcourues pour atteindre un objet.
- Provenance: libellé de relation utilisé pour distinguer deux champs venant du même objet mais de relations différentes.

## 3. Parcours global
### 3.1 Étape 1 - Choix de l'objet principal
L'utilisateur sélectionne d'abord un objet principal et son mode d'insertion initial:
1. Liste détaillée
2. Agrégation
3. Valeur spéciale

### 3.2 Étape 2 - Enrichissement du rapport
Une fois l'objet principal défini:
1. Le panneau de gauche permet d'ajouter des objets liés.
2. Le panneau de droite liste les attributs sélectionnés et leur configuration.

### 3.3 Étape 3 - Finalisation
L'utilisateur peut:
1. Réordonner les colonnes.
2. Appliquer filtres/compartiments/références de date.
3. Ajouter des colonnes conditionnelles/calculées.
4. Générer le rapport.

## 4. Règles de sélection de l'objet principal
### 4.1 Objets affichés dans le picker principal
1. Les objets strictement secondaires de cardinalité 1 <> 1 ... sont exclus du picker principal.
2. Le picker permet la recherche par domaine ou nom d'objet.
3. Sans recherche, l'utilisateur choisit d'abord un domaine puis un objet du domaine.

### 4.2 Mode initial obligatoire
Chaque objet du picker principal expose 3 actions:
1. Liste detaillee
2. Agregation
3. Valeur speciale

Le mode choisi détermine la première insertion et est affiché dans l'entête du rapport.

## 5. Règles d'affichage de la structure des données
1. Le panneau "Structure des données" affiche uniquement les objets et leurs relations.
2. Les attributs ne sont plus affichés dans l'arbre de structure.
3. Le bouton d'insertion magique (~) sur les lignes d'objet est supprimé.
4. La recherche filtre sur:
   - nom de domaine,
   - nom d'objet,
   - libellé de relation.

## 6. Règles de navigation relationnelle
### 6.1 Construction du graphe de relation
Le moteur calcule plusieurs graphes à partir des cardinalités:
1. Graphe orienté brut des relations.
2. Graphe "single" non orienté (seulement liens 1-1).
3. Graphe "descendant" (sens 1 -> n).
4. Graphe "fonctionnel" (au plus 1 cible par ligne depuis la source).

La cardinalité source/cible est inférée à partir de la cardinalité métier de l'objet, en tenant compte de l'index de relation dans la chaîne de cardinalités de l'objet.

### 6.2 Autorisation du bouton Liste détaillée
Liste détaillée est autorisée si au moins une condition est vraie:
1. Chemin descendant depuis l'objet principal vers l'objet cible.
2. Chemin intégralement 1-1 entre objet principal et objet cible.

Sinon, Liste détaillée n'est pas proposée.

### 6.3 Autorisation du bouton Ajouter des champs
Ajouter des champs est proposé si:
1. Liste détaillée n'est pas autorisée,
2. Mais un chemin fonctionnel existe entre objet principal et objet cible.

Effet:
- Le dialogue ouvert est le même que Liste détaillée (sélection d'attributs), mais l'intention métier est l'enrichissement d'une ligne existante.

### 6.4 Boutons toujours disponibles
Pour chaque objet navigable:
1. Agrégation est disponible.
2. Valeur spéciale est disponible.

## 7. Règles du dialogue "Insertion depuis l'objet"
## 7.1 Règles communes
1. Le dialogue est contextualisé par l'objet cible.
2. Le mode interne est imposé par le bouton cliqué (pas de sélecteur de mode dans le dialogue).
3. Les validations bloquent la confirmation si les prérequis ne sont pas respectés.

### 7.2 Mode détaillé (Liste détaillée / Ajouter des champs)
1. Au moins un attribut doit être sélectionné.
2. Pré-sélection par défaut: attributs marqués magicSel.
3. Actions de masse disponibles:
   - Sélection intelligente (magicSel),
   - Sélectionner tout,
   - Désélectionner tout.

### 7.3 Mode agrégation
1. Un attribut à agréger est obligatoire.
2. Types d'agrégations autorisés selon type d'attribut:
   - number: COUNT, CONCAT, SUM, MIN, MAX, AVG
   - date: COUNT, CONCAT, MIN, MAX
   - autres: COUNT, CONCAT
3. Si agrégation = CONCAT:
   - attribut de tri obligatoire,
   - sens de tri obligatoire (asc/desc).

### 7.4 Mode valeur spéciale
1. Si l'objet est multi-cardinal (cardinalité contenant n):
   - choix Première instance,
   - choix Dernière instance.
2. Si l'objet est applicable:
   - choix Instance applicable à une date.
3. Pour Première/Dernière:
   - attribut de tri obligatoire.
4. Pour Instance applicable:
   - date de référence obligatoire,
   - modes de référence:
     - date du jour,
     - date personnalisée,
     - attribut de date déjà présent dans le rapport.
5. Le mode applicable ne propose "attribut de date" que s'il existe au moins un attribut date déjà sélectionné.

## 8. Règles de création d'attributs sélectionnés
1. Chaque attribut ajouté reçoit un identifiant technique unique.
2. Le type d'insertion est persisté (normal, aggregation, first, last, applicable, conditional, calculated).
3. Si insertion applicable:
   - dateReference est stockée (today/custom/attribute).
4. Le chemin de navigation est conservé avec:
   - objectName,
   - cardinalityName,
   - relationLabel,
   - sourceObjectName.

## 9. Règles d'affichage de la liste "Attributs sélectionnés"
### 9.1 Présentation simplifiée
Chaque carte affiche:
1. Numéro d'ordre.
2. Une seule ligne de nom de colonne (plus de doublon "nom brut" + "thème > objet").

### 9.2 Règle de nom de colonne affiché
Priorité d'affichage:
1. Nom personnalisé saisi par l'utilisateur (columnName).
2. Pour colonne conditionnelle: nom de configuration.
3. Pour colonne calculée: nom de configuration.
4. Sinon, nom construit:
   - si relationLabel disponible dans navigationPath: attribut (relation1 > relation2 ...)
   - sinon fallback objet: attribut (objet1 > objet2 ...)
   - sinon fallback simple: attribut (objet courant)

Exemple de provenance:
- prénom (Collaborateur de l'absence)
- prénom (Collaborateur approbation)

### 9.3 Distinction des instances pour actions globales
Les actions comme l'application de filtres sont propagées à l'instance objet logique (même objet, même chemin, même provenance relationnelle, même mode d'insertion, mêmes paramètres de tri/agrégation).

### 9.4 Actions disponibles sur chaque carte
1. Éditer le nom de colonne.
2. Filtrer.
3. Compartimenter.
4. Éditer date de référence (si applicable).
5. Supprimer.
6. Afficher un badge de type selon mode d'insertion.

### 9.5 Réordonnancement
1. Drag and drop activé sur les cartes.
2. L'ordre final devient l'ordre de colonnes du rapport.

## 10. Règles de filtrage
### 10.1 Structure logique
1. Un filtre est composé de groupes.
2. À l'intérieur d'un groupe, les conditions sont liées par ET ou OU (configurable par groupe).
3. Entre groupes, la combinaison est toujours OU.

### 10.2 Opérateurs par type
1. number/date: equals, notEquals, greaterThan, lessThan, greaterOrEqual, lessOrEqual.
2. date: ajoute isEmpty/isNotEmpty.
3. string: equals, notEquals, contains, startsWith, endsWith.
4. boolean: equals/notEquals via valeur Vrai/Faux.

### 10.3 Valeurs de comparaison
1. Valeur fixe (texte, nombre, date).
2. Pour dates, possibilité de comparer à un autre attribut date déjà sélectionné (valueType=attribute).

### 10.4 Validité des filtres
À la confirmation:
1. Les conditions vides sont ignorées.
2. isEmpty/isNotEmpty sont valides sans valeur.
3. Si aucun groupe valide, le filtre est supprimé.
4. Action explicite "Retirer tous les filtres" disponible si filtres actifs.

### 10.5 Filtrage en contexte agrégation
Quand applicable, l'utilisateur peut choisir l'attribut de l'objet ciblé sur lequel porte la condition.

## 11. Règles de compartimentation
### 11.1 Structure
1. Une compartimentation est une liste ordonnée de compartiments nommés.
2. Chaque compartiment porte une ou plusieurs conditions (ET/OU interne).

### 11.2 Évaluation
1. Les compartiments sont évalués dans l'ordre de déclaration.
2. La première correspondance détermine la valeur de sortie.

### 11.3 Validité
À la confirmation:
1. Un compartiment sans nom est ignoré.
2. Un compartiment sans condition valide est ignoré.
3. Si aucun compartiment valide, la compartimentation est supprimée.
4. Action explicite "Retirer tous les compartiments" disponible si compartiments actifs.

### 11.4 Opérateurs et valeurs
Mêmes règles de types/opérateurs que les filtres, avec support date fixe ou attribut date sélectionné.

## 12. Règles des colonnes conditionnelles
1. Le nom de colonne est obligatoire.
2. La colonne retourne un booléen (Vrai/Faux).
3. Modèle logique:
   - groupes combinés par OU,
   - expressions dans un groupe combinées par ET ou OU.
4. Chaque expression valide requiert:
   - colonne gauche,
   - opérateur,
   - et selon l'opérateur:
     - isEmpty/isNotEmpty: pas de comparant,
     - sinon comparant obligatoire (colonne ou valeur).
5. En cas d'édition, la configuration existante est rechargée.

## 13. Règles des colonnes calculées
1. Le nom de colonne est obligatoire.
2. L'opérande gauche est obligatoire.
3. L'opérateur est contraint par le type de l'opérande gauche:
   - number: add, subtract, multiply, divide
   - date: date_diff
   - boolean/file: and, or, not
4. Pour tous les opérateurs sauf not, opérande droit obligatoire.
5. Les colonnes disponibles à droite sont limitées aux types compatibles.
6. Le type de résultat est dérivé du type/opérateur:
   - number/date -> nombre
   - boolean/file -> booléen
7. Aperçu de formule affiché avant confirmation.

## 14. Règles de date de référence (dialogue dédié)
Pour les objets applicables:
1. Type today: toujours valide.
2. Type custom: date obligatoire.
3. Type attribute: attribut date obligatoire.
4. Si aucun attribut date disponible, l'option attribute est désactivée.

## 15. Règles de réinitialisation
1. Changer le type de rapport:
   - confirmation utilisateur obligatoire,
   - vide toutes les colonnes,
   - remet le flux à l'étape de choix d'objet principal.
2. Tout réinitialiser:
   - confirmation utilisateur obligatoire,
   - vide la liste des attributs sélectionnés.

## 16. Génération
Le bouton Générer le rapport:
1. journalise l'état courant des attributs sélectionnés,
2. affiche un message de confirmation de sauvegarde.

## 17. Données de provenance et traçabilité
Le système maintient une traçabilité relationnelle complète pour chaque champ ajouté via navigation:
1. relationLabel (nom métier de la relation).
2. sourceObjectName (objet d'origine de la relation).
3. Ces informations sont utilisées pour:
   - nom de colonne explicite,
   - distinction d'instances métier équivalentes en objet cible mais différentes en relation.

## 18. Limites fonctionnelles connues (état actuel)
1. La structure des données ne montre plus les attributs dans l'arbre de gauche (choix assumé de simplification).
2. Agrégation et valeur spéciale restent proposées sur tous les objets navigables.
3. Les libellés du picker principal utilisent des variantes sans accents sur certains boutons (état UI actuel).

## 19. Critères d'acceptation synthétiques
1. Impossible de confondre deux champs issus du même objet mais de relations différentes.
2. Impossible d'insérer une liste détaillée hors règles de descendance/chemin 1-1.
3. Possibilité d'ajouter des champs d'un objet lié quand la cardinalité fonctionnelle est 1 par ligne.
4. Toute insertion détaillée/special exige au moins un attribut sélectionné.
5. CONCAT impose tri + sens de tri.
6. Objets applicables imposent une référence de date valide.
7. Les filtres et compartiments peuvent être retirés entièrement.
8. Le drag and drop modifie l'ordre effectif des colonnes.
