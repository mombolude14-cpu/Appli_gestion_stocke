/**
 * Rapport - Module de génération de rapports
 * Génère des rapports et statistiques pour le tableau de bord
 */
const Rapport = {
  /**
   * Rapport global
   * @returns {Object} Données du rapport
   */
  generer() {
    return {
      produits: Produits.getStats(),
      clients: Clients.getStats(),
      transactions: Transactions.getStats(),
      alertes: Produits.getAlertes(),
      dernieresTransactions: Transactions.getRecentes(7).slice(0, 10),
      chartData: Transactions.getChartData()
    };
  },

  /**
   * Formater un nombre en devise FCFA
   * @param {number} montant - Montant à formater
   * @returns {string} Montant formaté
   */
  formatMontant(montant) {
    return new Intl.NumberFormat('fr-FR', {
      style: 'decimal',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(montant) + ' FCFA';
  },

  /**
   * Formater une date
   * @param {string} dateStr - Date ISO
   * @returns {string} Date formatée
   */
  formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },

  /**
   * Formater date courte
   * @param {string} dateStr - Date ISO
   * @returns {string} Date formatée courte
   */
  formatDateCourte(dateStr) {
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }
};
