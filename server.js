const express = require('express');
const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const path = require('path');

const app = express();
const PORT = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'abuni-secret-key-2024',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 24 * 60 * 60 * 1000 }
}));

// ===== DATABASE SETUP =====
const db = new Database(path.join(__dirname, 'abuni.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    nom TEXT NOT NULL,
    role TEXT DEFAULT 'user',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS produits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    categorie TEXT DEFAULT 'Général',
    prix REAL DEFAULT 0,
    quantite INTEGER DEFAULT 0,
    seuil_alerte INTEGER DEFAULT 5,
    description TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT DEFAULT '',
    telephone TEXT DEFAULT '',
    adresse TEXT DEFAULT '',
    entreprise TEXT DEFAULT '',
    notes TEXT DEFAULT '',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    produit_id INTEGER NOT NULL,
    client_id INTEGER,
    quantite INTEGER NOT NULL,
    prix_unitaire REAL NOT NULL,
    montant_total REAL NOT NULL,
    note TEXT DEFAULT '',
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (produit_id) REFERENCES produits(id),
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );
`);

// Admin par défaut
const adminExists = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (username, password, nom, role) VALUES (?, ?, ?, ?)').run('admin', hash, 'Administrateur', 'admin');
}

// ===== AUTH MIDDLEWARE =====
function requireAuth(req, res, next) {
  if (req.session && req.session.userId) return next();
  res.status(401).json({ error: 'Non autorisé' });
}

// ===== AUTH ROUTES =====
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }
  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ id: user.id, username: user.username, nom: user.nom, role: user.role });
});

app.post('/api/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, username, nom, role FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Non autorisé' });
  res.json(user);
});

// ===== PRODUITS ROUTES =====
app.get('/api/produits', requireAuth, (req, res) => {
  const { search } = req.query;
  let produits;
  if (search) {
    produits = db.prepare('SELECT * FROM produits WHERE nom LIKE ? OR categorie LIKE ? ORDER BY updated_at DESC').all(`%${search}%`, `%${search}%`);
  } else {
    produits = db.prepare('SELECT * FROM produits ORDER BY updated_at DESC').all();
  }
  res.json(produits);
});

app.get('/api/produits/stats', requireAuth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM produits').get().c;
  const enStock = db.prepare('SELECT COUNT(*) as c FROM produits WHERE quantite > 0').get().c;
  const rupture = db.prepare('SELECT COUNT(*) as c FROM produits WHERE quantite = 0').get().c;
  const alertes = db.prepare('SELECT COUNT(*) as c FROM produits WHERE quantite <= seuil_alerte').get().c;
  const valeur = db.prepare('SELECT COALESCE(SUM(prix * quantite), 0) as v FROM produits').get().v;
  res.json({ total, enStock, rupture, alertes, valeurTotale: valeur });
});

app.get('/api/produits/alertes', requireAuth, (req, res) => {
  const alertes = db.prepare('SELECT * FROM produits WHERE quantite <= seuil_alerte ORDER BY quantite ASC').all();
  res.json(alertes);
});

app.post('/api/produits', requireAuth, (req, res) => {
  const { nom, categorie, prix, quantite, seuil_alerte, description } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom est requis' });
  const result = db.prepare('INSERT INTO produits (nom, categorie, prix, quantite, seuil_alerte, description) VALUES (?, ?, ?, ?, ?, ?)').run(nom, categorie || 'Général', prix || 0, quantite || 0, seuil_alerte || 5, description || '');
  const produit = db.prepare('SELECT * FROM produits WHERE id = ?').get(result.lastInsertRowid);
  res.json(produit);
});

app.put('/api/produits/:id', requireAuth, (req, res) => {
  const { nom, categorie, prix, quantite, seuil_alerte, description } = req.body;
  db.prepare('UPDATE produits SET nom=?, categorie=?, prix=?, quantite=?, seuil_alerte=?, description=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(nom, categorie, prix, quantite, seuil_alerte, description, req.params.id);
  const produit = db.prepare('SELECT * FROM produits WHERE id = ?').get(req.params.id);
  res.json(produit);
});

app.delete('/api/produits/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM produits WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== CLIENTS ROUTES =====
app.get('/api/clients', requireAuth, (req, res) => {
  const { search } = req.query;
  let clients;
  if (search) {
    clients = db.prepare('SELECT * FROM clients WHERE nom LIKE ? OR email LIKE ? OR telephone LIKE ? ORDER BY updated_at DESC').all(`%${search}%`, `%${search}%`, `%${search}%`);
  } else {
    clients = db.prepare('SELECT * FROM clients ORDER BY updated_at DESC').all();
  }
  res.json(clients);
});

app.get('/api/clients/stats', requireAuth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM clients').get().c;
  const actifs = db.prepare('SELECT COUNT(DISTINCT client_id) as c FROM transactions WHERE client_id IS NOT NULL').get().c;
  res.json({ total, actifs });
});

app.post('/api/clients', requireAuth, (req, res) => {
  const { nom, email, telephone, adresse, entreprise, notes } = req.body;
  if (!nom) return res.status(400).json({ error: 'Le nom est requis' });
  const result = db.prepare('INSERT INTO clients (nom, email, telephone, adresse, entreprise, notes) VALUES (?, ?, ?, ?, ?, ?)').run(nom, email || '', telephone || '', adresse || '', entreprise || '', notes || '');
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.json(client);
});

app.put('/api/clients/:id', requireAuth, (req, res) => {
  const { nom, email, telephone, adresse, entreprise, notes } = req.body;
  db.prepare('UPDATE clients SET nom=?, email=?, telephone=?, adresse=?, entreprise=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(nom, email, telephone, adresse, entreprise, notes, req.params.id);
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  res.json(client);
});

app.delete('/api/clients/:id', requireAuth, (req, res) => {
  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// ===== TRANSACTIONS ROUTES =====
app.get('/api/transactions', requireAuth, (req, res) => {
  const transactions = db.prepare(`
    SELECT t.*, p.nom as produit_nom, c.nom as client_nom
    FROM transactions t
    LEFT JOIN produits p ON t.produit_id = p.id
    LEFT JOIN clients c ON t.client_id = c.id
    ORDER BY t.date DESC
  `).all();
  res.json(transactions);
});

app.get('/api/transactions/stats', requireAuth, (req, res) => {
  const total = db.prepare('SELECT COUNT(*) as c FROM transactions').get().c;
  const entrees = db.prepare("SELECT COUNT(*) as c FROM transactions WHERE type='entree'").get().c;
  const sorties = db.prepare("SELECT COUNT(*) as c FROM transactions WHERE type='sortie'").get().c;
  const ca = db.prepare("SELECT COALESCE(SUM(montant_total), 0) as v FROM transactions WHERE type='sortie'").get().v;
  const caToday = db.prepare("SELECT COALESCE(SUM(montant_total), 0) as v FROM transactions WHERE type='sortie' AND date >= date('now')").get().v;
  res.json({ totalTransactions: total, totalEntrees: entrees, totalSorties: sorties, chiffreAffaires: ca, caAujourdhui: caToday });
});

app.get('/api/transactions/chart', requireAuth, (req, res) => {
  const data = [];
  for (let i = 6; i >= 0; i--) {
    const entrees = db.prepare("SELECT COALESCE(SUM(montant_total),0) as v FROM transactions WHERE type='entree' AND date >= date('now', ? || ' days') AND date < date('now', ? || ' days')").get(-i, -i + 1).v;
    const sorties = db.prepare("SELECT COALESCE(SUM(montant_total),0) as v FROM transactions WHERE type='sortie' AND date >= date('now', ? || ' days') AND date < date('now', ? || ' days')").get(-i, -i + 1).v;
    const d = new Date(); d.setDate(d.getDate() - i);
    data.push({ label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }), entrees, sorties });
  }
  res.json(data);
});

app.post('/api/transactions', requireAuth, (req, res) => {
  const { type, produit_id, client_id, quantite, note } = req.body;
  const produit = db.prepare('SELECT * FROM produits WHERE id = ?').get(produit_id);
  if (!produit) return res.status(400).json({ error: 'Produit non trouvé' });
  if (!quantite || quantite <= 0) return res.status(400).json({ error: 'Quantité invalide' });
  if (type === 'sortie' && produit.quantite < quantite) return res.status(400).json({ error: 'Stock insuffisant' });

  const montant = produit.prix * quantite;
  const newQte = type === 'sortie' ? produit.quantite - quantite : produit.quantite + quantite;
  db.prepare('UPDATE produits SET quantite = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(newQte, produit_id);

  const result = db.prepare('INSERT INTO transactions (type, produit_id, client_id, quantite, prix_unitaire, montant_total, note) VALUES (?, ?, ?, ?, ?, ?, ?)').run(type, produit_id, client_id || null, quantite, produit.prix, montant, note || '');
  const transaction = db.prepare(`SELECT t.*, p.nom as produit_nom, c.nom as client_nom FROM transactions t LEFT JOIN produits p ON t.produit_id = p.id LEFT JOIN clients c ON t.client_id = c.id WHERE t.id = ?`).get(result.lastInsertRowid);
  res.json(transaction);
});

// ===== DASHBOARD =====
app.get('/api/dashboard', requireAuth, (req, res) => {
  const prodStats = db.prepare('SELECT COUNT(*) as total, COALESCE(SUM(prix*quantite),0) as valeur FROM produits').get();
  const clientStats = db.prepare('SELECT COUNT(*) as total FROM clients').get();
  const transStats = db.prepare("SELECT COUNT(*) as total, COALESCE(SUM(CASE WHEN type='sortie' THEN montant_total ELSE 0 END),0) as ca FROM transactions").get();
  const alertes = db.prepare('SELECT * FROM produits WHERE quantite <= seuil_alerte ORDER BY quantite ASC LIMIT 5').all();
  const recentes = db.prepare(`SELECT t.*, p.nom as produit_nom, c.nom as client_nom FROM transactions t LEFT JOIN produits p ON t.produit_id=p.id LEFT JOIN clients c ON t.client_id=c.id ORDER BY t.date DESC LIMIT 8`).all();
  res.json({
    stats: { produits: prodStats.total, valeurStock: prodStats.valeur, clients: clientStats.total, chiffreAffaires: transStats.ca, transactions: transStats.total },
    alertes, recentes
  });
});

// SPA fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => console.log(`🚀 Abuni démarré sur http://localhost:${PORT}`));
