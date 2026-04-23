/**
 * Store - Module de persistance LocalStorage
 * Gère toutes les opérations de données pour l'application Abuni
 */
const Store = {
  /**
   * Récupère les données depuis le LocalStorage
   * @param {string} key - Clé de stockage
   * @returns {Array} Données parsées ou tableau vide
   */
  get(key) {
    try {
      return JSON.parse(localStorage.getItem(key)) || [];
    } catch (e) {
      console.error(`Erreur lecture store [${key}]:`, e);
      return [];
    }
  },

  /**
   * Sauvegarde les données dans le LocalStorage
   * @param {string} key - Clé de stockage
   * @param {*} data - Données à sauvegarder
   */
  set(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
      console.error(`Erreur écriture store [${key}]:`, e);
    }
  },

  /**
   * Supprime une clé du LocalStorage
   * @param {string} key - Clé à supprimer
   */
  remove(key) {
    localStorage.removeItem(key);
  },

  /**
   * Génère un ID unique
   * @returns {string} UUID simplifié
   */
  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
  }
};
