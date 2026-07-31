# Grade Central

📘 Cahier des Charges — Système de Gestion de Bulletins CEG (Version Centralisée)

1. 🎯 Objectif

Créer une application (Web + Desktop + Mobile) permettant au responsable des examens (admin unique) de :

Gérer les années scolaires

Gérer les trimestres

Générer un modèle Excel des notes

Saisir manuellement les notes

Calculer automatiquement moyennes et rangs

Générer les bulletins

👉 Aucun accès enseignant / élève
👉 Système 100% centralisé

2. 👤 Acteur unique

🛠️ Admin (Responsable examen)

Seul utilisateur du système :

Crée les années scolaires

Définit les trimestres

Gère classes et élèves

Génère les fichiers Excel

Saisit les notes

Lance les calculs

Génère les bulletins

3. 📆 Gestion académique

3.1 Année scolaire

Exemple : 2025–2026

Statut : actif / archivé

3.2 Trimestre

Trimestre 1

Trimestre 2

Trimestre 3

Chaque trimestre est lié à :

une année scolaire

des notes spécifiques

4. 🏫 Gestion des classes

6ème

5ème

4ème

3ème

Chaque classe contient :

liste d’élèves

5. 👨‍🎓 Gestion des élèves

Informations :

Nom

Prénom

Sexe

Classe

Année scolaire

6. 📚 Gestion des matières

Mathématiques

Français

SVT

HG

etc.

Chaque matière a :

coefficient

7. 📄 Génération du modèle Excel

Objectif

Créer un fichier Excel que l’admin peut remplir facilement.

Contenu du fichier Excel

Colonnes :

ÉlèveMatièreDevoirComposition

👉 Ou version optimisée :

| Élève | Math Dev | Math Comp | Français Dev | Français Comp | ... |

Fonctionnement

Admin sélectionne :

Année

Trimestre

Classe

Le système génère automatiquement :

Liste élèves

Colonnes matières

Admin télécharge Excel

8. ✍️ Saisie des notes

Deux modes :

Mode 1 (principal)

L’admin remplit Excel

Puis importe le fichier dans le système

Mode 2 (optionnel)

Saisie directe dans tableau web (type Excel)

9. 🧠 Calcul automatique

9.1 Moyenne matière

Moyenne = (Devoir + Composition) / 2


9.2 Moyenne générale

Moyenne générale = Σ (note × coefficient) / Σ coefficients


9.3 Classement (rang)

Trier par moyenne générale

Attribuer :

1er, 2e, 3e...

9.4 Mention

MoyenneMention≥ 16Très Bien≥ 14Bien≥ 12Assez Bien≥ 10Passable< 10Insuffisant

10. 📑 Génération des bulletins

Format

PDF (principal)

Excel (optionnel)

Contenu

Infos élève

Tableau des notes

Moyennes

Rang

Mention

11. 🗄️ Base de données

years

id

nom (2025-2026)

actif

trimesters

id

nom

year_id

classes

id

nom

students

id

nom

prenom

classe_id

year_id

subjects

id

nom

coefficient

grades

id

student_id

subject_id

trimester_id

devoir

composition

12. ⚙️ Workflow complet

Créer année scolaire

Créer trimestres

Ajouter classes

Ajouter élèves

Générer Excel

Remplir notes

Importer Excel

Calcul automatique

Générer bulletins

13. 🖥️ Stack technique

Frontend

React + Tailwind

Desktop

Electron

Mobile

Expo (React Native)

Backend

FastAPI (recommandé)

Excel

Python : pandas + openpyxl

14. 💡 Points importants (réalité terrain Madagascar)

Fonctionne offline (très important)

Simple à utiliser (admin unique)

Pas compliqué (pas multi-user)

Export Excel obligatoire

Compatible PC faible

15. 🚀 Évolutions futures

Historique par année

Impression groupée

Statistiques classe

Export vers ministère

16. 📌 Conclusion

Ce système est :

✔ Simple mais puissant

✔ Adapté aux CEG

✔ Facile à déployer localement

✔ Très utile dans la réalité

👉 C’est un excellent projet professionnel + business local

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/90e9bec1-c1da-4012-87e1-bd370342a727).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
