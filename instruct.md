# 📦 Application de Gestion de Stock et Clients

## 🎯 1. Mission du projet

Développer une application web permettant de :

* Gérer les produits (ajout, modification, suppression)
* Gérer les clients
* Suivre les entrées et sorties de stock
* Générer des rapports simples

---

## 🧰 2. Stack Technique

* HTML5
* CSS3
* JavaScript (Vanilla JS)
* LocalStorage (pour la persistance des données)
* Optionnel : Framework léger (ex: Bootstrap)

---

## 🏗️ 3. Architecture des fichiers

```
/project-root
│
├── index.html
├── /css
│   └── style.css
├── /js
│   ├── app.js
│   ├── store.js
│   ├── produits.js
│   ├── clients.js
│   ├── projets.js
│   └── rapport.js
├── /design
│   └── design.md
└── instruct.md
```

---

## 🔄 4. Ordre d'exécution

1. Chargement HTML
2. Chargement CSS
3. Chargement JavaScript :

   * store.js (gestion des données)
   * produits.js (logique produits)
   * clients.js (logique clients)
   * projets.js (logique projet/transactions)
   * rapport.js (génération rapports)
   * app.js (initialisation globale)

---

## 💾 5. store.js (Persistance LocalStorage)

Responsabilités :

* Sauvegarder les données
* Charger les données
* Supprimer les données

Structure exemple :

```js
const Store = {
  get(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
  },
  set(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  }
};
```

---

## ⚙️ 6. Spécifications Fonctionnelles

### 📦 Produits

* Ajouter un produit
* Modifier un produit
* Supprimer un produit
* Voir liste des produits
* Champs :

  * id
  * nom
  * prix
  * quantité

---

### 👤 Clients

* Ajouter un client
* Modifier un client
* Supprimer un client
* Champs :

  * id
  * nom
  * téléphone
  * adresse

---

### 🔁 Transactions (projets.js)

* Entrée de stock
* Sortie de stock
* Association client ↔ produit

---

### 📊 Rapport (rapport.js)

* Liste des ventes
* Stock actuel
* Historique des transactions

---

## 📌 7. Règles du Code

* Utiliser `const` et `let` (pas `var`)
* Fonctions courtes et claires
* Séparation logique (1 fichier = 1 responsabilité)
* Nom des variables explicite
* Commentaires obligatoires pour les fonctions importantes

---

## ⚠️ 8. Obligations

* Ne pas mélanger logique et interface
* Toujours passer par store.js pour les données
* Vérifier les entrées utilisateur
* Interface simple et claire

---

## 🚀 9. Évolutions possibles

* Authentification utilisateur
* Base de données (Firebase, MongoDB)
* Export PDF / Excel
* Dashboard avec graphiques
