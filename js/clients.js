/**
 * Clients - Module de gestion des clients
 * CRUD complet pour les clients
 */
const Clients = {
  STORAGE_KEY: 'abuni_clients',

  /**
   * Récupère tous les clients
   * @returns {Array} Liste des clients
   */
  getAll() {
    return Store.get(this.STORAGE_KEY);
  },

  /**
   * Récupère un client par ID
   * @param {string} id - ID du client
   * @returns {Object|null} Client trouvé
   */
  getById(id) {
    return this.getAll().find(c => c.id === id) || null;
  },

  /**
   * Ajoute un nouveau client
   * @param {Object} client - Données du client
   * @returns {Object} Client créé avec ID
   */
  add(client) {
    const clients = this.getAll();
    const newClient = {
      id: Store.generateId(),
      nom: client.nom.trim(),
      email: client.email ? client.email.trim() : '',
      telephone: client.telephone ? client.telephone.trim() : '',
      adresse: client.adresse ? client.adresse.trim() : '',
      entreprise: client.entreprise ? client.entreprise.trim() : '',
      notes: client.notes ? client.notes.trim() : '',
      dateCreation: new Date().toISOString(),
      dateModification: new Date().toISOString()
    };
    clients.push(newClient);
    Store.set(this.STORAGE_KEY, clients);
    return newClient;
  },

  /**
   * Met à jour un client existant
   * @param {string} id - ID du client
   * @param {Object} updates - Champs à mettre à jour
   * @returns {Object|null} Client mis à jour
   */
  update(id, updates) {
    const clients = this.getAll();
    const index = clients.findIndex(c => c.id === id);
    if (index === -1) return null;

    clients[index] = {
      ...clients[index],
      ...updates,
      id: clients[index].id,
      dateCreation: clients[index].dateCreation,
      dateModification: new Date().toISOString()
    };
    Store.set(this.STORAGE_KEY, clients);
    return clients[index];
  },

  /**
   * Supprime un client
   * @param {string} id - ID du client
   * @returns {boolean} Succès de la suppression
   */
  delete(id) {
    const clients = this.getAll();
    const filtered = clients.filter(c => c.id !== id);
    if (filtered.length === clients.length) return false;
    Store.set(this.STORAGE_KEY, filtered);
    return true;
  },

  /**
   * Recherche de clients
   * @param {string} query - Terme de recherche
   * @returns {Array} Clients correspondants
   */
  search(query) {
    const q = query.toLowerCase().trim();
    if (!q) return this.getAll();
    return this.getAll().filter(c =>
      c.nom.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.telephone.includes(q) ||
      c.entreprise.toLowerCase().includes(q)
    );
  },

  /**
   * Statistiques clients
   * @returns {Object} Stats
   */
  getStats() {
    const clients = this.getAll();
    const transactions = Store.get('abuni_transactions');
    const clientsAvecAchats = new Set(transactions.map(t => t.clientId));
    return {
      total: clients.length,
      actifs: clientsAvecAchats.size,
      nouveauxCeMois: clients.filter(c => {
        const d = new Date(c.dateCreation);
        const now = new Date();
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }).length
    };
  }
};
