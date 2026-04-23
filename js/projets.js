/**
 * Transactions - Module de gestion des entrées/sorties de stock
 * Gère les mouvements de stock et les associations client-produit
 */
const Transactions = {
  STORAGE_KEY: 'abuni_transactions',

  TYPES: {
    ENTREE: 'entree',
    SORTIE: 'sortie'
  },

  /**
   * Récupère toutes les transactions
   * @returns {Array} Liste des transactions
   */
  getAll() {
    return Store.get(this.STORAGE_KEY);
  },

  /**
   * Crée une nouvelle transaction (entrée ou sortie de stock)
   * @param {Object} transaction - Données de la transaction
   * @returns {Object|null} Transaction créée
   */
  create(transaction) {
    const produit = Produits.getById(transaction.produitId);
    if (!produit) return null;

    const quantite = parseInt(transaction.quantite);
    if (quantite <= 0) return null;

    // Pour une sortie, vérifier le stock disponible
    if (transaction.type === this.TYPES.SORTIE) {
      if (produit.quantite < quantite) return null;
      Produits.updateStock(transaction.produitId, -quantite);
    } else {
      Produits.updateStock(transaction.produitId, quantite);
    }

    const transactions = this.getAll();
    const newTransaction = {
      id: Store.generateId(),
      type: transaction.type,
      produitId: transaction.produitId,
      produitNom: produit.nom,
      clientId: transaction.clientId || null,
      clientNom: transaction.clientId ? (Clients.getById(transaction.clientId)?.nom || 'Inconnu') : null,
      quantite: quantite,
      prixUnitaire: produit.prix,
      montantTotal: produit.prix * quantite,
      note: transaction.note ? transaction.note.trim() : '',
      date: new Date().toISOString()
    };

    transactions.push(newTransaction);
    Store.set(this.STORAGE_KEY, transactions);
    return newTransaction;
  },

  /**
   * Supprime une transaction
   * @param {string} id - ID de la transaction
   * @returns {boolean} Succès
   */
  delete(id) {
    const transactions = this.getAll();
    const filtered = transactions.filter(t => t.id !== id);
    if (filtered.length === transactions.length) return false;
    Store.set(this.STORAGE_KEY, filtered);
    return true;
  },

  /**
   * Filtre les transactions par type
   * @param {string} type - 'entree' ou 'sortie'
   * @returns {Array} Transactions filtrées
   */
  getByType(type) {
    return this.getAll().filter(t => t.type === type);
  },

  /**
   * Transactions d'un client spécifique
   * @param {string} clientId - ID du client
   * @returns {Array} Transactions du client
   */
  getByClient(clientId) {
    return this.getAll().filter(t => t.clientId === clientId);
  },

  /**
   * Transactions d'un produit spécifique
   * @param {string} produitId - ID du produit
   * @returns {Array} Transactions du produit
   */
  getByProduit(produitId) {
    return this.getAll().filter(t => t.produitId === produitId);
  },

  /**
   * Transactions récentes (derniers N jours)
   * @param {number} jours - Nombre de jours
   * @returns {Array} Transactions récentes
   */
  getRecentes(jours = 30) {
    const limite = new Date();
    limite.setDate(limite.getDate() - jours);
    return this.getAll()
      .filter(t => new Date(t.date) >= limite)
      .sort((a, b) => new Date(b.date) - new Date(a.date));
  },

  /**
   * Statistiques des transactions
   * @returns {Object} Stats
   */
  getStats() {
    const transactions = this.getAll();
    const sorties = transactions.filter(t => t.type === this.TYPES.SORTIE);
    const entrees = transactions.filter(t => t.type === this.TYPES.ENTREE);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const ventesAujourdhui = sorties.filter(t => new Date(t.date) >= today);

    return {
      totalTransactions: transactions.length,
      totalEntrees: entrees.length,
      totalSorties: sorties.length,
      chiffreAffaires: sorties.reduce((sum, t) => sum + t.montantTotal, 0),
      ventesAujourdhui: ventesAujourdhui.length,
      caAujourdhui: ventesAujourdhui.reduce((sum, t) => sum + t.montantTotal, 0)
    };
  },

  /**
   * Données pour graphique des 7 derniers jours
   * @returns {Array} Données par jour
   */
  getChartData() {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      const dayTransactions = this.getAll().filter(t => {
        const d = new Date(t.date);
        return d >= date && d < nextDay;
      });

      const entrees = dayTransactions.filter(t => t.type === this.TYPES.ENTREE);
      const sorties = dayTransactions.filter(t => t.type === this.TYPES.SORTIE);

      data.push({
        label: date.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        entrees: entrees.reduce((s, t) => s + t.montantTotal, 0),
        sorties: sorties.reduce((s, t) => s + t.montantTotal, 0)
      });
    }
    return data;
  }
};
