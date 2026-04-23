/**
 * Produits - Module de gestion des produits
 * CRUD complet pour les produits avec gestion du stock
 */
const Produits = {
  STORAGE_KEY: 'abuni_produits',

  /**
   * Récupère tous les produits
   * @returns {Array} Liste des produits
   */
  getAll() {
    return Store.get(this.STORAGE_KEY);
  },

  /**
   * Récupère un produit par ID
   * @param {string} id - ID du produit
   * @returns {Object|null} Produit trouvé
   */
  getById(id) {
    return this.getAll().find(p => p.id === id) || null;
  },

  /**
   * Ajoute un nouveau produit
   * @param {Object} produit - Données du produit
   * @returns {Object} Produit créé avec ID
   */
  add(produit) {
    const produits = this.getAll();
    const newProduit = {
      id: Store.generateId(),
      nom: produit.nom.trim(),
      categorie: produit.categorie ? produit.categorie.trim() : 'Général',
      prix: parseFloat(produit.prix) || 0,
      quantite: parseInt(produit.quantite) || 0,
      seuilAlerte: parseInt(produit.seuilAlerte) || 5,
      description: produit.description ? produit.description.trim() : '',
      dateCreation: new Date().toISOString(),
      dateModification: new Date().toISOString()
    };
    produits.push(newProduit);
    Store.set(this.STORAGE_KEY, produits);
    return newProduit;
  },

  /**
   * Met à jour un produit existant
   * @param {string} id - ID du produit
   * @param {Object} updates - Champs à mettre à jour
   * @returns {Object|null} Produit mis à jour
   */
  update(id, updates) {
    const produits = this.getAll();
    const index = produits.findIndex(p => p.id === id);
    if (index === -1) return null;

    produits[index] = {
      ...produits[index],
      ...updates,
      id: produits[index].id,
      dateCreation: produits[index].dateCreation,
      dateModification: new Date().toISOString()
    };
    Store.set(this.STORAGE_KEY, produits);
    return produits[index];
  },

  /**
   * Supprime un produit
   * @param {string} id - ID du produit
   * @returns {boolean} Succès de la suppression
   */
  delete(id) {
    const produits = this.getAll();
    const filtered = produits.filter(p => p.id !== id);
    if (filtered.length === produits.length) return false;
    Store.set(this.STORAGE_KEY, filtered);
    return true;
  },

  /**
   * Met à jour la quantité en stock
   * @param {string} id - ID du produit
   * @param {number} quantite - Quantité à ajouter (positif) ou retirer (négatif)
   * @returns {Object|null} Produit mis à jour
   */
  updateStock(id, quantite) {
    const produit = this.getById(id);
    if (!produit) return null;
    const newQte = produit.quantite + quantite;
    if (newQte < 0) return null;
    return this.update(id, { quantite: newQte });
  },

  /**
   * Recherche de produits par nom
   * @param {string} query - Terme de recherche
   * @returns {Array} Produits correspondants
   */
  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();
    return this.getAll().filter(p =>
      p.nom.toLowerCase().includes(q) ||
      p.categorie.toLowerCase().includes(q)
    );
  },

  /**
   * Produits en dessous du seuil d'alerte
   * @returns {Array} Produits en alerte
   */
  getAlertes() {
    return this.getAll().filter(p => p.quantite <= p.seuilAlerte);
  },

  /**
   * Valeur totale du stock
   * @returns {number} Valeur totale
   */
  getValeurTotale() {
    return this.getAll().reduce((total, p) => total + (p.prix * p.quantite), 0);
  },

  /**
   * Statistiques produits
   * @returns {Object} Stats
   */
  getStats() {
    const produits = this.getAll();
    return {
      total: produits.length,
      enStock: produits.filter(p => p.quantite > 0).length,
      rupture: produits.filter(p => p.quantite === 0).length,
      alertes: this.getAlertes().length,
      valeurTotale: this.getValeurTotale()
    };
  }
};
